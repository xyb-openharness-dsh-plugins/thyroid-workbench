# Schema 冻结合同（G3）· 2026-10-24

| 迁移文件 | sha256 |
| --- | --- |
| `0001_initial.sql` | `962764d65551d5cc8566197c736167b972fcc2d6ac4028d98aa885a445a4e618` |
| `0002_thy_dev_columns.sql` | `e9565f12cd62a0a5db8748bca2cf8cce0773677bd8c135bc7983e7495d0671b2` |

## 0001（冻结基线）

| 项 | 值 |
| --- | --- |
| 表数 | 30（档案 2 + 指标 3 + 通用 7 + THY 专属 15 + 导入 3） |
| 冻结日 | 2026-10-24（G1+G2 签认后；G3 签认人 samqin123） |
| 验证 | 内存库 30 表全建；**T1 无 risk_level 计算列 / T2 无建议字段 / 判读列断言 PASS** |

## 0002（M5 开发版增量 · 待追认）

| 项 | 值 |
| --- | --- |
| 内容 | 新表 6（profile_meta / demo_meta / report_excerpt / followup_rhythm / material_doc / —其余为补列）+ 既有表补列（document/candidate/saved_trial/question/viewpoint/symptom_log/surgery_record/voice_event/rai_treatment/rai_safety/lt4_dose/tsh_target/us_followup/task 各 ADD COLUMN，只增不改） |
| 状态 | **待追认**（M5 一次性提出；0001 冻结未动一行；无任何判读/建议列，T1/T2 红线照守） |

## 内容边界（THY 专属 15 表）
pathology_type（histology/staging_text/ata_layer_text 全原文引用）/ molecular_marker(+title)（BRAF/RET/TERT 三态）/ recurrence_event / surgery_record / voice_event（声音线，author_role）/ **rai_treatment（清甲/辅助/清灶 + dose_mci + 隔离与出院指导原文）** / rai_safety（防护执行记录）/ **lt4_dose（剂量版本链）** / **tsh_target（医生维护目标原文）** / us_followup（TI-RADS/测量/当时 Tg 并列）/ fertility_plan（RAI 冷却期）/ pregnancy_log（孕期 LT4/Tg 语境）/ viewpoint（FOLLOWUP_FATIGUE 主题）/ decision_checklist。

## 冻结规则
同家族：sha256 实算一致；只增不改（000N）；分节补列走 ALTER；解冻需用户确认。

## 追认记录

| 日期 | 迁移 | 追认 |
| --- | --- | --- |
| 2026-10-25 | `0002_*.sql`（5 新表 + 补列，M5 parity 实测缺列走只增路径，0001 未动） | **用户追认 ✅**（原话"ok"，会话） |
