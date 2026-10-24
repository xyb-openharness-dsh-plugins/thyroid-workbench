# 设计独立审查记录（DESIGN-REVIEW）· 甲状腺癌（THY）G1 设计包 + G2 原型

状态：**已完成一轮独立审查（2026-10-24）。总体判断：修订后签。** 自审与独立模型审查分开记录，本表即独立模型审查轮。

| 轮次 | 阶段/文档版本或hash | 实际模型/推理档位/审查Agent | 时间与输入范围 | 发现及优先级 | 建议/讨论项 | 用户决定与修改证据 | 未解决项 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | G1 设计包（SPEC v0.1 + SCENARIOS S01–S17 + PATIENT-FLOW + INTERACTION-DESIGN v1：13 路径+16 实体）+ G2 原型 prototypes/v0.2/（app.js sha256 前缀 0587a8281e4d3b3，构建方自报）+ research-notes 三件；git HEAD `a5ca5ef` | GLM-5.3 / 档位 max / 独立子代理（与设计主线隔离，ZCode） | 2026-10-24；输入=上列全部文档与源码 + docs/shots 抽 3 张（rai-records / followup-us / dash）+ 引用外核 2 条（PMC8579758、WCRJ e2832） | P0×0 / P1×3 / P2×6（见 §三） | 见 §三"建议"列与 §五缺口 | 待用户（本表 R1 行空置，签认后回填） | P1 三条 + §五缺口清单 |

评审重点：用户任务证据、专业视角偏差、场景取舍、完整闭环、AI 解释价值、分期、来源时效和主体/隐私。记录高优先级问题，而非只给"通过"。本表只审设计方案，不代表发布已授权、包已安装、Desktop 已加载或市场已收录（分别见 `docs/RELEASE.md`、`docs/ACCEPTANCE.md`、`docs/10-MARKET-PUBLISHING.md`）。

---

## 一、审查范围与元信息

- **元信息**：模型 GLM-5.3（推理档位 max）；评审人=独立子代理（与设计主线隔离）；日期 2026-10-24；git HEAD 短哈希 `a5ca5ef`（"G2 材料: PROTOTYPE-REVIEW"）。审查依据 = prompts/NEW-CANCER-WORKBENCH.md §七 13 项检验 + 专项 fork 残留扫描。
- **审读件**：docs/SPEC.md、SCENARIOS.md、PATIENT-FLOW.md、INTERACTION-DESIGN.md（v1.0）、DIFF-MATRIX.md、USER-RESEARCH.md、DEV-REQUIREMENTS-2026-10-24.md、PROTOTYPE-REVIEW.md、DESIGN-SESSION.md；research-notes/{user-research,medical-constraints,family-landscape}.md（全量）；规范 docs/26、22、28、30 号；prototypes/v0.2/{index.html,app.js,demo-data.js,style.css}（重点段落抽查）；docs/shots/ 抽 3 张（rai-records-demo1、followup-us-demo1、dash-main-demo1）。
- **说明**：docs/PROTOTYPE-BRIEF.md 不存在（PROTOTYPE-REVIEW.md 承担该角色），不构成缺口。

## 二、13 项检验逐条结果

