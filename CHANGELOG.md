# 变更记录

## 0.2.2 — 2026-10-27（36 号疾病概要补齐开发版：顶栏「?」+ 看板状态卡）

原型侧的 36 号改造（primer v2、指南原件可点、D+N 状态卡）此前只在 `prototypes/v0.2/` 里，开发版一行没接，
用户装上的工作台**根本没有疾病概要入口**。这一版把开发版补齐。

- **primer 三件套进 `public/`**：`primer.js` / `primer.css` / `primer-data.js` 与原型同源（含 `safeHref` 只放行 `https://`、
  `.dp-miss` 缺链红标）；`index.html` 加 `primer.css` 与两个 script。
- **顶栏「?」手写**：`primer.js` 的 `mount()` 是「DOM 里已有 `[data-primer-open]` 就接管、没有才插」，而看板状态卡的出口按钮排里
  本来就有同名按钮、`app.js` 又先渲染完看板 —— 自动挂载会去接管那一颗，顶栏永远是空的，而 P1 仍会 PASS（`querySelector`
  拿到的是状态卡按钮，这是个假绿）。改为在 `.top-actions` 手写一颗。⚠️ 按钮那行**必须与原型逐字符一致**，多写
  `aria-controls` / `aria-expanded` 会被 ui-parity 的第 ⑥ 条断言判红（`mount()` 自己会补齐）。
- **看板首卡换成 §2.6 状态卡**：卡头（`D+N 状态卡 · 距下次随访…`）/ 大字天数 / 现状行（阶段·状态·下次）/ 出口按钮排。
  天数由锚点日（手术日 2024-10-18）派生，实测 **D+736**、距下次随访 14 天，不手填；副按钮接疾病概要。
  `style.css` 补同一段 `.status-card`，与原型同块。
- **版本** 0.2.1 → **0.2.2**（`VERSION` / `package.json` / `lib/version.js` / `lib/client.js` / `public/index.html` /
  `public/app.js` 一致；渠道仍 `beta`）。
- **验证**：`npm run check` **47/47 全绿**（含 ui-parity ⑥「index.html 只差 title/版本号/favicon/noindex」）；
  开发版探针 **10/10**（P1–P9 + E0）；疾病概要内 19 处可点链接、4 处 `nolink` 已标注原因、指南表 7 行。
- **原件链接落到 PDF 直链（同日复核）**：卫健委两条原件从通知页改为官方 PDF 直链
  （《甲状腺癌诊疗指南（2022 年版）》65 页 / 《新型抗肿瘤药物临床应用指导原则（2024 年版）》439 页）。
  通知页对无头浏览器返回 HTTP 412 风控，PDF 直链 HTTP 200；`verify-links.mjs` 因 PDF 无 DOM 文本判
  `THIN`（非不可达），已下载并用 pypdf 抽取正文核对标题与关键词（达拉非尼 / 曲美替尼）。
- **排版修复 §4.3**：`primer.css` 重新取自 starter（去掉正文与列表的 `max-width:68ch`、分组列表缩进 20px、
  表格 `min-width:640px` 窄容器横向滚动），`prototypes/v0.2/primer.css` 与 `public/primer.css` 两份同源。
- **检查链**：`npm run check` 末尾追加 `node scripts/check-primer-links.mjs`（L1–L6 共 23 项断言）。
- **装机**：Desktop profile web 换到 0.2.2 tgz，bundles 43 → 43、38 项依赖 0 缺失；装机副本
  `public/primer.js` / `index.html` / `app.js` 与仓库 sha256 全一致。**需重启 DSH Desktop 才会加载。**

只增不删；每条写清"改了什么 + 为什么 + 用户可见结果"。版本号与 VERSION、package.json 三处必须一致。

## 0.2.0 — 2026-10-24（M5 开发版）

- **dsh 十一件**：index/server/store/workbench/routes/demo/readmodels/mineru/settings/thyparse/parse。`API_PREFIX='/api/thyroid'`、`DB_FILE='xyb-thyroid.sqlite'`；store 执行 schema/0001+0002；demo 幂等单事务；readmodels parity（deepStrictEqual）是唯一验收。
- **schema/0002_thy_dev_columns.sql（待追认）**：只增不改——新表 5（profile_meta/demo_meta/report_excerpt/followup_rhythm/material_doc）+ 既有表补列；0001 冻结未动，sha256 复算一致；无 risk_level/建议/判读列（T1/T2 红线照守）。
- **真客户端链路**：src/client.js（cervical 底本换品牌 小蝶宝 ThyPal/🦋/#2A7F8C/thyp.pal.thyroid.*/thy:agent-draft）→ build-client.mjs → lib/client.js；`npm run check` 含 `build:client --check`。
- **apiBase 定稿契约（v0.1.3）**：deriveApiBase 纯函数 + 交界守卫 `/(^|/)api$/`（禁 /api/api，不 includes('/api') 一刀切）+ 双形态回归测试；启动期校验失败渲染错误横幅，禁止裸 throw 白屏。
- **MinerU 六部件（18 号 v2）**：四步协议 + 设置接口 `GET/POST /api/thyroid/settings/mineru`（文件优先于 env、掩码 + 来源、600 原子写、.html 拒收、失败不产候选）；thyparse 指标字典 TG/TGAB/TSH/FT4/FT3/CA/PTH/WEIGHT，TgAb 行加 `not /抗体/` 排除（"甲状腺球蛋白"是"抗甲状腺球蛋白抗体"子串，词边界拦不住）。
- **public/ 四件**：原型定点替换五处（数据加载/AI 五态/宽度记忆/版本/异步启动）；style.css 与原型逐字节一致；ui-parity 单测钉住。
- **检查链**：build:version（THY_CHANNEL）→ build:demo → build:client --check → check-version（十处同源）→ check-syntax → check-schema（冻结 sha256 复算，2 迁移）→ check-wording（T2 调药 + T6 可以不查 + T5 TI-RADS 词族）→ check-demo-columns（35 表 291 列一致 + 判读列红线含 risk_level）→ 47 项单测 → check-workbench-package（含装机面四要素）。
- **演示数据**：demo/build-demo-data.mjs 三产物（原型 demo-data.js 逐字节未变 / public/demo-data.js / demo/demo-data.sqlite 同源播种 47 点 6 线索）。

## 0.1.0 — 2026-10-24

- 由社区脚手架 dsh-wb-cli@1.5.0 (ce410fb) 初始化，仅有注册骨架与健康接口，无业务功能。

## 0.2.1（2026-10-25）· 装机确认与发布

- V2/V3 真机确认（用户）：打开/渲染/连接/会话/治疗页数据完整。
- AI 协助按钮升级：一键携带「场景提示词 + 病情上下文」到原生会话草稿（thy:agent-draft，无会话自动调起）。
- 过程缺陷修复三连：一图秀 SVG 根 class 缺失（黑块）→ Fritsch-Carlson 单调三次（平滑度）→ AI 按钮消息通道。
- 数据完整性核查：bootstrap 键集与原型 38=38 逐键一致；demo2 妊娠线完整。
- 0002 增量迁移用户追认；导入 UI 完整接线列为后续迭代。
