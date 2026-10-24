# 开发强约束（DEV-REQUIREMENTS）· 2026-10-24 · 甲状腺癌（THY）

> 体例照 ZERO-TO-DEV v1.2+（七步）。**本文件重写自 MPM 模板**（fork 残留已清理，评审员发现项——教训已记：跨仓 fork 文档必须逐节替换后再提交）。
> 家族通用层（数据层 D1–D10 / 前端 F1–F4 / 工程 E1–E4 / 宿主接线 H1–H4 / apiBase 定稿契约 / MinerU 18 号 v2 / 窄宽 30 号）全款继承，见 mesothelioma-workbench 同名文件与 starter docs/LESSONS.md 2026-10-24。

## 一、范围（交付物 × 落点 × 怎么验）

| # | 交付物 | 落点 | 怎么验 |
| --- | --- | --- | --- |
| R1 | 开发版 dsh 七件套 + MinerU 六部件 | `dsh/` 11 件 | check 全绿 + 无头数字 |
| R2 | 真客户端链路 | `src/client.js → build-client.mjs → lib/client.js`（cervical 底本） | 装机副本占位=0 |
| R3 | schema + 冻结合同 | `schema/0001_initial.sql` | sha256 + 判读列断言 |
| R4 | 2026 试验库 | `research/thyroid-cancer/` 四件套 | manifest=jsonl=sqlite |
| R5 | 原型 + 交互路径文档 | `prototypes/v0.2/` + INTERACTION-DESIGN | file:// + 四必查件 + HVT X1–X4 |
| R6 | 文档体系 | docs/ 9 件 | G1/G2/G3 留痕 |

## 二、照抄样板

移植样板 cervical 0.1.1（client 链路底本）；成熟基准 breast 0.12.0。品牌三变量：**组织色 湖蓝青 `#2A7F8C`（甲状腺蝶翼意象）**/行动色家族橙/分区雾青灰；品牌「小蝶宝 ThyPal」占位。

## 三、本癌种专属（T1–T7，按 family-landscape §6.4 重构）

| # | 约束 | 验证 | 依据 |
| --- | --- | --- | --- |
| T1 | **ATA 动态风险分层只引用原文**（极佳/血清学/结构性反应），schema 无 risk_level 计算列，判定归医生 | schema 断言 + 词表 | S01 |
| T2 | TSH 抑制：剂量时间线 + 医生给的目标原文并列；**零"建议调整剂量"文案** | 词表测试 | S03 |
| T3 | **碘131 治疗独立事件档案**（剂量/隔离天数/出院指导原文/治疗后扫描）——家族独有 | 独立轨道读模型断言 | S04 |
| T4 | 颈部超声并列（TI-RADS/淋巴结测量原文/当时 Tg），无判读列 | schema 断言 | S06 |
| T5 | 手术并发症双线：声音嘶哑轨道 + 钙/PTH 指标卡，不并入趋势 | 独立轨道断言 | S02 |
| T6 | **长程终生随访视角**：随访日历按年度节奏语境；不做"可以不查"暗示 | 红线扫描 | S08 |
| T7 | 双主体 author_role + visibility 三出口过滤；**妊娠期场景**（RAI 冷却/孕期 LT4 调整/孕期 Tg 一过性）按记录不判定；MTC/ATC 一期只做"见报告原文"标注 | 三出口单测 | S09 |

## 四、本轮明确未做

装机（M6）；市场投稿；真实病例；离线试验语料；MTC/ATC 专属模块（一期）；扫描件 OCR 质量验证。

## 五、默认值（可回退，G1 确认）

双主体并重 / 全病程含终生随访 / MinerU 接入 / 品牌占位「小蝶宝 ThyPal」/ 样板 cervical+基准 breast / 模型路由 GLM-5.3+Flash。
