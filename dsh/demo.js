/* 演示数据播种（THY · 甲状腺癌）。
 *
 * 唯一数据源是 `demo/build-demo-data.mjs` 的 `finalize()`（三个产物
 * prototypes/v0.2/demo-data.js、public/demo-data.js、demo/demo-data.sqlite 都从它生成）。
 * 这里只是把同一份纯数据写进**用户资料目录里那个库**，不新增、不改写任何数值——
 * 演示数据一旦在这里多出一条，原型与开发版就会各说一套
 * （这是 `test/store.test.mjs` 里 deepStrictEqual parity 断言存在的原因）。
 *
 * 幂等：库里已经有 profile 就整批跳过（开发版启动时可能跑很多次，不能每次都复制一份档案）。
 * 事务：整批在一个事务里，中途失败整体回滚，不留"半个档案"。
 *
 * 与 MPM seedDemo 的结构差异（别照抄）：
 * - THY 的 schema/0001 冻结 30 表 + 0002 增量（6 新表 + 补列）；本文件全部走显式列名 INSERT；
 * - 档案级标量（diagnosis/stageLine/caregiverLabel/age/病理与分层附注）在 profile_meta（0002）；
 * - 全局演示元信息（meta.dataStart/today/disclaimer/…）在 demo_meta（0002）；
 * - 分类指标（RISK/TIRADS）存 metric_point（is_numeric=0，value_num=code + value_text=label）
 *   ——THY 的 0001 指标三表自带 is_numeric，无需 MPM 那样的独立 mmrc_grade 表；
 * - 报告原文摘录统一 report_excerpt（0002），kind_text 分流：reports[] / 喉镜检查 / Rx-WBS / 骨与心血管监测；
 * - 症状与打卡类（呛咳/低钙/颈肩/疤痕/低碘/治疗反应/症状日记）统一 symptom_log，symptom 列做键；
 * - 候选（candidates）按 18 号 v2 语义挂在 parse_job 下：每档案建一条合成导入文档
 *   （ext_id='demo-import'，读模型排除它不进资料库列表）+ succeeded 的 parse_job + candidate 行。
 *
 * 两个字段口径（H6 的教训，别图省事）：
 * 1. 所有 INSERT 写显式列名 + 显式问号数，不用位置式 VALUES；
 * 2. demo-data 里的对象字段按下标/键名显式取，不 spread（多一个键，读模型 parity 就红）。
 */

import { createHash } from 'node:crypto';
import { finalize } from '../demo/build-demo-data.mjs';

/* ---------------- 小工具 ---------------- */

const sha = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex');
const j = (v) => (v === undefined ? null : JSON.stringify(v));

/** src/note 原文里的记录人：含"代记"→CAREGIVER，其余 PATIENT（还原对象不带回 author，仅供过滤与徽章）。 */
const roleOf = (text) => (String(text ?? '').includes('代记') ? 'CAREGIVER' : 'PATIENT');

/** demo 声音状态 ↔ voice_event.kind（0001 CHECK 枚举）双向映射。 */
const STATE_KIND = { moderate: 'ONSET', mild: 'IMPROVED', normal: 'RECOVERED', persistent: 'PERSISTENT' };
const KIND_STATE = { ONSET: 'moderate', IMPROVED: 'mild', RECOVERED: 'normal', PERSISTENT: 'persistent' };
/** demo 碘治疗 kind ↔ 0001 rai_treatment.kind 枚举。 */
const RAI_KIND = { 清甲: 'ABLATION', 辅助: 'ADJUNCTIVE', 清灶: 'THERAPEUTIC' };
/** demo 分子标记显示名 → 0001 molecular_marker.marker 枚举（显示名存 molecular_marker_title）。 */
const MARKER_KEY = (label) => {
  const s = String(label ?? '');
  if (s.startsWith('BRAF')) return 'BRAF';
  if (s.startsWith('RET')) return 'RET';
  if (s.startsWith('RAS')) return 'RAS';
  if (s.startsWith('TERT')) return 'TERT';
  return 'OTHER';
};