| # | 检验 | 判定 | 证据（落点文件） |
| --- | --- | --- | --- |
| ① | 医生任务冒充患者 | **PASS** | SCENARIOS S01–S08 每条以患者困惑句起头（"读不懂/声音哑/加减量困惑/要跟一辈子"），动作是记录·解释·准备，非医生工作流；medical-constraints.md 纪律 1"判定一律归医生"；原型看板 8 任务卡（app.js L432-441）全是抄单/打卡/材料等患者动作，无分级/判读工具。SPEC §8"明确不做"兜底 |
| ② | 证据成立性（0 访谈标注 + 引用抽查 2 条） | **WARN** | 0 访谈三处如实声明（research-notes/user-research.md L7-8、计数表、docs/USER-RESEARCH.md"证据计数"）；引语纪律明确二级引语标注。抽查：**A1（Jensen & Pitt 2021, PMC8579758）外核属实**——综述、good cancer 反噬、"get it out"、43% 系 Buchmann 转引均与笔记一致；**B1（Bian, WCRJ 2024 e2832）存在且数字属实，但 docs 层把方向写反**（患者 65.8% > 配偶 59.6%，被写成"配偶 ≥ 患者"）→ P1-2 |
| ③ | 解释价值 vs 记录本 | **PASS** | 解释件实存：病理四型对照、AJCC 55 岁划线人话（"50 岁以下有转移也算Ⅰ期"）、ATA 初始+动态双层含义、Tg/TgAb 干扰口径卡、孕期 Tg 一过性解释（demo-data.js C 层）、年度随访语境；medical-constraints 各主题备"解释不是判断"候选文案并要求医学审核上屏。附注：H1 认知落差校准卡未显式落页 → P2-6 |
| ④ | 营养/心理完整度 | **PASS** | 非只有名称：营养 3 二级带 THY 特有内容（TSH 抑制期代谢语境、补钙与 LT4 ≥4h 间隔、症状日记强度轨道不归因，demo-data.js 有实例数据）；心理 3 二级（当下感受默认 private、遗传与家系 RET 医生答复原文留痕、支持资源与照护者+配偶 FCR 双源）；支持资源"内容 M5 实装以可核实来源为准"如实延后 |
| ⑤ | 四核心模块完整（§六清单） | **PASS** | 逐项有落点：病情整理→docs·资料库/候选核对；指标检测→followup·Tg/TSH + 手术·钙/PTH（分组单一来源 CATALOG）；一图秀→chart（数值线+分类节点不连线）；临床治疗及试验→surgery+rai 独立线+docs·试验线索（"不是推荐"常驻）；营养/心理/全程安排（随访日历）/收藏导出（两区导出 private 过滤）/Agent（10 页各 1 示例）全齐 |
| ⑥ | 双主体冲突（双源/证言/妊娠私密） | **PASS** | authorTag 双徽章（本人自记/照护者代记，app.js L204）；配偶 FCR"双源独立记录不代报"；visibility 三出口共用 sharedOnly 唯一函数（app.js L145-147，"看板摘要/导出预览/AI 上下文"）；妊娠页"按记录不判定"+冷却期倒计时"以医生意见为准"；两演示档案（陈志强自记 / 林晚秋备孕丈夫代记）覆盖双场景 |
| ⑦ | 范围适当性 | **WARN（正向）** | 10 线 30 页签压 24–30 上限、随访与调药 6 二级顶格、妊娠线 2 二级全家族最薄——6 个 G1 决策点显式列出不沉默（family-landscape §6.5，DIFF-MATRIX §三回指）；S14–S17 二期不占结构；SPEC §8 明确不做。WARN 原因：顶格结构是 G1 必须真拍板的活决策，不是既成事实 |
| ⑧ | 医学来源时效 | **PASS** | 卫健委 2022 指南全文已取得并逐主题引页码（medical-constraints 附表 S1）；ATA 2025 摘要级+待核验；**NMPA 四药（仑伐替尼/安罗替尼/多纳非尼/塞普替尼）S14 逐条"待核验"、官方批件未核不写死**，另引国家医保局谈判材料作官方级佐证；**ATA/动态分层判定归医生**（纪律 1+主题 2"分层判定完全归医生，产品仅展示医生维护标签+变更史"）；NCCN 登录墙如实标注 |
| ⑨ | S→F→A 同源（含 28 号路径与页面 key） | **WARN** | SCENARIOS S01–S13 ↔ INTERACTION-DESIGN §一 13 路径 ↔ 原型 SCENES 13 chip：落点 (view,sub) 逐一核对全部一致（S01→tumor/pathology…S13→surgery/neck），产物名一致；但按 28 号 IP2-② 判据 **7 个二级页无任何路径经过（孤儿页）** → P1-3；X2 自验"data-step 11 步"与源码唯一 data-step 目标 12 个有小出入 → P2-5 |
| ⑩ | 假设不冒充事实 | **WARN** | 机制健全：H1–H8 全部标注"设计假设"并带证据回溯列；F 层 7 组困惑句声明为文献语境改写、待访谈回填；"随访疲劳无甲状腺特异数据（未找到可靠来源）"如实；待核验原文清单显式列出并立"任一未取得前 SPEC 不写按最新指南设计"。违例一处：B1 引用方向写反并进了一级文档结论（P1-2，与②同源） |
| ⑪ | 差异化真实性（抽 2 线 vs cervical） | **PASS** | 抽查：**碘131 档案**（家族独有整线——RAI 按次建档+隔离防护日历按家庭成员快照触发+低碘与口干+Rx-WBS，cervical/breast 无任何对应物，字段全部有 demo 数据）；**随访与调药**（剂量版本链+TSH 目标原文并列+骨与心血管"同窗记录不判定"，cervical 检查与指标线无药线概念）。重名 2/10=20% 实测可信；"刻意不同"逐线写得出具体字段（family-landscape §6.2 表） |
| ⑫ | 红线（T1 判定列/T2 调药/T4 超声/T3 事实/未检测≠阴性/private 三出口/AI 候选闭环） | **PASS（原型层）** | T1：无 risk_level 计算列；riskLevels 仅为医生标签引用（demo-data.js L577），app.js L509 明示"本页不做任何风险分层计算"（schema 未建，Phase1 草案合规，断言留 M5）；T2："本台零调药建议"常驻、无建议文案；T3：RAI 页"只记已发生的事实与原文"常驻；T4/T5：超声 TI-RADS 原文照抄+"本台不自评"、分类卡不进趋势；**未检测≠阴性**：molecular explain 6 处+虚线徽章+"未检出≠未检测"辨析；**private 三出口**：sharedOnly 单函数+逐条显式勾选；**AI 候选闭环**：填草稿不自动发送（toast 明示）+候选三态（待核对/已入库/已拒收）+拒收零副作用；"不可恢复"全站 0（仅以否定句出现）。附注：check-wording T1–T7 词族要 M5 才可执行 |
| ⑬ | 交互门槛 IP1–IP10 抽查 | **WARN** | IP1 ✓（文档 v1.0 存在；但 G1 签认留痕未落 DESIGN-SESSION，见缺口）；IP2 ①✓ ②✗（孤儿 7 页→P1-3）；IP3 两处入口不同步→P2-2；IP4 ✓（13 条路径产物名可断言+截图见"回到看板"一步）；IP5 ✓（材料清单 AI 列写"—"并给红线理由）；IP6 ✓（X3 自报 32 视图 0 违规，抽 dose/feelings/prepare 每页恰 1 个显式编辑入口、表单 ≤5 字段）；IP7 部分 ✓（体重 inputmode=decimal；数字键盘组件留 M5）；IP8 ✓；IP9 ✓（手工 added() 与候选写入同一事实数组）；IP10 ✓（10 个一级页各 1 个 AI 示例，点击填入不发送） |

