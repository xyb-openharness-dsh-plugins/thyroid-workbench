/* 读模型（THY · 甲状腺癌）：把库里的行还原成 **demo-data.js 同一形状**。
 *
 * 契约：`GET /api/bootstrap` 的 profiles 数组必须与 prototypes/v0.2/demo-data.js 里的同名档案
 * 逐字段一致（test/store.test.mjs 是 deepStrictEqual）。parity 是这一层唯一验收标准。
 * 所以这里不做任何"顺手优化"：字段名、数组层级、null 与缺失的语义都跟着 demo-data.js 走。
 *
 * 七条容易踩的（家族级 D1–D10 继承）：
 * 1. 数值指标点用 value_num，分类（RISK/TIRADS）用 value_num=code + value_text=label——
 *    同一张 metric_point，is_numeric=0 的 code 只出现在 qual；
 * 2. 排序：metric_point 按 rowid（＝插入顺序）；其余按各自 ord 列；
 * 3. 报告原文摘录统一 report_excerpt，kind_text 分流：reports[]（其余 kind）/ 喉镜检查 / Rx-WBS / 骨与心血管监测；
 * 4. symptom_log 一张表承载七类打卡/日记（symptom 列做键）：呛咳打卡 / 低钙症状打卡 / 颈肩锻炼打卡 /
 *    疤痕留痕 / 低碘与口干日记 / 治疗后反应记录 / 症状日记（kind=原症状名）；
 * 5. viewpoint 一张表承载 viewpoints（当下感受）与 family（照护代记与家事）两组：
 *    family 行 topic='FAMILY'，读回时按 topic 分流，两组各自的 ord 独立排序；
 * 6. 候选挂在合成导入文档（ext_id='demo-import'）的 parse_job 下；资料库 documents 列表
 *    必须排除这条合成行，否则页面会多出一张"演示候选导入"卡；
 * 7. 节点对象用 {...r} 摊平（node:sqlite 返回 null-prototype 行，deepStrictEqual 会因原型不同失败）。
 */

import { AGENT_PANE } from '../lib/layout.js';

const jp = (s, fallback = null) => {
  if (s === null || s === undefined) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};
/* node:sqlite 返回 null-prototype 行对象，直接 deepStrictEqual 会因原型不同而失败。统一摊平。 */
const rows = (db, sql, ...args) => db.prepare(sql).all(...args).map((r) => ({ ...r }));

const bool = (v) => (v === null || v === undefined ? false : !!v);

/* 0001 枚举 ↔ demo-data 原文的双向映射（两侧必须能互逆，parity 才成立）。 */
const KIND_STATE = { ONSET: 'moderate', IMPROVED: 'mild', RECOVERED: 'normal', PERSISTENT: 'persistent' };
const RAI_KIND_DEMO = { ABLATION: '清甲', ADJUNCTIVE: '辅助', THERAPEUTIC: '清灶' };
const REPORT_KINDS_MAIN = ['喉镜检查', 'Rx-WBS', '骨与心血管监测'];

