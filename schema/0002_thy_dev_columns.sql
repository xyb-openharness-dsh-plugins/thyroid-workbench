-- 0002_thy_dev_columns.sql · THY M5 开发版增量（2026-10-24）
-- 规则：只增不改（0001 冻结不动）。本文件为 M5 开发版落到 0001 上所缺的存储：
--   0001 的 30 张表装得下指标点 / RAI / 剂量 / 超声 / 声音线等主轨，
--   但 demo-data 形状里还有三类东西没有落点：
--   ① 档案级标量（diagnosis/stageLine/caregiverLabel/age/…）与演示元信息——0001 无 profile_meta / demo_meta；
--   ② 报告原文摘录（出院小结/病理/超声/喉镜/WBS/骨与心血管）——0001 无 report_excerpt；
--   ③ 若干主轨表缺演示形状所需的原文列（document 无 ext_id/kind/size，candidate 无 ext_id/来源…）。
-- 全部走 ALTER TABLE ADD COLUMN / CREATE TABLE，不改任何既有列；判读列红线照守
-- （无 risk_level / is_conclusion / 建议 字段——T1/T2 红线）。
-- 状态：**待追认**——M5 一次性提出，随 DEV-REQUIREMENTS §五默认值走；G 签认前不删不改。
-- 冻结：sha256 记入 schema/freeze-contract.md 第二行。

-- ═══ 新表（6）═══

-- 档案级标量（k/v）：demo-data 的档案标量在 0001 的 profile 表只有 5 列，
-- 诊断/分期行/照护者标签/年龄等按 MPM 轮 profile_meta 同款落这里（读模型逐键还原）。
CREATE TABLE profile_meta (
  profile_id TEXT NOT NULL,
  k TEXT NOT NULL,
  v TEXT,
  PRIMARY KEY (profile_id, k)
);

-- 全局演示元信息（meta.dataStart/today/disclaimer/trialNote/…；MPM 同名表同款）。
CREATE TABLE demo_meta (
  k TEXT PRIMARY KEY,
  v TEXT
);

