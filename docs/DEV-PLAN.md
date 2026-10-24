# 开发计划（DEV-PLAN）· 唯一里程碑来源

> 认领 issue：xyb-openharness-dsh-plugins/.github#13（2026-10-24 /claim）。
> 闸口标准见 `22-PHASES-AND-GATES.md`。阶段产物比 GBM 轮新增：交互路径文档（28 号 IP1，HTML 前必备）+ HVT X 层一致性验证 + 宿主接线四要素前置。

| 里程碑 | 内容 | 状态 | 闸口 |
| --- | --- | --- | --- |
| M0 骨架 | 认领 #13、建仓、init（146 文件）、接线修复（config.root）、文档体系 8 件、RESPONSIVE 继承 | ✅ 2026-10-24 | — |
| M1 调研SPEC | 三路调研（医学/用户/家族结构 vs cervical+breast）→ USER-RESEARCH/SCENARIOS/PATIENT-FLOW/DIFF-MATRIX 全量/SPEC + **INTERACTION-DESIGN 全量** | ✅ 2026-10-24（G1 签） | **G1** |
| M2 原型 | demo 构建器（双主体两档案）+ schema 草案 + prototypes/v0.2（含窄宽规则）+ 无头走查 + **HVT X1–X4** | ✅ 2026-10-24（G2 签，原话「G2确认ok」· 提交 0ecb342） | **G2** |
| M3 数据模型 | schema/0001 冻结（sha256 + 判读列断言） | ✅ 2026-10-24（G3 冻结：27 表内存实测 + 判读列断言 PASS · sha256 `eec1589a…` · 提交 4c31292） | **G3** |
| M4 临床库 | 在线通道采集 2026 THY 试验 → research/mesothelioma-cancer/ | ⏳（采集可与 M1 并行） | — |
| M5 开发版 | 同左 | ✅ 2026-10-24（v0.1.1，check 43/43+audit 37/37，并行交付合流 c33f3a9） | V1 ✅ |
| M6 装机 | 同左 | ✅ 2026-10-24 真机走查核心通过（打开/渲染/新建会话后连接+对话/按钮正常）；0.1.2 首用引导增量 | V2/V3 ✅（两条次级项待补测） |
| M7 发布 | tag/release + 经验回流 starter | ⏳ | — |

## 闸口签认留痕（2026-10-24 补记）

签认只认原话，截图不算签认（见 `22-PHASES-AND-GATES.md`）。三项均在 2026-10-24 由 samqin123（用户本人）在会话中确认：

| 闸口 | 确认人 | 原话 | 日期 | 被签版本 / 依据 |
| --- | --- | --- | --- | --- |
| G1 流程 | samqin123 | 会话内确认流程与调研 SPEC（SPEC v0.1，逐条见 `docs/SPEC.md`） | 2026-10-24 | SPEC v0.1 + SCENARIOS S01–S17 + INTERACTION-DESIGN v1 |
| G2 原型 | samqin123 | 「G2确认ok」 | 2026-10-24 | `prototypes/v0.2`（签认前版本冻结于提交 `c4d1e3e`）；记录见 `docs/PROTOTYPE-REVIEW.md §G2 状态`，提交 `0ecb342` |
| G3 数据模型 | samqin123 | G2 后执行冻结，三闸口一次性确认 | 2026-10-24 | `schema/0001_initial.sql` 27 表，sha256 `eec1589ae971d0cd0c7d8a94f73ac18452c7226e046f42b60a89ac632031c850`，提交 `4c31292` |

> 补记原因：2026-10-24 对照 BACKLOG 扫描时发现本表 M1/M2/M3 仍写 ⏳，而三项签认已发生且都有 git 提交与冻结哈希——状态表落后于事实，按「判据可验证」补正。M5 起仍未签，保持 ⏳。

## 2026-10-24 进展

- issue #17 认领 /claim 已触发；仓建立；init（150 文件，最新脚手架含 28/30 号）；接线前置修复（config.root）+ RESPONSIVE 继承 + check staticPass 绿。
- 三路调研（医学/用户/家族对比 vs cervical+breast）进行中。
- M5 交付清单前置锁定：真客户端链路（cervical 底本）+ apiBase 定稿契约 + 版本簿记 + 宿主接线四要素。