**专项检查 · fork 残留扫描：FAIL（轻度，非用户可见）**

- `prototypes/v0.2/style.css`：MPM 注释 3 处（L200"胸水最近事件+mMRC 现分级"、L238"石棉与材料"、L291"胸水与呼吸"）+ **死代码块** `.pleura-track/.pleura-card`（胸膜轨道）、`.exp-line/.exp-card`（石棉暴露）、`.rt-count`、`.ct-*`（CT 并列段）——经 grep 确认 app.js 零引用，为 MPM fork 死样式与注释。
- `docs/RESPONSIVE-RULES.md` L3：GBM 示例词"最近 KPS / MRI / 激素"——family-landscape §七.6 已自知"落地时换 THY 语境"但本轮未改。
- 间皮瘤/PleuraPal/StarPal/RECIST/赔偿/恶病质：0 命中。LESSONS.md 命中按豁免不计；胶质瘤/淋巴水肿/SCC 命中均为家族规范层跨癌种举例（22/15/26/24 号），非残留。
- 判定：非功能性残留（不影响红线与用户），但违背"MPM/GBM 残留必须为 0"的硬要求 → 归入 P1-1，G2 签认前清零。
- 附：DEV-REQUIREMENTS-2026-10-24.md 本体重写干净（H2/R5/默认值均已本地化为 THY 口径，"生存期短"默认值已改为"长程终生随访"），残留只在上述两文件。