-- 报告原文摘录（reports[] / 喉镜 / Rx-WBS / 骨与心血管监测 共用一张；kind_text 区分分流）。
-- 只存摘录原文，不做任何判读（T1/T4/T5 红线）。
CREATE TABLE report_excerpt (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  ext_id TEXT,
  reported_on TEXT,
  kind_text TEXT,
  title TEXT,
  excerpt TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
-- Rx-WBS 行要带「按医嘱随访」的 next 说明（demo wbs[].next）。
ALTER TABLE report_excerpt ADD COLUMN next_text TEXT;

-- 复诊节奏（rhythm[]）：0001 无节奏表（MPM followup_rhythm 同款平移）。
CREATE TABLE followup_rhythm (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  item TEXT NOT NULL,
  freq TEXT,
  guideline TEXT,
  next_on TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

-- 复诊/报销材料清单（materials[]；THY 无职业病线，仅复诊与报销材料）。
CREATE TABLE material_doc (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  ext_id TEXT,
  doc_name TEXT NOT NULL,
  why_text TEXT,
  state TEXT NOT NULL DEFAULT 'todo' CHECK (state IN ('todo','partial','ready')),
  ord INTEGER NOT NULL DEFAULT 0
);

-- ═══ 补列（只 ADD COLUMN；CHECK 约束在 0001 冻结，不改）═══

-- document：资料库卡需要 ext_id（demo 文档 id）/ kind / size / 用户侧核对状态；
--   0001 的 status 只有三终态（pending/parsed/parse_failed，18 号 v2 语义），
--   「已核对/待核对」是用户侧核对态 → review_state 另存一列，不混解析终态。
ALTER TABLE document ADD COLUMN ext_id TEXT;
ALTER TABLE document ADD COLUMN kind_text TEXT;
ALTER TABLE document ADD COLUMN size_text TEXT;
ALTER TABLE document ADD COLUMN review_state TEXT;

-- candidate：演示候选需要 ext_id / 来源 / 核对三态（待核对/已入库/已拒收）。
ALTER TABLE candidate ADD COLUMN ext_id TEXT;
ALTER TABLE candidate ADD COLUMN source_note TEXT;
ALTER TABLE candidate ADD COLUMN state_text TEXT;

-- saved_trial：试验线索陈列需要 title/phase/status/source（"登记状态，未核实"常驻）。
ALTER TABLE saved_trial ADD COLUMN title TEXT;
ALTER TABLE saved_trial ADD COLUMN phase TEXT;
ALTER TABLE saved_trial ADD COLUMN status_text TEXT;
ALTER TABLE saved_trial ADD COLUMN source TEXT;
ALTER TABLE saved_trial ADD COLUMN ord INTEGER NOT NULL DEFAULT 0;

-- question：疑问清单与医生问答复用一张（kind fact/view 分流）：
--   fact=已问有答复（qa[]），view=想问医生的问题（questions[]）。
ALTER TABLE question ADD COLUMN ext_id TEXT;
ALTER TABLE question ADD COLUMN answer_text TEXT;
ALTER TABLE question ADD COLUMN place TEXT;
ALTER TABLE question ADD COLUMN asked_flag INTEGER;
ALTER TABLE question ADD COLUMN src_note TEXT;

-- viewpoint：topic 在 0001 是枚举，demo 的自由主题（"Tg 数值升高后"…）落 topic_label；
--   family 行（照护代记与家事）复用本表 topic='FAMILY'（MPM 同款分流），witnessed 是代记徽章。
ALTER TABLE viewpoint ADD COLUMN topic_label TEXT;
ALTER TABLE viewpoint ADD COLUMN witnessed INTEGER;

-- symptom_log：症状/打卡类条目（呛咳打卡、低钙症状打卡、康复打卡、疤痕留痕、低碘日记、
--   治疗反应、症状日记）复用一张，note 存原话。
ALTER TABLE symptom_log ADD COLUMN note TEXT;

-- surgery_record：手术记录卡要 IONM 与住院天数原文。
ALTER TABLE surgery_record ADD COLUMN ionm_text TEXT;
ALTER TABLE surgery_record ADD COLUMN stay_text TEXT;

-- voice_event：声音线条目要 note（原话）与 src（来源标注）；severity_text 存状态标签。
ALTER TABLE voice_event ADD COLUMN note TEXT;
ALTER TABLE voice_event ADD COLUMN src_note TEXT;

-- rai_treatment：剂量/隔离要以演示形状原样还原（剂量全文、治疗单摘录、隔离天数、住院原文）。
ALTER TABLE rai_treatment ADD COLUMN ext_id TEXT;
ALTER TABLE rai_treatment ADD COLUMN dose_text TEXT;
ALTER TABLE rai_treatment ADD COLUMN dose_quote TEXT;
ALTER TABLE rai_treatment ADD COLUMN isolation_days INTEGER;
ALTER TABLE rai_treatment ADD COLUMN stay_text TEXT;
ALTER TABLE rai_treatment ADD COLUMN kind_label TEXT;

-- rai_safety：隔离防护日历是 checklist（item/who/done），0001 只有 note 原文列。
ALTER TABLE rai_safety ADD COLUMN item_text TEXT;
ALTER TABLE rai_safety ADD COLUMN who_text TEXT;
ALTER TABLE rai_safety ADD COLUMN done_flag INTEGER;

-- lt4_dose：剂量时间线卡要变更条目全文、医嘱摘录与版本号（v1/v2 版本链标签）。
ALTER TABLE lt4_dose ADD COLUMN item_text TEXT;
ALTER TABLE lt4_dose ADD COLUMN note_text TEXT;
ALTER TABLE lt4_dose ADD COLUMN version_label TEXT;

-- tsh_target：目标原文（target_text=区间、source_note=医嘱摘录）之外还要确认记录与口径说明。
ALTER TABLE tsh_target ADD COLUMN updated_text TEXT;
ALTER TABLE tsh_target ADD COLUMN note_text TEXT;

-- us_followup：超声并列卡要 ext_id / 报告种类 / 当时 Tg 来源 / 摘录原文。
ALTER TABLE us_followup ADD COLUMN ext_id TEXT;
ALTER TABLE us_followup ADD COLUMN kind_text TEXT;
ALTER TABLE us_followup ADD COLUMN tg_src_text TEXT;
ALTER TABLE us_followup ADD COLUMN excerpt_text TEXT;

-- task：随访日历（年度分组 + 备注）复用 task 表；year_text 分组、note 存备注。
ALTER TABLE task ADD COLUMN year_text TEXT;
ALTER TABLE task ADD COLUMN note TEXT;
