# Schema 冻结合同（G3）· 2026-10-24

| 项 | 值 |
| --- | --- |
| 文件 | `schema/0001_initial.sql` |
| sha256 | `962764d65551d5cc8566197c736167b972fcc2d6ac4028d98aa885a445a4e618` |
| 表数 | 30（档案 2 + 指标 3 + 通用 7 + THY 专属 15 + 导入 3） |
| 冻结日 | 2026-10-24（G1+G2 签认后；G3 签认人 samqin123） |
| 验证 | 内存库 30 表全建；**T1 无 risk_level 计算列 / T2 无建议字段 / 判读列断言 PASS** |

## 内容边界（THY 专属 15 表）
pathology_type（histology/staging_text/ata_layer_text 全原文引用）/ molecular_marker(+title)（BRAF/RET/TERT 三态）/ recurrence_event / surgery_record / voice_event（声音线，author_role）/ **rai_treatment（清甲/辅助/清灶 + dose_mci + 隔离与出院指导原文）** / rai_safety（防护执行记录）/ **lt4_dose（剂量版本链）** / **tsh_target（医生维护目标原文）** / us_followup（TI-RADS/测量/当时 Tg 并列）/ fertility_plan（RAI 冷却期）/ pregnancy_log（孕期 LT4/Tg 语境）/ viewpoint（FOLLOWUP_FATIGUE 主题）/ decision_checklist。

## 冻结规则
同家族：sha256 实算一致；只增不改（000N）；分节补列走 ALTER；解冻需用户确认。
