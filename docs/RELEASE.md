# 发布与回滚记录

版本/tag/commit：... 变更的功能 ID：... 用户授权范围：...
家族一致性：`npm run audit` 结果（xx/xx 通过 · N fail · M warn）；存在 fail 不得发布，warn 逐条给结论：...
源码检查：... 包检查/大小/hash：... 实机证据：...
README/许可证/素材来源/运行依赖/更新说明：...
演示数据清单已清理或明确示例环境：...
数据库迁移与旧包兼容：... 可用备份：...
市场分发来源：npm / Release tarball / 默认分支源码 / 不投稿（选一并说明依据）：...

若任务要求本机更新：最终已安装版本/Profile/打开确认本次修改：...。若仅推送Git：明确此范围，不声称本机已更新。仅安装后仍旧版或异常时附源码→构建物→包→Profile→运行界面的诊断证据，不每次重复整链排查。

| 动作 | 目标 | 真实结果/URL/证据 | 状态 |
| --- | --- | --- | --- |
| 本地安装 | Desktop/profile | | 未执行 |
| Git push | 远端/分支/commit | | 未执行 |
| Release/npm | tag/产物/hash | | 未执行 |
| 市场 PR | 官方目录仓库 | | 未执行 |
| 上架 | 公开 catalog | | 未执行 |

市场状态说明：GitHub Release 不会自动成为市场安装来源。核对已有目录条目/开放PR；若未声明 tarball，市场按目录协议使用默认分支源码（或适用的npm来源）。普通代码版本升级不重复创建目录PR；切换安装来源或修改目录元数据时，在原条目PR中更新。市场PR提交、合并、目录可见、Desktop可安装分别记录，不混称“已上架”。

回滚步骤/数据兼容检查/已知限制：...

工作台市场发布另按 docs/10-MARKET-PUBLISHING.md 执行，附 templates/MARKET-ACCEPTANCE.md 的指定版本手工确认。官方指南复核日期/来源：... 最终安装来源：... 用户确认的项目与执行者：... PR URL/最新提交检查实际执行结果：... 市场目录可见与可安装证据：...。未授权投稿时标不适用，不把 Git push 当市场发布。

## 0.2.0 装机记录（M6 · 2026-10-24）

| 项 | 值 |
| --- | --- |
| tgz | `release/xyb-community-thyroid-workbench-0.2.0.tgz`（npm shasum 77d36849…） |
| 四要素对照（tgz 内容） | H1 dsh 块+repository ✅ / H2 config.root（config:+root: 两行结构）✅ / H3 真客户端 495 行占位=0 ✅ / H4 版本同源 v0.2.0 ✅ |
| 安装 | `NODE_OPTIONS= corepack pnpm add -w --save-exact file:…0.2.0.tgz`（+1 包） |
| 五要素 | 装机副本 ver/dsh 块/file 依赖/占位=0/lib.version 同源 ✅ + bundles 登记（乳腺实录约定） |
| M5 交付 | check 47/47 + audit 37/37（独立复跑）；thyparse TgAb⊂Tg 词边界修复；DEV-PLAN fork 残留勘误 |
| **UI 加载/业务验证（V2/V3）** | **未验证**——待用户重启 Desktop → 添加小蝶宝 → **先新建会话**（MPM 轮第 6 类教训：宿主按会话授权接口）→ 核心流程走查 |
| 挂账 | schema/0002（5 新表+补列）**待用户追认**；MTC/ATC 专属模块一期未做 |

## 0.2.1 增量（2026-10-24，用户真机需求）

| 项 | 内容 |
| --- | --- |
| 需求 | AI 协助按钮应一键携带「场景提示词 + 关键信息」到 AI 对话窗口，可继续互动 |
| 实现 | `ai-draft` 按钮 → `aiPromptWithCtx(page)`（场景提示词 + 档案摘要/阶段/Tg/最近 RAI）→ `postMessage(thy:agent-draft)` → 外壳 fillDraft 填入 DSH 原生会话草稿（无会话则 ensureSession 调起后填入）；不自动发送（家族契约） |
| 同步 | 原型 app.js 与 public/app.js 逐字一致（ui-parity 47/47 过）；0.2.1 已装机 |
| 数据完整性核查 | bootstrap 键集与原型 demo-data **38=38 逐键一致**、嵌套值 parity deepStrictEqual 全等；DB 各表行数正常（profile 2 / rai 2 / lt4 4 / us 3 / metric 47）；demo2 妊娠线数据完整（fertility: state/cooldown/pregCards/pregNote/postpartum）。此前 `?profile=demo2` 参数形状误读导致的"数据缺失"排除 |
| 边界说明 | **资料导入（docs·library）UI 仍为静态示意**——MinerU 服务端六部件与设置接口已就绪且 API 实测，页面导入交互完整接线属 M5 后迭代（与 MPM/GBM 同边界，已在遗留清单） |

## V2/V3 真机走查（2026-10-25，用户确认）

- 用户原话"确认ok"（对 V2/V3 整体确认）；**V2/V3 判定：通过**，进 M7 发布。
- 过程缺陷均已在 0.2.1 修复并复验：一图秀黑块（SVG 根 class）、曲线平滑度（Fritsch-Carlson）、AI 按钮一键携带（thy:agent-draft）。
- 如实记录：未逐项列明子项（切页/落盘重开），以整体确认为准；导入 UI 边界见上。
