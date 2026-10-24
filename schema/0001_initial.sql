-- 0001_initial.sql · THY 工作台初始迁移（G3 冻结版 · 2026-10-24）
-- 来源：schema/draft（MPM 通用结构平移）+ family-landscape §6 页面树 + T1–T7 红线。
-- 顺序：档案级 → 指标 → 通用 → THY 专属 → 导入件。共 30 表。
-- 冻结规则：sha256 记入 schema/freeze-contract.md；结构变更只能新增 000N_*.sql。
-- 四契约 + THY 红线：T1 分层只引用（无 risk_level 计算列）；T2 零调药建议（tsh_target 为医生维护原文）；
--   T3 RAI 只记已发生；T4 超声无判读列；T5 并发症独立轨道；T7 妊娠按记录不判定。

-- ═══ 档案级（2）═══
CREATE TABLE workspace (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data_root TEXT,
  schema_version TEXT NOT NULL,
  dataset_state TEXT
);
CREATE TABLE profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date TEXT,
  gender TEXT,
  primary_role TEXT CHECK (primary_role IN ('PATIENT','CAREGIVER')),
  cognitive_flag TEXT CHECK (cognitive_flag IN ('stable','changed')),
  created_at TEXT NOT NULL
);

-- ═══ 指标（3；钙/PTH/Tg/TgAb/TSH/FT4 走 metric_def+metric_point）═══
CREATE TABLE metric_def (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT,
  category TEXT NOT NULL,
  color TEXT,
  is_numeric INTEGER NOT NULL DEFAULT 1,
  ctcae_rule TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE metric_point (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  code TEXT NOT NULL REFERENCES metric_def(code),
  measured_at TEXT NOT NULL,
  value_num REAL,
  value_text TEXT,
  source_note TEXT,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE lab_result (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  panel TEXT,
  ref_range TEXT,
  document_id INTEGER
);

-- ═══ 通用（7）═══
CREATE TABLE adverse_event (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  term TEXT NOT NULL,
  ctcae_grade INTEGER,
  attribution_note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE symptom_log (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  symptom TEXT NOT NULL,
  severity_text TEXT,
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE nutrition_log (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  intake_level TEXT CHECK (intake_level IN ('OK','REDUCED','MINIMAL')),
  weight_kg REAL,
  note TEXT,                                -- RAI 低碘期语境在此记录（T3 配套）
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE question (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('fact','view')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  asked_on TEXT,
  from_scenario TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE task (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  title TEXT NOT NULL,
  due_on TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE document (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','parsed','parse_failed')),
  imported_at TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE saved_trial (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  trial_key TEXT NOT NULL,
  saved_at TEXT NOT NULL
);

-- ═══ THY 专属（15）═══
-- T1：病理与分层只引用（无判定列；histology/staging/ata 全部原文照抄）
CREATE TABLE pathology_type (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  histology TEXT NOT NULL CHECK (histology IN ('PAPILLARY','FOLLICULAR','MEDULLARY','ANAPLASTIC','NOT_SUBTYPED')),
  status TEXT NOT NULL CHECK (status IN ('reported','not_reported')),
  staging_text TEXT,                        -- AJCC 分期原文引用
  ata_layer_text TEXT,                      -- ATA 风险分层原文引用（医生判定，本台不计算）
  im_panel TEXT,
  report_date TEXT,
  report_doc_id INTEGER,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE molecular_marker (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  marker TEXT NOT NULL CHECK (marker IN ('BRAF','RET','TERT','RAS','OTHER')),
  status TEXT NOT NULL CHECK (status IN ('detected','not_detected','not_tested')),
  method TEXT, specimen_date TEXT,
  value_text TEXT,
  report_doc_id INTEGER,
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE molecular_marker_title ( marker TEXT PRIMARY KEY, title TEXT NOT NULL, ord INTEGER NOT NULL DEFAULT 0 );
-- 复发与转移事件（site/how 医生告知原文）
CREATE TABLE recurrence_event (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  event_date TEXT,
  site TEXT NOT NULL,                       -- 部位（颈部淋巴结/肺/骨…患者语言或报告原文）
  how TEXT,                                 -- 确认方式原文（超声穿刺/病理…）
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE surgery_record (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  surgery_date TEXT NOT NULL,
  scope_text TEXT,                          -- 手术范围原文（腺叶/全切+中央区…）
  hospital TEXT,
  pathology_summary TEXT,
  report_doc_id INTEGER,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
-- T5：声音线（并发症独立轨道）
CREATE TABLE voice_event (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  event_date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('ONSET','IMPROVED','RECOVERED','PERSISTENT')),
  severity_text TEXT,                       -- 患者语言（"说长句子气不够"）
  ent_note TEXT,                            -- 喉镜检查原文
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  ord INTEGER NOT NULL DEFAULT 0
);
-- T3：碘131 独立档案（只记已发生）
CREATE TABLE rai_treatment (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  treat_date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('ABLATION','ADJUNCTIVE','THERAPEUTIC')),
  dose_mci INTEGER,
  institution TEXT,
  discharge_note TEXT,                      -- 出院指导原文（隔离/距离/酸糖…）
  wbs_note TEXT,                            -- 治疗后扫描与反应原文
  report_doc_id INTEGER,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE rai_safety (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  note TEXT,                                -- 防护执行记录（与孕妇/儿童距离等，原文）
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  ord INTEGER NOT NULL DEFAULT 0
);
-- T2：剂量时间线（版本链）+ TSH 目标（医生维护原文）
CREATE TABLE lt4_dose (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  change_date TEXT NOT NULL,
  dose_ug REAL NOT NULL,
  change_kind TEXT CHECK (change_kind IN ('START','INCREASE','DECREASE','STEADY')),
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE tsh_target (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  set_date TEXT NOT NULL,
  target_text TEXT NOT NULL,                -- 医生给的目标原文（如 <0.1 mIU/L）
  source_note TEXT,                         -- 医生/门诊出处
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
-- T4：颈部超声并列（TI-RADS/测量原文，无判读列）
CREATE TABLE us_followup (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  exam_date TEXT NOT NULL,
  tirads_text TEXT,                         -- TI-RADS 分类原文
  measure_text TEXT,                        -- 淋巴结/结节测量原文
  tg_at_time REAL,
  next_exam_plan TEXT,
  report_doc_id INTEGER,
  ord INTEGER NOT NULL DEFAULT 0
);
-- T7：妊娠与生育（按记录不判定）
CREATE TABLE fertility_plan (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  cooling_until TEXT,                       -- RAI 冷却期截止（医生/核医学科原文）
  status_text TEXT,                         -- 备孕/妊娠状态原文
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE pregnancy_log (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  week_note TEXT,                           -- 孕周/产后语境
  lt4_adjust_text TEXT,                     -- 孕期 LT4 调整原文（医生）
  tg_note TEXT,                             -- 孕期 Tg 一过性升高语境（解释层口径）
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  ord INTEGER NOT NULL DEFAULT 0
);
-- 双主体（G5）
CREATE TABLE viewpoint (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  visibility TEXT NOT NULL DEFAULT 'shared' CHECK (visibility IN ('shared','private')),
  topic TEXT CHECK (topic IN ('MOOD','FAMILY','DECISION_ACP','FOLLOWUP_FATIGUE','OTHER')),
  content TEXT NOT NULL,
  record_date TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE decision_checklist (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','discussed','filed')),
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

-- ═══ 导入件（3，18 号 v2 语义）═══
CREATE TABLE import_file (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES document(id),
  byte_size INTEGER NOT NULL,
  mime TEXT,
  in_use INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE parse_job (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES document(id),
  requested_at TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('running','succeeded','failed')),
  error_code TEXT,
  error_message TEXT
);
CREATE TABLE candidate (
  id INTEGER PRIMARY KEY,
  parse_job_id INTEGER NOT NULL REFERENCES parse_job(id),
  field_name TEXT NOT NULL,
  value_text TEXT,
  value_num REAL,
  unit TEXT,
  confirmed INTEGER NOT NULL DEFAULT 0,
  confirmed_at TEXT,
  target_table TEXT,
  target_id INTEGER
);