/** 读一个档案，还原成 demo-data.js 的档案对象形状。 */
function readProfile(db, key) {
  const found = db.prepare('SELECT * FROM profile WHERE id = ?').get(key);
  if (!found) return null;
  const meta = new Map(rows(db, 'SELECT k, v FROM profile_meta WHERE profile_id = ?', key).map((r) => [r.k, r.v]));

  /* ── 指标：数值序列 + 分类序列（同一张 metric_point；is_numeric=0 的 code 分流到 qual）。
     两边都先按 metric_def 预置键（demo-data 里 RISK/TIRADS/TG/… 七个键恒在，空档也要有空数组）。 ── */
  const numeric = {};
  const qual = {};
  for (const d of rows(db, 'SELECT code, is_numeric FROM metric_def ORDER BY ord')) {
    if (Number(d.is_numeric) === 0) qual[d.code] = [];
    else numeric[d.code] = [];
  }
  for (const m of rows(db, `SELECT p.code, p.measured_at, p.value_num, p.value_text, p.source_note
      FROM metric_point p JOIN metric_def d ON d.code = p.code WHERE p.profile_id = ? ORDER BY p.rowid`, key)) {
    if (Number(dIsNumeric(db, m.code)) === 0) {
      /* demo 契约：{ d, code, label, src } 四键恒在。 */
      qual[m.code].push({ d: m.measured_at, code: m.value_num, label: m.value_text, src: m.source_note ?? null });
    } else {
      /* demo 契约：{ d, v, src } 三键恒在。 */
      numeric[m.code].push({ d: m.measured_at, v: m.value_num, src: m.source_note ?? null });
    }
  }

  /* ── 我的瘤与分层（T1：全部原文引用） ── */
  const pa = rows(db, 'SELECT * FROM pathology_type WHERE profile_id = ? ORDER BY ord, rowid', key)[0] ?? null;
  const pathology = pa ? {
    type: String(pa.histology || '').toLowerCase(),
    typeLabel: meta.get('pathology_type_label') ?? null,
    opDate: meta.get('pathology_opdate') ?? null,
    hospital: meta.get('pathology_hospital') ?? null,
    method: meta.get('pathology_method') ?? null,
    fourTypes: jp(meta.get('pathology_four_types') ?? null, []),
    ajccQuote: pa.staging_text,
    ajccNote: meta.get('pathology_ajcc_note') ?? null,
    ataInitialQuote: pa.ata_layer_text,
    ataNote: meta.get('pathology_ata_note') ?? null,
    dynamicHistory: jp(meta.get('pathology_dynamic_history') ?? null, []),
    dynamicNote: meta.get('pathology_dynamic_note') ?? null,
  } : null;
  const markerTitles = new Map(rows(db, 'SELECT marker, title FROM molecular_marker_title').map((r) => [r.marker, r.title]));
  const molecular = rows(db, 'SELECT marker, status, method, specimen_date, value_text, note FROM molecular_marker WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ marker: markerTitles.get(r.marker) ?? r.marker, status: r.status, value: r.value_text, date: r.specimen_date, method: r.method, explain: r.note }));
  const allExcerpts = rows(db, 'SELECT reported_on, kind_text, title, excerpt, next_text FROM report_excerpt WHERE profile_id = ? ORDER BY ord, rowid', key);
  const reports = allExcerpts.filter((r) => !REPORT_KINDS_MAIN.includes(r.kind_text))
    .map((r) => ({ d: r.reported_on, kind: r.kind_text, title: r.title, excerpt: r.excerpt }));

  /* ── 手术与并发症（T5 双轨道并列） ── */
  const ops = rows(db, 'SELECT surgery_date, scope_text, hospital, pathology_summary, ionm_text, stay_text FROM surgery_record WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ d: r.surgery_date, title: r.scope_text, hospital: r.hospital, quote: r.pathology_summary, ionm: r.ionm_text, stay: r.stay_text }));
  const sym = (name) => rows(db, 'SELECT logged_at, severity_text FROM symptom_log WHERE profile_id = ? AND symptom = ? ORDER BY ord, rowid', key, name)
    .map((r) => ({ d: r.logged_at, text: r.severity_text }));
  const voiceEntries = rows(db, 'SELECT event_date, kind, severity_text, note, src_note FROM voice_event WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ d: r.event_date, state: KIND_STATE[r.kind] ?? 'persistent', label: r.severity_text, note: r.note, src: r.src_note }));
  const calciumMeds = jp(meta.get('calcium_meds') ?? null, []);
  const calciumLabs = rows(db, 'SELECT collected_at, panel FROM lab_result WHERE profile_id = ? ORDER BY rowid', key)
    .map((r) => {
      const v = jp(r.panel, {});
      return { d: r.collected_at, ca: v.ca ?? null, pth: v.pth ?? null, refCa: v.refCa ?? null, refPth: v.refPth ?? null, src: v.src ?? null };
    });
  const surgery = {
    ops,
    voice: {
      entries: voiceEntries,
      cough: sym('呛咳打卡'),
      laryngoscopy: allExcerpts.filter((r) => r.kind_text === '喉镜检查').map((r) => ({ d: r.reported_on, quote: r.excerpt })),
      note: meta.get('voice_note') ?? null,
    },
    calcium: {
      labs: calciumLabs,
      symptoms: sym('低钙症状打卡'),
      meds: calciumMeds,
      label: meta.get('calcium_label') ?? null,
      labelQuote: meta.get('calcium_label_quote') ?? null,
      note: meta.get('calcium_note') ?? null,
    },
    neck: {
      exercises: sym('颈肩锻炼打卡'),
      scars: sym('疤痕留痕'),
      note: meta.get('neck_note') ?? null,
    },
  };

  /* ── 碘131 独立档案（T3） ── */
  const courses = rows(db, 'SELECT ext_id, treat_date, kind_label, dose_text, dose_quote, institution, isolation_days, stay_text, discharge_note FROM rai_treatment WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({
      id: r.ext_id, d: r.treat_date, kind: r.kind_label ?? RAI_KIND_DEMO[r.kind_label] ?? '清甲',
      dose: r.dose_text, doseQuote: r.dose_quote, hospital: r.institution,
      isolationDays: r.isolation_days, stay: r.stay_text, dischargeQuote: r.discharge_note,
    }));
  const dietMeta = jp(meta.get('rai_diet_meta') ?? null, {});
  const rai = {
    courses,
    familySnapshot: jp(meta.get('rai_family_snapshot') ?? null, []),
    isolation: rows(db, 'SELECT item_text, who_text, done_flag, note FROM rai_safety WHERE profile_id = ? ORDER BY ord, rowid', key)
      .map((r) => ({ item: r.item_text, who: r.who_text, done: bool(r.done_flag), note: r.note })),
    diet: {
      lowIodineFrom: dietMeta.lowIodineFrom ?? null,
      lowIodineTo: dietMeta.lowIodineTo ?? null,
      quote: dietMeta.quote ?? null,
      entries: sym('低碘与口干日记'),
      note: dietMeta.note ?? null,
    },
    wbs: allExcerpts.filter((r) => r.kind_text === 'Rx-WBS')
      .map((r) => ({ d: r.reported_on, kind: r.title, quote: r.excerpt, next: r.next_text })),
    reactions: sym('治疗后反应记录'),
    note: meta.get('rai_note') ?? null,
  };

  /* ── 随访与调药（T2/T4） ── */
  const tshRow = rows(db, 'SELECT set_date, target_text, source_note, updated_text, note_text FROM tsh_target WHERE profile_id = ? ORDER BY ord, rowid', key)[0] ?? null;
  const followup = {
    tshTarget: tshRow ? {
      range: tshRow.target_text, quote: tshRow.source_note,
      updated: tshRow.updated_text, note: tshRow.note_text,
    } : null,
    doseTimeline: rows(db, 'SELECT change_date, item_text, note_text, version_label FROM lt4_dose WHERE profile_id = ? ORDER BY ord, rowid', key)
      .map((r) => ({ d: r.change_date, item: r.item_text, quote: r.note_text, version: r.version_label })),
    doseNote: null,
  };
  /* doseNote 在 demo 里每档案一句；无独立落点 → profile_meta 补一行（seed 已写）。 */
  followup.doseNote = meta.get('dose_note') ?? null;
  const bone = {
    rows: allExcerpts.filter((r) => r.kind_text === '骨与心血管监测')
      .map((r) => ({ d: r.reported_on, item: r.title, quote: r.excerpt })),
    note: meta.get('bone_note') ?? null,
  };

  /* ── 超声并列（T4） ── */
  const us = rows(db, 'SELECT ext_id, exam_date, kind_text, tirads_text, measure_text, tg_at_time, tg_src_text, excerpt_text, next_exam_plan FROM us_followup WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({
      id: r.ext_id, d: r.exam_date, kind: r.kind_text, tirads: r.tirads_text, measure: r.measure_text,
      tgAtTime: r.tg_at_time, tgSrc: r.tg_src_text, excerpt: r.excerpt_text, next: r.next_exam_plan,
    }));

  /* ── 随访日历（task 复用，year_text 分组） ── */
  const calendar = [];
  for (const r of rows(db, 'SELECT year_text, title, due_on, done, note FROM task WHERE profile_id = ? ORDER BY ord, rowid', key)) {
    let bucket = calendar.find((y) => y.year === r.year_text);
    if (!bucket) { bucket = { year: r.year_text, rows: [] }; calendar.push(bucket); }
    bucket.rows.push({ d: r.due_on, item: r.title, done: bool(r.done), note: r.note });
  }

  /* ── 营养与生活：症状日记（强度轨道不画曲线不归因） ── */
  const symptoms = rows(db, "SELECT logged_at, symptom, severity_text, note FROM symptom_log WHERE profile_id = ? AND symptom IN ('心悸','怕热','乏力','便秘') ORDER BY ord, rowid", key)
    .map((r) => ({ d: r.logged_at, kind: r.symptom, intensity: Number(r.severity_text), note: r.note }));

  /* ── 双主体：viewpoint 一张表分流两组 ── */
  const views = rows(db, 'SELECT author_role, visibility, topic, topic_label, content, record_date, witnessed FROM viewpoint WHERE profile_id = ? ORDER BY ord, rowid', key);
  const viewpoints = views.filter((v) => v.topic !== 'FAMILY')
    .map((v) => ({ role: v.author_role, visibility: v.visibility, date: v.record_date, topic: v.topic_label, content: v.content }));
  const family = views.filter((v) => v.topic === 'FAMILY')
    .map((v) => ({ d: v.record_date, author: v.author_role, topic: v.topic_label, content: v.content, visibility: v.visibility, witnessed: bool(v.witnessed) }));

  /* ── 问与答（fact）与疑问清单（view） ── */
  const qa = rows(db, "SELECT asked_on, content, answer_text, from_scenario FROM question WHERE profile_id = ? AND kind = 'fact' ORDER BY ord, rowid", key)
    .map((r) => ({ d: r.asked_on, q: r.content, a: r.answer_text, place: r.from_scenario }));
  const questions = rows(db, "SELECT ext_id, content, asked_flag, src_note FROM question WHERE profile_id = ? AND kind = 'view' ORDER BY ord, rowid", key)
    .map((r) => ({ id: r.ext_id, text: r.content, asked: bool(r.asked_flag), src: r.src_note }));

  /* ── 复诊与资料 ── */
  const rhythm = rows(db, 'SELECT item, freq, guideline, next_on FROM followup_rhythm WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ item: r.item, freq: r.freq, guideline: r.guideline, next: r.next_on }));
  const materials = rows(db, 'SELECT ext_id, doc_name, why_text, state FROM material_doc WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ id: r.ext_id, name: r.doc_name, why: r.why_text, state: r.state }));
  const documents = rows(db, "SELECT ext_id, file_name, kind_text, size_text, review_state FROM document WHERE profile_id = ? AND ext_id <> 'demo-import' ORDER BY ord, rowid", key)
    .map((r) => ({ id: r.ext_id, name: r.file_name, kind: r.kind_text, size: r.size_text, status: r.review_state }));
  const candidates = rows(db, `SELECT c.ext_id, c.field_name, c.value_text, c.source_note, c.state_text
      FROM candidate c JOIN parse_job pj ON pj.id = c.parse_job_id
      JOIN document d ON d.id = pj.document_id
      WHERE d.profile_id = ? AND d.ext_id = 'demo-import' ORDER BY c.rowid`, key)
    .map((r) => ({ id: r.ext_id, field: r.field_name, value: r.value_text, src: r.source_note, state: r.state_text }));
  const trials = rows(db, 'SELECT trial_key, title, phase, status_text, source FROM saved_trial WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ key: r.trial_key, title: r.title, phase: r.phase, status: r.status_text, source: r.source }));

  /* 症状日记与打卡共用 symptom_log；sym('治疗后反应记录') 等已在上面还原。 */
  const recurrence = {
    note: meta.get('recurrence_note') ?? null,
    events: rows(db, 'SELECT event_date, site, how, note FROM recurrence_event WHERE profile_id = ? ORDER BY ord, rowid', key)
      .map((r) => ({ d: r.event_date, site: r.site, how: r.how, note: r.note })),
  };

  return {
    id: found.id,
    name: found.name,
    age: meta.has('age') ? Number(meta.get('age')) : null,
    gender: found.gender,
    diagnosis: meta.get('diagnosis') ?? null,
    diagnosisShort: meta.get('diagnosisShort') ?? null,
    stageLine: meta.get('stageLine') ?? null,
    primaryRole: found.primary_role,
    caregiverLabel: meta.get('caregiverLabel') ?? null,
    pathology,
    molecular,
    recurrence,
    reports,
    surgery,
    rai,
    followup,
    tgabNote: meta.get('tgabNote') ?? null,
    usNote: meta.get('usNote') ?? null,
    fertility: jp(meta.get('fertility') ?? null),
    bone,
    metrics: { numeric, qual },
    riskLevels: jp(meta.get('risk_levels') ?? null, []),
    tiradsLevels: jp(meta.get('tirads_levels') ?? null, []),
    us,
    calendar,
    symptoms,
    symptomsNote: meta.get('symptomsNote') ?? null,
    viewpoints,
    family,
    qa,
    genetic: jp(meta.get('genetic') ?? null, { note: null, qa: [] }),
    concerns: jp(meta.get('concerns') ?? null, { notes: [] }),
    rhythm,
    materials,
    documents,
    candidates,
    trials,
    questions,
  };
}

/* 分类指标判定：metric_def.is_numeric（0001 指标三表自带；RISK/TIRADS 为 0）。 */
function dIsNumeric(db, code) {
  const r = db.prepare('SELECT is_numeric FROM metric_def WHERE code = ?').get(code);
  return r ? r.is_numeric : 1;
}

export function listSubjects(db) {
  return rows(db, 'SELECT id, name FROM profile ORDER BY rowid');
}

export function getProfile(db, key, opts = {}) {
  return readProfile(db, key);
}

/** `/api/bootstrap` 的 payload：与 demo-data.js 同形（meta + profiles 数组），version/build 注入。 */
export function bootstrap(db, { version, build } = {}) {
  const meta = {};
  for (const r of rows(db, 'SELECT k, v FROM demo_meta')) meta[r.k] = r.v;
  const profiles = listSubjects(db).map((s) => readProfile(db, s.id));
  return {
    version: version ?? null,
    build: build ?? null,
    meta,
    profiles,
    /* 宿主未提供原生会话时这里会是 available:false；开发版自带挂载位演示，所以默认 true。 */
    agent: { available: true, mode: 'dev-mount' },
    layout: { agentPane: AGENT_PANE },
  };
}