## 三、问题清单（P0–P2，均带落点文件）

**P0（红线违规/证据造假级）：0 条。**

**P1（签认前必须处理）**

| # | 问题 | 落点 | 建议 |
| --- | --- | --- | --- |
| P1-1 | MPM/GBM fork 残留未清零：style.css MPM 注释 3 处 + 死样式块（pleura/exp/rt/ct 约 40 行）；RESPONSIVE-RULES.md GBM 示例词 1 处 | prototypes/v0.2/style.css L198-240、L289-326、L418-427；docs/RESPONSIVE-RULES.md L3 | 删除死块与注释、示例词换 Tg/TgAb/优甲乐/TI-RADS；清理后 grep 复扫归零并在 PROTOTYPE-REVIEW 留痕 |
| P1-2 | 证据方向写反：B1（Bian, WCRJ 2024 e2832）实为**患者 65.8% > 配偶 59.6%**，docs/USER-RESEARCH.md 发现 2 写成"配偶复发恐惧 ≥ 患者（甲状腺特异 65.8% vs 59.6%，Wu 2019 纵向）"——张冠李戴（B1→Wu 2019）且方向相反；research-notes/user-research.md §0.6"配偶 FCR 显著高于甚至超过患者本人（B2 纵向、B1 甲状腺特异数据 65.8% vs 59.6%）"同病；family-landscape §五"配偶 FCR≥患者"沿讹 | docs/USER-RESEARCH.md §发现 2；research-notes/user-research.md §0.6、§3 B1；research-notes/family-landscape.md §五 | 改写为："泛癌种配偶 FCR 可高于患者（Wu 2019，B2）；甲状腺特异数据为患者 65.8%/配偶 59.6%（Bian 2024，B1）——FCR 是双人现象，双方均需独立记录。"设计结论（ICC 双源标签第一天就要）不必变，证据句必须改 |
| P1-3 | IP2-② 孤儿页：13 条场景路径覆盖 30 个二级中的 23 个，**7 页无任何路径经过**——tumor·复发与转移事件、rai·低碘与口干、followup·骨与心血管、fertility·备孕与 RAI 冷却期、fertility·孕期与产后管理、care·症状日记、mind·支持资源与照护者 | docs/INTERACTION-DESIGN.md §一路径表；prototypes/v0.2/app.js SCENES（L79-92） | 二选一：给 7 页各补一条路径（fertility 两页是 T7 妊娠红线落点，强烈建议补——如 S04/S07 增"可跳冷却期"步、S09 增"可跳症状日记"步），或在交互路径文档写显式豁免理由并留版本痕；28 号要求 G2 走查"孤儿页=0" |

**P2（修订项，可与 G1/G2 同批处理）**

