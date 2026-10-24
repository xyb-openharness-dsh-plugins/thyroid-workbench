#!/usr/bin/env node
/**
 * 医疗与法律表述越界检查（A18 + THY T1–T7 红线）。
 *
 * 产品只提供信息，不做诊断、不给处置建议。THY 专属高发区（DEV-REQUIREMENTS T1–T7）：
 * T2 零调药建议（剂量时间线 + 医生目标原文并列，不写"建议调整/加量/减量"）；
 * T4 不判复发（Tg 升高≠复发）；T6 长程终生随访不做"可以不查/少查"暗示。
 * 这条红线放进 `npm run check`：命中即失败，不靠人记。
 *
 * 扫描范围：会被用户读到的实现代码——`dsh/`、`lib/`、`public/`、`src/`、`demo/`、
 * `prototypes/` 下的 .js/.mjs/.cjs/.html/.css。**不扫** docs/：那是讨论稿，另有评审。
 *
 * 两种放行方式：
 * 1. 否定语境：命中词前 12 个字符内出现「不 / 勿 / 禁止 / 别 / 零」，判为免责表述，放行；
 * 2. 显式标注：该行含 `wording-allow` 注释，放行（需在注释里写清为什么）。
 *
 * 用法：node scripts/check-wording.mjs
 * 退出码：0 无命中或没有可扫文件；1 有命中。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIRS = ['dsh', 'lib', 'public', 'src', 'demo', 'prototypes']
const EXTS = new Set(['.js', '.mjs', '.cjs', '.html', '.css'])

/** 越界表述：不是"提到疾病/材料"，而是"替医生下结论 / 给处置 / 暗示少查"。 */
const RULES = [
  { id: 'treatment-advice', re: /建议\s*(进行|做|用|接受|采用|考虑)?\s*(治疗|手术|化疗|放疗|用药|服药|停药|加药|减药|靶向|碘131|碘-131)/g },
  { id: 'recommend-drug', re: /推荐\s*(进行|使用|服用|用)?\s*(用药|服药|治疗|手术|剂量|药物|方案)/g },
  { id: 'stop-medication', re: /(可以|可|建议|不妨)\s*停\s*(药|用|服)/g },
  { id: 'skip-care', re: /(不用|无需|不必|没必要)\s*(就医|复查|去医院|看医生)/g },
  { id: 'recurrence-claim', re: /(可能|大概率|一定|肯定|不会)\s*(复发|进展)/g },
  { id: 'prognosis-claim', re: /预后\s*(良好|较好|不错|较差|很差)/g },
  { id: 'cure-rate', re: /治愈率|生存期\s*(还有|不足|大概)|生存率/g },
  { id: 'diagnose-claim', re: /(确诊|诊断)\s*为\s*(癌|肿瘤|恶性)/g },
  /* THY T2：零调药建议词族（剂量时间线只留痕，建议调整/加量/减量是医生的事）。 */
  { id: 'dose-advice', re: /(建议|应该|应当|不妨|可以考虑?|需要)\s*(调整?|加大?|减少?|增加?|提高|降低|恢复|维持)\s*(剂量|药量|用量|优甲乐|左甲状腺素)/g },
  { id: 'dose-advice-2', re: /(剂量|药量)\s*(该|要|应|需要)?\s*(调|加|减|增)(一?点|一下|到)/g },
  { id: 'dose-advice-3', re: /(可以|应当|应该|建议)\s*(把|将)?\s*(优甲乐|左甲状腺素)\s*(调|加|减|增|换)/g },
  /* THY T6：长程终生随访不做"可以不查 / 少查"暗示（年度节奏语境 + 轻提醒）。 */
  { id: 'skip-followup', re: /(可以|无需|不必|没必要|不用)\s*(不查|少查|不复查|停查|暂停复查|暂停随访|不随访|省去)/g },
  { id: 'skip-followup-2', re: /(随访|复查|抽血|超声)\s*(间隔)?\s*(可以|能)\s*(拉长|延长|放宽)/g },
  /* THY T5：TI-RADS / 超声零判读（产品不自评分类、不下良性恶性结论）。 */
  { id: 'tirads-judgement', re: /(判读|判定|评估)\s*(TI-RADS|颈部超声|超声分类)/g },
  { id: 'tirads-judgement-2', re: /TI-RADS\s*[0-9]\s*类\s*(是|属于|意味着)\s*(良性|恶性)/g },
]

const NEGATION = /[不勿禁别零]$|不构成|不代表|不做|不提供|不作为|不含|不给|不暗示|不出现|不做任何/

function walk(dir) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...walk(full))
    else if (st.isFile() && EXTS.has(extname(entry))) out.push(full)
  }
  return out
}

const files = DIRS.flatMap((d) => walk(join(root, d)))
const hits = []

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    if (line.includes('wording-allow')) return
    for (const rule of RULES) {
      rule.re.lastIndex = 0
      let m
      while ((m = rule.re.exec(line)) !== null) {
        const before = line.slice(Math.max(0, m.index - 12), m.index)
        if (NEGATION.test(before)) continue
        hits.push({
          file: relative(root, file),
          line: i + 1,
          rule: rule.id,
          text: m[0].trim(),
        })
      }
    }
  })
}

if (!files.length) {
  console.log('= 没有可扫描的实现文件（dsh/ lib/ public/ src/ 为空或不存在），本次跳过')
  process.exit(0)
}

if (hits.length) {
  console.error(`✗ 医疗/法律表述越界 ${hits.length} 处（产品只提供信息，不做诊断与处置/法律建议）：\n`)
  for (const h of hits) console.error(`  ${h.file}:${h.line}  [${h.rule}]  「${h.text}」`)
  console.error('\n改法：改成"记录/整理/带去看医生/问材料窗口"的表述；确属免责语句请写在否定语境里。')
  console.error('依据：docs/SPEC.md §2 产品立场、A18、DEV-REQUIREMENTS M3（零法律建议）。')
  process.exit(1)
}

console.log(`✓ 医疗与法律表述检查通过（${files.length} 个实现文件，0 处越界）`)