/** 指标目录种子（显示字典在原型 app.js 的 CATALOG；这里只落库 code 侧元数据，不是第二份显示源）。
 *  THY 立场（23 号）：无 CTCAE/×ULN 分级对照 → ctcae_rule 全空；RISK/TIRADS 是分类（is_numeric=0）。 */
const METRIC_DEFS = [
  ['TG', 'Tg（甲状腺球蛋白）', 'ng/mL', '血清与甲功', '#2A7F8C', 1, null, 0],
  ['TGAB', 'TgAb（抗 Tg 抗体）', 'IU/mL', '血清与甲功', '#5B9AA6', 1, null, 1],
  ['TSH', 'TSH（促甲状腺激素）', 'mIU/L', '血清与甲功', '#1B5D68', 1, null, 2],
  ['FT4', 'FT4（游离甲状腺素）', 'pmol/L', '血清与甲功', '#8FB9C0', 1, null, 3],
  ['WEIGHT', '体重', 'kg', '体格与代谢', '#C46A2B', 1, null, 4],
  ['RISK', 'ATA 动态反应分层', null, '分层与影像分类', '#7A8B94', 0, null, 5],
  ['TIRADS', 'TI-RADS 分类', null, '分层与影像分类', '#A98A5B', 0, null, 6],
];
const QUAL_CODES = new Set(['RISK', 'TIRADS']);

/* ---------------- 播种 ---------------- */

/**
 * 把 finalize() 的数据写进库。返回写入计数（便于启动日志与测试）。
 * 档案 key = profile.id（demo1 / demo2）。
 */
