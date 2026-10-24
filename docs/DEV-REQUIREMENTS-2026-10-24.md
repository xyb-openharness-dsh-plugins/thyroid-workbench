# 开发强约束（DEV-REQUIREMENTS）· 2026-10-24

> 体例照 ZERO-TO-DEV（v1.2+ 七步）。每条必须能被某条命令或某张截图验证。
> 本文件直接吸收 GBM 工作台四连踩的全部教训（见 starter `docs/LESSONS.md` 2026-10-24 与 `docs/06-VALIDATION-AND-RELEASE.md`「装机前宿主接线四要素」）。

## 一、范围（交付物 × 落点 × 怎么验）

| # | 交付物 | 落点 | 怎么验 |
| --- | --- | --- | --- |
| R1 | 患者工作台开发版 | `dsh/{index,server,store,workbench,demo,readmodels}.js` + MinerU 六部件 | `npm run check` 全绿 + 无头实测出数字 |
| R2 | 前端（原型同构） | `public/{index.html,style.css,shell.css,app.js}` | ui-parity 逐字符一致 |
| R3 | **真客户端链路**（踩 3 教训） | `src/client.js` → `scripts/build-client.mjs` → `lib/client.js` | check 含 `build:client --check`；装机副本 `grep -c "接入骨架"` = **0** |
| R4 | schema + 冻结合同 | `schema/0001_initial.sql` + `freeze-contract.md` | sha256 复算一致 + 判读列断言 |
| R5 | 2026 临床试验库 | `research/mesothelioma-cancer/` 四件套 | manifest=jsonl=sqlite 行数断言 |
| R6 | HTML 原型 + 交互路径文档 | `prototypes/v0.2/` + `docs/INTERACTION-DESIGN.md` | `file://` 直开 + 四必查件 + **HVT X 层**（28 号） |
| R7 | 文档体系 | `docs/` 本清单等 8 件 | G1/G2/G3 签认留痕 |

## 二、照抄样板的产品要求

移植样板：**cervical-workbench 0.1.1**（用户指定参考；其 client 链路 488 行是家族装机验证过的完整范本）；成熟对比基准：**breast-cancer-workbench 0.12.0**（26 号 §3 口径）。

- 顶栏三段式 + AI 五态；customFrame 右侧 AI 面板 25%–45% 可拖、可隐藏重开（`prompts/DSH-WORKBENCH-TOP-BAR.md`）。
- 一图秀按 16 号合同；3D 指标卡整卡 180°；字号 12.5/15px；页脚贴底；`[hidden]{display:none!important}`。
- **窄宽自适应按 `docs/RESPONSIVE-RULES.md` 六条硬规则执行**（自 GBM v0.1.5 沉淀：卡内纵向堆叠、grid+minmax(0,1fr)、标签不作 flex item、min-width:0、scroll-hint、短 token nowrap；探针/单测兜底）。
- 设置页三区（`docs/SETTINGS-DESIGN.md`）；MinerU Token 三态。

## 三、硬约束（每条带错误来源）

### 数据层（家族级，同 GBM D1–D10 全款继承）

复合主键 ORDER BY rowid；只 `ORDER BY ord` 不叠 DESC；可选显式 null；`in_use` 保留字；分节 `*_title`；分类指标 `dec IS NULL` 且 kind∈{grade,qual}；化验/体征 2–4 周一点、影像不加密；快照定长数组、assemble 中间量解构；迁移只增不改、INSERT 显式列名；演示数据唯一源 `demo/build-demo-data.mjs`。

### 宿主接线四要素（06 号，踩 1/2/3 教训——M5 验收对象是 tgz 内容）

| # | 要素 | 验证 |
| --- | --- | --- |
| H1 | `package.json` dsh 块 + repository | init 已带 ✅；pack 后对照 tgz |
| H2 | patch `config.root: !!js dshHomePath('mesothelioma-workbench')` | 已补 ✅（M0 commit）；装后数据目录在 `harness/mesothelioma-workbench/` |
| H3 | 真客户端：src/client.js → build-client.mjs → lib/client.js（以 cervical 0.1.1 为底改品牌与前缀） | M5 交付；装机副本占位标记=0 |
| H4 | 版本簿记：改包必升版；public 字面量与断言引用 lib/version.js 唯一源 | check-version 十处同源 |

### apiBase 定稿契约（踩 4 教训，v0.1.3 定稿）

**API_BASE = 挂载前缀（独立启动空串，宿主 `/api/mesothelioma-workbench`），页面统一拼 `${API_BASE}/api/xxx`；守卫只禁交界重复 `/(^|\/)api$/`，禁 `includes('/api')` 一刀切**；校验必须带双形态回归测试（空串 + HOST_BASE）；启动期校验失败**渲染错误横幅，禁止裸 throw 白屏**。

### 本癌种专属（THY）

| # | 约束 | 验证 | 依据 |
| --- | --- | --- | --- |
| M1 | 分子/病理三态（检出/未检出/未检测，未检测 ≠ 阴性）；病理三型上皮样/肉瘤样/双相只抄报告 | 读模型断言 + 走查 | issue #13 矩阵 #3 |
| M2 | 胸水事件独立轨道（穿刺/引流/胸膜固定术），不并入化验趋势；mMRC 分类卡不连线 | 读模型断言 | 矩阵 #2 |
| M3 | 职业暴露档案与职业病材料清单：**零法律建议文案**（不写"可以申请/应当赔偿"类） | 词表测试 | 矩阵 #1 |
| M4 | 随访影像并列事实（modified RECIST 测量值/报告原文/当时 mMRC），禁判读列（iRECIST 假性进展语境同 GBM 红线） | schema 无判读列 + 词表 | 矩阵 #4#5 |
| M5 | 双主体：author_role + visibility 三出口过滤（sharedOnly 收敛一个函数） | 三出口过滤单测 | 矩阵 #6 / 26 号 §4.3 |
| M6 | 就诊弯路独立事件轨道（初诊印象/检查/转诊） | 读模型断言 | 矩阵 #6 |
| M7 | MinerU 六部件按 18 号 v2（pipeline 默认、Token 文件优先、失败不产候选、表格先转竖线表、单位先剥 LaTeX） | 18 号 §13 清单 | 用户默认（可回退） |

## 四、本轮明确未做

dsh-desktop 装机（M6）；市场投稿；真实病例；离线试验语料（仅胰腺癌覆盖，THY 只走在线通道）；MinerU 扫描件 OCR 质量等 18 号"未验证"清单。

## 五、我替你定的默认值（可回退，G1 确认）

| 默认 | 理由 |
| --- | --- |
| 服务主体 = 双主体并重 | 照护者代记高发（赔偿材料经办）；复用 GBM 双源标签架构 |
| 病程 = 全病程（含弯路/复发/照护决策） | BACKLOG 标注生存期短 |
| MinerU = 接入 | 家族口径统一、边际成本低 |
| 品牌 = 占位「小蝶宝 ThyPal」 | 发布前可改 |
| 移植样板 cervical 0.1.1；DIFF-MATRIX 基准 breast 0.12.0 | 家族惯例（client 链路成熟度） |
| 模型路由 = 主线 GLM-5.3，批量任务可路由 GLM-5.3-Flash | 已验证可行 |
