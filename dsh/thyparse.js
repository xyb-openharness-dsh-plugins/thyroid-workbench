/* markdown → 候选（THY 指标字典）。18 号 v2 六部件之三。
 *
 * 四条不可让步（家族契约，别为了"智能"放宽）：
 * 1. **只抄写不推测**：报告里没有的指标不生成候选；数值只做"字符串 → 数字"的搬运，
 *    单位换算、参考范围判定、缺失补齐全部不做——THY 红线：Tg 升高≠复发（T4），本层不判读；
 * 2. **先转竖线表再对齐**（18 号 §8.1，最坑的一条）：MinerU 的 `full.md` 表格是
 *    `<table><tr><td>` HTML。若先剥标签，整表被压成一行连续文本，"指标名后取第一个数"
 *    会静默串位（8 个指标写成同一个数）。顺序必须是 ① htmlTablesToPipes() ② 按位置对齐。
 * 3. **单位先剥 LaTeX 外壳**（18 号 §7.1）：真实 full.md 的单位是 `$10^9/L$`、`10^{9}/L`，
 *    不是纯文本。先剥 `$`、`\(…\)`、`\[…\]`、`\mu`、`\text{}`/`\mathrm{}` 外壳与花括号，
 *    再做单位归一；认不出的只剥壳、不推断。
 * 4. **按位置对齐**：第 i 个指标名配第 i 个数值/单位；数量不符**整行放弃**，不做模糊匹配。
 *    `<0.5` 这类不等式保留原文、value_num 留空；`3.5–9.5` 两数一格的参考范围整格放弃。
 */

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** HTML 实体解码：MinerU 的表格单元格里 `<0.5` 会以 `&lt;0.5` 出现，不解码就当成"文字"丢掉。 */
function decodeEntities(text) {
  return String(text)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

/**
 * markdown 里的 HTML 表格转成 `| a | b |` 竖线表（18 号 §8.1 的四个实现细节缺一不可）：
 * - colspan="2" 要补空单元格（少一列则后续全错位且不报错）；
 * - 属性正则写 ["']?（写成 "?' 会让 colspan 完全匹配不上）；
 * - 单元格内的 | 换成 /（管道符会把一行撑成多列，分隔行数量对不上）；
 * - 首行当表头、第二行插 | --- | 分隔行（下游按"第二行是分隔行"跳过表头）。
 */
export function htmlTablesToPipes(md) {
  if (!/<table/i.test(md)) return md;
  return md.replace(/<table[\s\S]*?<\/table>/gi, (block) => {
    const out = [];
    for (const row of block.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
      const cells = [];
      for (const m of row.matchAll(/<t([dh])([^>]*)>([\s\S]*?)<\/t\1>/gi)) {
        const attrs = m[2] || '';
        const text = decodeEntities(m[3].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
        cells.push(text);
        /* colspan 补空位：列数对齐比内容完整更重要（缺列是静默错读的根源）。 */
        const span = Number((attrs.match(/colspan\s*=\s*["']?(\d+)["']?/i) || [])[1] || 1);
        for (let k = 1; k < span; k += 1) cells.push('');
      }
      if (cells.length) out.push(`| ${cells.map((c) => c.replace(/\|/g, '/')).join(' | ')} |`);
    }
    if (out.length) out.splice(1, 0, `| ${out[0].split('|').filter((x) => x.trim()).map(() => '---').join(' | ')} |`);
    return out.join('\n');
  });
}

/** 剥 LaTeX 外壳（只剥壳，不推断内容）。 */
export function stripLatex(text) {
  return String(text ?? '')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
    .replace(/\\(?:text|mathrm|mbox)\{([^{}]*)\}/g, '$1')
    .replace(/\\mu\s*/g, 'μ')
    .replace(/[{}]/g, '');
}

/** 一行竖线表 → 单元格数组。 */
function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}
const isTableLine = (line) => line.trim().startsWith('|') && line.trim().endsWith('|');
const isSeparator = (line) => /^\|[\s:|-]+\|$/.test(line.trim());

/** THY 指标字典：name/alias → 前端指标 code（CATALOG 同名）。别名词边界匹配（"TSH" 不会命中别的词）。
 *  `not`：排除正则——中文没有 \b，"甲状腺球蛋白" 是 "抗甲状腺球蛋白抗体" 的子串，
 *  词边界拦不住 TgAb 误命中 TG（真实事故：TgAb 的 9 被写成 Tg=9）；凡命中 not 的行不算这条。 */
export const LAB_DICT = [
  { key: 'TGAB', name: 'TgAb（抗 Tg 抗体）', aliases: ['TGAB', 'TgAb', '抗甲状腺球蛋白抗体', '抗Tg抗体'], unit: 'IU/mL' },
  { key: 'TG', name: 'Tg（甲状腺球蛋白）', aliases: ['TG', '甲状腺球蛋白', '甲状腺球蛋白TG'], not: /抗体|TGAB|TgAb/i, unit: 'ng/mL' },
  { key: 'TSH', name: 'TSH（促甲状腺激素）', aliases: ['TSH', '促甲状腺激素', '促甲状腺素'], unit: 'mIU/L' },
  { key: 'FT4', name: 'FT4（游离甲状腺素）', aliases: ['FT4', '游离甲状腺素', '游离T4'], unit: 'pmol/L' },
  { key: 'FT3', name: 'FT3（游离三碘甲状腺原氨酸）', aliases: ['FT3', '游离三碘甲状腺原氨酸', '游离T3'], unit: 'pmol/L' },
  { key: 'CA', name: '血钙', aliases: ['血钙', '钙', 'CA', '总钙'], unit: 'mmol/L' },
  { key: 'PTH', name: 'PTH（甲状旁腺激素）', aliases: ['PTH', '甲状旁腺激素', '甲状旁腺素'], unit: 'pg/mL' },
  { key: 'WEIGHT', name: '体重', aliases: ['体重', 'WT'], unit: 'kg' },
];

/** 词边界匹配：中文别名用前后断言（\b 对中文无效）。 */
function aliasHit(text, alias) {
  const re = new RegExp(`(?<![A-Za-z0-9-])${escapeRe(alias)}(?![A-Za-z0-9-])`, 'i');
  return re.test(text);
}

const NUM_RE = /^(?:[<>≤≥]\s*)?-?\d+(?:\.\d+)?$/;
/** 取一个单元格里的"可抄写值"：纯数字 / <0.5 这类带比较符的原文。参考范围、两数一格一律不要。 */
function valueOf(cell) {
  const t = stripLatex(String(cell)).replace(/\s/g, '');
  if (!t) return null;
  if (/^[<>≤≥]/.test(t)) {
    const m = t.match(/^([<>≤≥])(-?\d+(?:\.\d+)?)$/);
    return m ? { raw: `${m[1]}${m[2]}`, num: null } : null;
  }
  if (!NUM_RE.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? { raw: t, num: n } : null;
}

const UNIT_RE = /^(10\^?9\/L|×10\^?9\/L|10⁹\/L|×10⁹\/L|10\^?6\/L|×10\^?6\/L|10⁶\/L|g\/L|mg\/L|mmol\/L|μmol\/L|umol\/L|U\/mL|U\/L|mIU\/mL|mIU\/L|IU\/mL|IU\/L|ng\/mL|ng\/dL|ng\/L|pg\/mL|pmol\/L|kg|%|fL|pg)$/i;

/** 单位归一：剥 LaTeX 外壳后再认；认不出返回原样（调用方标"缺单位"，不猜）。 */
export function normalizeUnit(cell) {
  const t = stripLatex(String(cell ?? '')).replace(/\s/g, '');
  return t;
}

/**
 * 从 markdown 抽候选。
 * @returns {{candidates: Array, skipped: Array}} candidates 每项 {name, key, value, num, unit, line}
 */
export function extractLabCandidates(markdown) {
  const md = htmlTablesToPipes(String(markdown ?? ''));
  const candidates = [];
  const skipped = [];
  const seen = new Set();

  const lines = md.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    if (!isTableLine(lines[i])) { i += 1; continue; }

    /* 一整块连续表格：第一行是表头，分隔行（|---|---|）丢掉，其余是数据行。
       不要"看到分隔行就 continue"——那会把表头一起跳过，整张表被静默丢弃。 */
    const start = i;
    while (i < lines.length && isTableLine(lines[i])) i += 1;
    const blockLines = lines.slice(start, i).filter((l) => !isSeparator(l));
    if (blockLines.length < 2) continue;

    const header = cells(blockLines[0]);
    /* 两种表头认法：竖表（指标名 | 结果 | 单位）或横表（第一列是表头、指标名竖排）。
       先按竖表找列；找不到列时，若是"项目名在第一列、数值在第二列"的简单两列表也接受。 */
    let idxName = header.findIndex((h) => /项目|指标|名称|检验|item|test/i.test(h));
    let idxVal = header.findIndex((h) => /结果|数值|value|result/i.test(h));
    let idxUnit = header.findIndex((h) => /单位|unit/i.test(h));
    if (idxName === -1 && idxVal === -1 && header.length >= 2) { idxName = 0; idxVal = 1; }
    if (idxName === -1 || idxVal === -1) continue;

    for (const line of blockLines.slice(1)) {
      const row = cells(line);
      const name = stripLatex(row[idxName] ?? '');
      const hit = LAB_DICT.find((d) => !(d.not && d.not.test(name)) && d.aliases.some((a) => aliasHit(name, a)));
      if (!hit) continue;
      const val = valueOf(row[idxVal] ?? '');
      if (!val) { skipped.push({ name, cell: row[idxVal] ?? '', reason: '不是单一数值（参考范围/文字）' }); continue; }
      const unitCell = idxUnit >= 0 ? normalizeUnit(row[idxUnit]) : '';
      if (unitCell && !UNIT_RE.test(unitCell)) { skipped.push({ name, cell: unitCell, reason: '单位不认识' }); continue; }
      const dedupe = `${hit.key}:${val.raw}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      candidates.push({
        key: hit.key,
        name: hit.name,
        value: val.num === null ? val.raw : val.num,
        unit: unitCell || hit.unit,
        line: start + 1,
      });
    }
  }
  return { candidates, skipped };
}

/** 报告日期：文件名或正文里的 YYYY-MM-DD / YYYY年M月D日。取不到就是 null（不猜今天）。 */
export function guessReportDate(text, fallback = null) {
  const m = String(text ?? '').match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (!m) return fallback;
  const [_, y, mo, d] = m;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
