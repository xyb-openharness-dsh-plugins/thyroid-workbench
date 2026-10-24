# 变更记录

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
