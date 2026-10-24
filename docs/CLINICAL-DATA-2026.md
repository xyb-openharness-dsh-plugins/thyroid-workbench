# 临床试验数据 2026（CLINICAL-DATA-2026）

> 规程同家族（ZERO-TO-DEV §1.3 + unified-trial-mcp 唯一入口）。脚本 scripts/fetch-thyroid-trials-2026.mjs。

## 关键词口径（M4 前冻结）
- 中文：甲状腺癌 / 甲状腺肿瘤 / 分化型甲状腺癌
- 英文：thyroid cancer / thyroid carcinoma / differentiated thyroid cancer / medullary thyroid carcinoma
- 成分词（第二层）：RET / TSH / radioiodine / 碘131 / lenvatinib

## 通道与诚实边界
四在线通道 + FAILED 不计覆盖 + 离线语料"未配置"（仅胰腺癌）+ 登记状态未核实 + manifest=jsonl=sqlite 断言。
交付：research/thyroid-cancer/{manifest.json, trials-2026.jsonl, thyroid_cancer_trials_2026.sqlite, README.md}