| # | 问题 | 落点 |
| --- | --- | --- |
| P2-1 | T1–T7 编号四套口径漂移：family-landscape §6.1（T4=复发、T5=TI-RADS、T6=神经/旁腺、T7=可以不查）≠ DEV-REQUIREMENTS（T4=超声、T5=双线、T6=长程、T7=双主体）≠ INTERACTION-DESIGN 头注（T3=适应症、T4=复发、T5=超声+双线、T6=可以不查）≠ app.js 头注（T3=档案、T4=复发、T5=超声+双线）。CRUD 矩阵"暂时/永久标注归医生"标"T6"与 DEV-REQ T5 冲突；七条主题覆盖全齐、无缺漏，但 M5 check-wording 词族对接前必须统一一张编号表 | docs/DEV-REQUIREMENTS-2026-10-24.md §三；docs/INTERACTION-DESIGN.md 头注与 §二 L41；prototypes/v0.2/app.js L5-12；research-notes/family-landscape.md §6.1 |
| P2-2 | IP3 入口两处不同步：S02 任务卡「记一次声音日记」看板未渲染（看板实有「今天该做什么」，文档未载）；S05「抄一次化验单」文档归照护者、实现放本人 4 入口 | docs/INTERACTION-DESIGN.md §一 S02/S05 行；prototypes/v0.2/app.js L432-441 |
| P2-3 | 文档互指小错：SPEC §4 功能码列 11 项（含 F-SET）与"10 线"及 DIFF-MATRIX §二 10 线名不同步（F-FU2 等命名无对照表）；DEV-REQUIREMENTS 称"按 family-landscape §6.4 重构"实为 §6.1 | docs/SPEC.md §4；docs/DEV-REQUIREMENTS-2026-10-24.md §三标题 |
| P2-4 | 妊娠期 LT4 加量幅度两处不一致：约 30%（user-research C4）vs 约 50%（medical-constraints 主题 9，协和患教），未互见说明；上屏前需统一或并列来源 | research-notes/user-research.md §4 C4；research-notes/medical-constraints.md 主题 9 |
| P2-5 | 自验数字口径小出入：X2"data-step 跳转 11 步"vs 源码唯一 data-step 目标 12 个（SCENES 表定义 19 个 to-* 跳转）；复跑 probe 或修口径 | docs/INTERACTION-DESIGN.md §四；prototypes/v0.2/app.js L79-92 |
| P2-6 | H1（认知落差校准卡）未显式落页：H2–H8 均可指到具体页签，唯 H1 缺落点（建议落看板定调条/我的瘤·病理与分层，文档写明） | research-notes/user-research.md §9；docs/INTERACTION-DESIGN.md §一 S01 行 |

## 四、总体判断：**修订后签**

- **G1（业务流程签认）**：可在 P1-2 证据句改写、6 个结构决策点获用户逐条拍板（含随访与调药是否拆、妊娠线是否降并、品牌与色板）后在 DESIGN-SESSION 留痕签认。设计包的医学底座、场景-红线映射、差异化论证质量高于家族前几轮（0 访谈诚实声明、NMPA 待核验纪律、G1 决策点显式列出均到位）。
- **G2（HTML 签认）**：原型红线实现、候选闭环、双主体三出口、窄宽六条经源码抽查属实，自验数字基本可信；须先完成 P1-1（fork 残留清零）、P1-3（7 孤儿页补路径或豁免留痕）、P2-1/P2-2（T 编号统一 + 入口同步）再签。G1 未签认前不进入任何生产代码（22 号闸口顺序）。

## 五、缺口（如实保留，不阻断探索）

1. **G1 签认留痕缺失**：DESIGN-SESSION.md 仍为空模板（无决策行），G1 六个决策点尚无用户拍板记录；G2 材料先行属"待审"状态而非既成事实。
2. **schema/draft 未建**（Phase1 允许）：T1"无 risk_level 计算列"、T4"超声无判读列"的 schema 断言、T7 三出口单测、check-wording T1–T7 词族均留 M5 兑现——本审查只能在原型层背书。
3. **0 真实访谈**：F 层 7 组改写句待 6–10 个中国家庭访谈回填（妊娠期夫妻配对 ×2 为特有优先项）；随访疲劳无甲状腺特异量化数据（已如实标注"未找到可靠来源"）。
4. **待核验清单在册**：NMPA 四药批件号、C-TIRADS 恶性风险数字、ATA 2025/NCCN/CSCO/CACA 全文、ThyCa 手册日期、疤痕护理与漏服补救规范级来源——"任一未取得前 SPEC 不写按最新指南设计"纪律已立，须按清单逐项销号。
5. **支持资源页**：页面与落点已定（mind·support，INTERACTION-DESIGN §二.5），可核实条目内容 M5 实装；中国患者组织可触达性待核实。
6. **品牌与色板为占位**：「小蝶宝 ThyPal」+ 湖蓝青 #2A7F8C 待 G1 拍板；localStorage 键前缀、消息类型（thy:agent-draft 类）等 M5 移植项在册（family-landscape §三/§七）。