export function seedDemo(db, input) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('seedDemo 需要一个已打开的数据库');
  const data = input || finalize();

  const already = db.prepare('SELECT COUNT(*) AS n FROM profile').get().n;
  if (already > 0) return { skipped: true, subjects: 0, metrics: 0, points: 0, trials: 0 };

  const counts = { skipped: false, subjects: 0, metrics: 0, points: 0, trials: 0 };
  const today = data.meta?.today ?? new Date().toISOString().slice(0, 10);

  db.exec('BEGIN');
  try {
    const insWorkspace = db.prepare('INSERT OR REPLACE INTO workspace (id, data_root, schema_version, dataset_state) VALUES (?,?,?,?)');
    const insProfile = db.prepare(`INSERT INTO profile
      (id, name, birth_date, gender, primary_role, cognitive_flag, created_at) VALUES (?,?,?,?,?,?,?)`);
    const insProfileMeta = db.prepare('INSERT INTO profile_meta (profile_id, k, v) VALUES (?,?,?)');
    const insMetricDef = db.prepare(`INSERT INTO metric_def
      (code, label, unit, category, color, is_numeric, ctcae_rule, ord) VALUES (?,?,?,?,?,?,?,?)`);
    const insPoint = db.prepare(`INSERT INTO metric_point
      (profile_id, code, measured_at, value_num, value_text, source_note, revision) VALUES (?,?,?,?,?,?,?)`);
    const insLab = db.prepare(`INSERT INTO lab_result
      (profile_id, collected_at, panel, ref_range, document_id) VALUES (?,?,?,?,?)`);
    const insDocument = db.prepare(`INSERT INTO document
      (profile_id, file_name, sha256, status, imported_at, ord, ext_id, kind_text, size_text, review_state) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const insPathology = db.prepare(`INSERT INTO pathology_type
      (profile_id, histology, status, staging_text, ata_layer_text, im_panel, report_date, report_doc_id, ord, revision) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const insMarker = db.prepare(`INSERT INTO molecular_marker
      (profile_id, marker, status, method, specimen_date, value_text, report_doc_id, note, ord, revision) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const insMarkerTitle = db.prepare('INSERT OR REPLACE INTO molecular_marker_title (marker, title, ord) VALUES (?,?,?)');
    const insSurgery = db.prepare(`INSERT INTO surgery_record
      (profile_id, surgery_date, scope_text, hospital, pathology_summary, report_doc_id, ord, revision, ionm_text, stay_text) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const insVoice = db.prepare(`INSERT INTO voice_event
      (profile_id, event_date, kind, severity_text, ent_note, author_role, ord, note, src_note) VALUES (?,?,?,?,?,?,?,?,?)`);
    const insSymptom = db.prepare(`INSERT INTO symptom_log
      (profile_id, logged_at, symptom, severity_text, author_role, ord, note) VALUES (?,?,?,?,?,?,?)`);
    const insRai = db.prepare(`INSERT INTO rai_treatment
      (profile_id, treat_date, kind, dose_mci, institution, discharge_note, wbs_note, report_doc_id, ord, revision,
       ext_id, dose_text, dose_quote, isolation_days, stay_text, kind_label) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insSafety = db.prepare(`INSERT INTO rai_safety
      (profile_id, record_date, note, author_role, ord, item_text, who_text, done_flag) VALUES (?,?,?,?,?,?,?,?)`);
    const insDose = db.prepare(`INSERT INTO lt4_dose
      (profile_id, change_date, dose_ug, change_kind, ord, item_text, note_text, version_label) VALUES (?,?,?,?,?,?,?,?)`);
    const insTshTarget = db.prepare(`INSERT INTO tsh_target
      (profile_id, set_date, target_text, source_note, ord, revision, updated_text, note_text) VALUES (?,?,?,?,?,?,?,?)`);
    const insUs = db.prepare(`INSERT INTO us_followup
      (profile_id, exam_date, tirads_text, measure_text, tg_at_time, next_exam_plan, report_doc_id, ord,
       ext_id, kind_text, tg_src_text, excerpt_text) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insFertPlan = db.prepare(`INSERT INTO fertility_plan
      (profile_id, record_date, cooling_until, status_text, author_role, ord) VALUES (?,?,?,?,?,?)`);
    const insView = db.prepare(`INSERT INTO viewpoint
      (profile_id, author_role, visibility, topic, content, record_date, ord, topic_label, witnessed) VALUES (?,?,?,?,?,?,?,?,?)`);
    const insQuestion = db.prepare(`INSERT INTO question
      (profile_id, kind, content, created_at, asked_on, from_scenario, ord, ext_id, answer_text, place, asked_flag, src_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insRhythm = db.prepare('INSERT INTO followup_rhythm (profile_id, item, freq, guideline, next_on, ord) VALUES (?,?,?,?,?,?)');
    const insMaterial = db.prepare('INSERT INTO material_doc (profile_id, ext_id, doc_name, why_text, state, ord) VALUES (?,?,?,?,?,?)');
    const insReport = db.prepare('INSERT INTO report_excerpt (profile_id, ext_id, reported_on, kind_text, title, excerpt, ord, next_text) VALUES (?,?,?,?,?,?,?,?)');
    const insTask = db.prepare('INSERT INTO task (profile_id, title, due_on, done, ord, year_text, note) VALUES (?,?,?,?,?,?,?)');
    const insTrial = db.prepare('INSERT INTO saved_trial (profile_id, trial_key, saved_at, title, phase, status_text, source, ord) VALUES (?,?,?,?,?,?,?,?)');
    const insJob = db.prepare('INSERT INTO parse_job (document_id, requested_at, state, error_code, error_message) VALUES (?,?,?,?,?)');
    const insCand = db.prepare(`INSERT INTO candidate
      (parse_job_id, field_name, value_text, value_num, unit, confirmed, confirmed_at, target_table, target_id, ext_id, source_note, state_text)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insDemoMeta = db.prepare('INSERT OR REPLACE INTO demo_meta (k, v) VALUES (?,?)');

    /* 全局：workspace 行 + 演示元信息 + 指标目录（目录是全局字典，只种一次）。 */
    insWorkspace.run(1, null, '0001+0002', 'demo-seeded');
    for (const [k, v] of Object.entries(data.meta || {})) insDemoMeta.run(k, v ?? null);
    for (const [code, label, unit, cat, color, isNum, rule, ord] of METRIC_DEFS) {
      insMetricDef.run(code, label, unit, cat, color, isNum, rule, ord);
    }

    for (const p of data.profiles || []) {
      const key = p.id;
      insProfile.run(key, p.name, null, p.gender ?? null, p.primaryRole ?? 'PATIENT',
        'stable', today);
      counts.subjects++;

      /* 档案级标量 → profile_meta（读模型逐键还原；多一个键 parity 就红）。 */
      const pa = p.pathology ?? {};
      const metaRows = [
        ['age', p.age === undefined ? null : String(p.age)],
        ['diagnosis', p.diagnosis ?? null],
        ['diagnosisShort', p.diagnosisShort ?? null],
        ['stageLine', p.stageLine ?? null],
        ['caregiverLabel', p.caregiverLabel ?? null],
        ['tgabNote', p.tgabNote ?? null],
        ['usNote', p.usNote ?? null],
        ['symptomsNote', p.symptomsNote ?? null],
        ['dose_note', p.followup?.doseNote ?? null],
        ['pathology_type_label', pa.typeLabel ?? null],
        ['pathology_opdate', pa.opDate ?? null],
        ['pathology_method', pa.method ?? null],
        ['pathology_hospital', pa.hospital ?? null],
        ['pathology_ajcc_note', pa.ajccNote ?? null],
        ['pathology_ata_note', pa.ataNote ?? null],
        ['pathology_dynamic_note', pa.dynamicNote ?? null],
        ['pathology_four_types', j(pa.fourTypes ?? null)],
        /* dynamicHistory（病理与分层页的变更史）与 metrics.qual.RISK（一图秀分类节点）是
           同一组医生标签的两种投影：这里都从 demo 数据一份来源写入，不互派生。 */
        ['pathology_dynamic_history', j(pa.dynamicHistory ?? null)],
        ['recurrence_note', p.recurrence?.note ?? null],
        ['voice_note', p.surgery?.voice?.note ?? null],
        ['calcium_label', p.surgery?.calcium?.label ?? null],
        ['calcium_label_quote', p.surgery?.calcium?.labelQuote ?? null],
        ['calcium_note', p.surgery?.calcium?.note ?? null],
        ['calcium_meds', j(p.surgery?.calcium?.meds ?? null)],
        ['neck_note', p.surgery?.neck?.note ?? null],
        ['rai_note', p.rai?.note ?? null],
        ['rai_family_snapshot', j(p.rai?.familySnapshot ?? null)],
        ['rai_diet_meta', j(p.rai?.diet ? {
          lowIodineFrom: p.rai.diet.lowIodineFrom ?? null,
          lowIodineTo: p.rai.diet.lowIodineTo ?? null,
          quote: p.rai.diet.quote ?? null,
          note: p.rai.diet.note ?? null,
        } : null)],
        ['bone_note', p.bone?.note ?? null],
        ['risk_levels', j(p.riskLevels ?? null)],
        ['tirads_levels', j(p.tiradsLevels ?? null)],
        ['genetic', j(p.genetic ?? null)],
        ['concerns', j(p.concerns ?? null)],
        ['fertility', j(p.fertility ?? null)],
      ];
      for (const [k, v] of metaRows) insProfileMeta.run(key, k, v);

      /* 指标点：数值序列 + 分类序列（RISK/TIRADS 走同一张 metric_point，is_numeric=0）。 */
      for (const [code, pts] of Object.entries(p.metrics?.numeric || {})) {
        counts.metrics++;
        (pts || []).forEach((pt) => {
          insPoint.run(key, code, pt.d, typeof pt.v === 'number' ? pt.v : null,
            typeof pt.v === 'number' ? null : (pt.v === undefined ? null : String(pt.v)),
            pt.src ?? null, 1);
          counts.points++;
        });
      }
      for (const [code, pts] of Object.entries(p.metrics?.qual || {})) {
        counts.metrics++;
        (pts || []).forEach((pt) => {
          insPoint.run(key, code, pt.d, typeof pt.code === 'number' ? pt.code : null,
            pt.label ?? null, pt.src ?? null, 1);
          counts.points++;
        });
      }

      /* 血钙/PTH 化验（并发症状况卡的原值来源）：lab_result.panel 存 JSON（含参考区间原文）。
         不是一图秀指标——并发症数值不并入趋势（T5 红线）。 */
      (p.surgery?.calcium?.labs || []).forEach((r) => {
        insLab.run(key, r.d, j({ ca: r.ca, pth: r.pth, refCa: r.refCa, refPth: r.refPth, src: r.src }),
          null, null);
      });

      /* 资料库文档：合成导入文档（候选的宿主）ext_id='demo-import'，读模型按它排除。 */
      const importDoc = db.prepare(
        'INSERT INTO document (profile_id, file_name, sha256, status, imported_at, ord, ext_id, kind_text, size_text, review_state) VALUES (?,?,?,?,?,?,?,?,?,?)',
      ).run(key, '演示候选（拍照识别导入）', sha(`demo-import:${key}`), 'parsed', today, 0, 'demo-import', null, null, null);
      const job = insJob.run(importDoc.lastInsertRowid, today, 'succeeded', null, null);

      (p.documents || []).forEach((d, i) => {
        insDocument.run(key, d.name, sha(d.name), 'parsed', today, i + 1, d.id,
          d.kind ?? null, d.size ?? null, d.status ?? null);
      });
      (p.candidates || []).forEach((c) => {
        insCand.run(job.lastInsertRowid, c.field, c.value, null, null, 0, null, null, null,
          c.id, c.src ?? null, c.state ?? null);
      });

      /* 病理（一档案一行，histology 枚举化、AJCC/ATA 原文引用进列）+ 分子三态 + 标题表。 */
      if (pa.type) {
        insPathology.run(key, String(pa.type).toUpperCase(), 'reported',
          pa.ajccQuote ?? null, pa.ataInitialQuote ?? null, null,
          guessDate(pa.ajccQuote) ?? null, null, 0, 1);
      }
      (p.molecular || []).forEach((r, i) => {
        const mk = MARKER_KEY(r.marker);
        insMarker.run(key, mk, r.status, r.method ?? null, r.date ?? null, r.value ?? null,
          null, r.explain ?? null, i, 1);
        insMarkerTitle.run(mk, r.marker, i);
      });

      /* 手术记录（scope=术式名原文、pathology_summary=记录摘录）。 */
      (p.surgery?.ops || []).forEach((o, i) => {
        insSurgery.run(key, o.d, o.title ?? null, o.hospital ?? null, o.quote ?? null, null, i, 1,
          o.ionm ?? null, o.stay ?? null);
      });

      /* 声音线（T5 独立轨道）：entries → voice_event；呛咳打卡 → symptom_log；喉镜 → report_excerpt。 */
      let symOrd = 0;
      (p.surgery?.voice?.entries || []).forEach((e, i) => {
        insVoice.run(key, e.d, STATE_KIND[e.state] ?? 'PERSISTENT', e.label ?? null, null,
          roleOf(e.src), i, e.note ?? null, e.src ?? null);
      });
      (p.surgery?.voice?.cough || []).forEach((r) => {
        insSymptom.run(key, r.d, '呛咳打卡', r.text, roleOf(r.text), symOrd++, null);
      });
      (p.surgery?.voice?.laryngoscopy || []).forEach((r, i) => {
        insReport.run(key, null, r.d, '喉镜检查', null, r.quote, 100 + i, null);
      });

      /* 低钙线打卡 / 颈肩康复 / 疤痕 / 低碘日记 / 治疗反应：统一 symptom_log（symptom 列做键）。 */
      (p.surgery?.calcium?.symptoms || []).forEach((r) => {
        insSymptom.run(key, r.d, '低钙症状打卡', r.text, roleOf(r.text), symOrd++, null);
      });
      (p.surgery?.neck?.exercises || []).forEach((r) => {
        insSymptom.run(key, r.d, '颈肩锻炼打卡', r.text, roleOf(r.text), symOrd++, null);
      });
      (p.surgery?.neck?.scars || []).forEach((r) => {
        insSymptom.run(key, r.d, '疤痕留痕', r.text, roleOf(r.text), symOrd++, null);
      });
      (p.rai?.diet?.entries || []).forEach((r) => {
        insSymptom.run(key, r.d, '低碘与口干日记', r.text, roleOf(r.text), symOrd++, null);
      });
      (p.rai?.reactions || []).forEach((r) => {
        insSymptom.run(key, r.d, '治疗后反应记录', r.text, roleOf(r.text), symOrd++, null);
      });
      (p.symptoms || []).forEach((r) => {
        insSymptom.run(key, r.d, r.kind, r.intensity === undefined ? null : String(r.intensity),
          roleOf(r.note ?? ''), symOrd++, r.note ?? null);
      });

      /* 碘131 独立档案（T3）：治疗按次 + 隔离防护 checklist + WBS。 */
      (p.rai?.courses || []).forEach((c, i) => {
        const doseMci = Number(String(c.dose ?? '').match(/^(\d+(?:\.\d+)?)\s*mCi/i)?.[1] ?? null);
        insRai.run(key, c.d, RAI_KIND[c.kind] ?? 'ABLATION',
          Number.isFinite(doseMci) ? doseMci : null, c.hospital ?? null,
          c.dischargeQuote ?? null, null, null, i, 1,
          c.id ?? null, c.dose ?? null, c.doseQuote ?? null,
          Number.isFinite(c.isolationDays) ? c.isolationDays : null, c.stay ?? null, c.kind ?? null);
      });
      (p.rai?.isolation || []).forEach((r, i) => {
        insSafety.run(key, p.rai?.courses?.[0]?.d ?? today, r.note ?? null,
          roleOf(r.who), i, r.item ?? null, r.who ?? null, r.done ? 1 : 0);
      });
      (p.rai?.wbs || []).forEach((w, i) => {
        insReport.run(key, null, w.d, 'Rx-WBS', w.kind ?? null, w.quote, 200 + i, w.next ?? null);
      });

      /* 骨与心血管监测（同窗记录不判定）→ report_excerpt 专属 kind。 */
      (p.bone?.rows || []).forEach((r, i) => {
        insReport.run(key, null, r.d, '骨与心血管监测', r.item ?? null, r.quote, 300 + i, null);
      });

      /* 剂量时间线（T2 版本链）+ TSH 目标原文（医生维护）。 */
      (p.followup?.doseTimeline || []).forEach((t, i) => {
        const ug = Number(String(t.item ?? '').match(/([\d.]+)\s*μg/)?.[1] ?? null);
        insDose.run(key, t.d, Number.isFinite(ug) ? ug : null,
          t.version === 'v1' ? 'START' : 'INCREASE', i, t.item ?? null, t.quote ?? null, t.version ?? null);
      });
      const tsh = p.followup?.tshTarget;
      if (tsh) {
        insTshTarget.run(key, guessDate(tsh.quote) ?? today, tsh.range ?? null, tsh.quote ?? null,
          0, 1, tsh.updated ?? null, tsh.note ?? null);
      }

      /* 颈部超声并列（T4：TI-RADS 原文/测量原文/当时 Tg，无判读列）。 */
      (p.us || []).forEach((u, i) => {
        insUs.run(key, u.d, u.tirads ?? null, u.measure ?? null,
          typeof u.tgAtTime === 'number' ? u.tgAtTime : null, u.next ?? null, null, i,
          u.id ?? null, u.kind ?? null, u.tgSrc ?? null, u.excerpt ?? null);
      });

      /* 妊娠与生育（T7 按记录不判定）：结构化轨道 + 全量 JSON（pregCards/postpartum 无 0001 落点）。 */
      if (p.fertility) {
        insFertPlan.run(key, p.fertility.cooldown?.from ?? today,
          p.fertility.cooldown?.to ?? null, p.fertility.state ?? null,
          p.primaryRole === 'CAREGIVER' ? 'CAREGIVER' : 'PATIENT', 0);
      }

      /* 双主体：viewpoints（当下感受）与 family（照护代记与家事）→ 同一张 viewpoint 表，
         family 行 topic='FAMILY'，读模型按 topic 分流。 */
      (p.viewpoints || []).forEach((v, i) => {
        insView.run(key, v.role ?? 'PATIENT', v.visibility ?? 'shared', 'OTHER',
          v.content, v.date, i, v.topic ?? null, null);
      });
      (p.family || []).forEach((f, i) => {
        insView.run(key, f.author ?? 'CAREGIVER', f.visibility ?? 'shared', 'FAMILY',
          f.content, f.d, i, f.topic ?? null, f.witnessed ? 1 : 0);
      });

      /* 问与答（kind=fact）与疑问清单（kind=view）→ 同一张 question 表按 kind 分流。 */
      let qOrd = 0;
      (p.qa || []).forEach((r) => {
        insQuestion.run(key, 'fact', r.q, today, r.d ?? null, r.place ?? null, qOrd++,
          null, r.a ?? null, r.place ?? null, null, null);
      });
      (p.questions || []).forEach((r) => {
        insQuestion.run(key, 'view', r.text, today, null, null, qOrd++,
          r.id ?? null, null, null, r.asked ? 1 : 0, r.src ?? null);
      });

      /* 复诊节奏 / 材料清单 / 报告原文 / 试验线索 / 随访日历（task 复用，year_text 分组）。 */
      (p.rhythm || []).forEach((r, i) => {
        insRhythm.run(key, r.item, r.freq ?? null, r.guideline ?? null, r.next ?? null, i);
      });
      (p.materials || []).forEach((m, i) => {
        insMaterial.run(key, m.id ?? null, m.name, m.why ?? null, m.state ?? 'todo', i);
      });
      (p.reports || []).forEach((r, i) => {
        insReport.run(key, null, r.d ?? null, r.kind ?? null, r.title ?? null, r.excerpt ?? null, i, null);
      });
      (p.trials || []).forEach((t, i) => {
        insTrial.run(key, t.key ?? null, today, t.title, t.phase ?? null, t.status ?? null, t.source ?? null, i);
        counts.trials++;
      });
      let taskOrd = 0;
      (p.calendar || []).forEach((year) => {
        (year.rows || []).forEach((r) => {
          insTask.run(key, r.item, r.d ?? null, r.done ? 1 : 0, taskOrd++, year.year ?? null, r.note ?? null);
        });
      });
    }

    db.exec('COMMIT');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* 回滚失败也要把原始错误抛出去 */ }
    throw new Error(`播种演示数据失败（已回滚）：${error.message}`);
  }
  return counts;
}

/** 从原文里取 YYYY-MM-DD / YYYY年M月D日（tsh_target.set_date、病理 report_date 用）；取不到回 null。 */
function guessDate(text) {
  const m = String(text ?? '').match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}

/** 库的演示档案是否已播种过。启动流程用它决定要不要 seedDemo。 */
export function hasDemoData(db) {
  try {
    return db.prepare('SELECT COUNT(*) AS n FROM profile').get().n > 0;
  } catch {
    return false;
  }
}
