# 家族结构素材（family-landscape）· THY DIFF-MATRIX 全量化与 M2 原型准备

日期：2026-10-24。状态：调研笔记，供 DIFF-MATRIX §二全量行与 M2 原型 PAGES/SUBPAGES 设计引用；不是签认产物。
素材边界（重要）：

- **移植样板 = `/Users/qinxiaoqiang/Downloads/cervical-workbench`**（VERSION 0.1.1，DEV-REQUIREMENTS §二指定；原型停在 `prototypes/v0.2/`，client 链路 482 行源码 / 488 行生成物，为家族装机验证过的 customFrame 底本）。
- **成熟基准 = `/Users/qinxiaoqiang/Downloads/breast-cancer-workbench`**（VERSION 0.12.0，8 一级 / 27 二级，实测 `prototypes/v0.3/app.js` PAGES/SUBPAGES 常量与 SPEC §2/§3 一致）。
- cervical 与 breast 两仓**都没有 DIFF-MATRIX 文档**（全目录核对无命中）；cervical 的"刻意不同"自查写在 `docs/SPEC.md` §3/§4，breast 的 L1–L10 落点取自 SPEC §2/§3 + 家族契约 26 号（THY 本地已有拷贝 `docs/26-CANCER-FEATURE-LINES.md`）。
- THY 侧已读：`docs/PATIENT-FLOW.md`（三流骨架）、`docs/SCENARIOS.md`（S01–S13 一期 + S14–S17 二期）、`docs/DEV-REQUIREMENTS-2026-10-24.md`、`research-notes/medical-constraints.md`（主题 1–10）、`research-notes/user-research.md`（F 层困惑句 + H1–H8 假设）、`docs/BRIEF.md`。
- **THY 仓现状警示（本轮实测）**：`dsh/` 仅 `index.js` 骨架、**无 `schema/` 目录**、无 prototypes；`cordis.patch.yml` 已本地化（`dshHomePath('thyroid-workbench')`）、`research/` 已是 `thyroid-cancer`——但 **`DEV-REQUIREMENTS-2026-10-24.md` 是 MPM 轮残留未本地化**（H2 写 `mesothelioma-workbench`、R5 写 `research/mesothelioma-cancer/`、"本癌种专属（THY）"表里是 M1–M7 胸水/mMRC/石棉/RECIST 内容、"我替你定的默认值"含"赔偿材料经办/生存期短"）。THY 真正的专属约束（下文记 T1–T7）尚无文件承载，SCENARIOS 只散引了 T2/T3 两个标号——**G1 前必须重写该文件，否则按 MPM 口径交付会与"长程终生随访"语境全面冲突**。
- 格式参照 MPM 仓 `research-notes/family-landscape.md`（七部分结构），内容全部按 cervical+breast+THY 语境重做。

---

## 一、cervical 一级/二级导航全集 + L1–L10 映射

实测口径（`prototypes/v0.2/app.js` L54–86 常量）：**12 个一级 / 38 个二级**。app.js 头注明写"12 个一级页：SPEC §4 的 11 个 + 「资料库」（家族脚手架要求）"——资料线独立成一级是 cervical 对家族 L9 的做法（后长成「病情整理」5 子页）。设置不占一级（弹窗）。SPEC §4 草案本身是 11 一级（差异自查：两个专属一级页、筛查与预防刻意降为子页）。

| 一级 | 二级页签全集（SUBPAGES） | 职责一句 | 关键组件/口径 |
| --- | --- | --- | --- |
| 看板 dashboard | —（0） | 分期、路径、长期影响与随访放在一起 | 定调条→「现在可以做」→**放疗长期影响状态卡**→随访卡→接下来/最近变化；任务卡跳转 go-* 动作 |
| 病情整理 records | 资料库 / 整理草稿·核对 / 病情档案 / 指标检测 / 病情汇总（5） | 上传→解析→确认指标→入库；接受之前都只是候选 | DOCS/CANDS 双轨；候选 accept 前不进正式数据；family L9 落点 |
| 我的分期 stage | 分期档案 / 病理与分子 / 会诊与二次意见（3） | FIGO 2018 只记录不自算（IIIC1/IIIC2、r/p） | stage_rows 版本链留旧分期；molecular 四态 ok/na/warn/pending |
| 治疗历程 treatment | 治疗路径 / 手术记录 / 放疗疗程 / 系统治疗（4） | 路径三选一（手术/根治性放化疗/系统治疗） | pathway_rows 改过留旧不覆盖；rt_rows EBRT 与后装分列、禁"总剂量"合成列 |
| 性与生育 fertility | 生育档案 / 生育保留记录 / 卵巢与月经 / 性健康（私密）（4） | 生育是记录不是承诺 | cervical 独有线；sexual_rows/vagina_rows `is_private` 默认 1（家族首个默认私密模块） |
| 放疗与长期影响 late | 放疗后事件 / 淋巴水肿 / 阴道与扩张 / 绝经与骨健康（4） | 放疗结束后的问题按时间记 | cervical 独有线；不给分级建议不推产品 |
| 检查与指标 labs | 肿瘤标志物 / 细胞学与 HPV / 影像随访（3） | SCC-Ag 只对鳞癌有意义 | 口径 E：SCC-Ag 显示由 histology 决定（check 脚本比对）；细胞学只存原文无重判读 |
| 病情一图秀 timeline | 数值曲线 / 分类与事件 / 数据口径（3） | SCC-Ag、体重与阴道狭窄放回同一时间轴 | 数值线 + 分类节点不连线；state.sel 默认 2 数值 + 1 分类 |
| 营养支持 nutrition | 进食量记录 / 补充剂与医嘱（2） | 记"吃了多少"，不给食谱不给剂量 | 家族骨架 |
| 心理支持 mind | 当下感受 / 身体形象与亲密关系 / 母亲身份与家庭沟通（3） | 默认只属于你 | viewpoints 私密；私密展开跨页自动收回（state.privateOpen） |
| 复诊准备 review | 复诊节奏 / 三类随访节点 / 筛查与预防 / 就诊准备（4） | 该带什么该问什么提前写下 | 筛查与预防刻意降为子页防变科普页；导出 Markdown |
| 临床研究 trials | 2026 线索 / 已收藏 / 入组问题（3） | 线索不是推荐 | TRIALS 卡 + topic 筛选 |

**与 26 号 L1–L10 的映射（cervical 实排）**：

| 26 号线 | cervical 落点 | 备注 |
| --- | --- | --- |
| L1 看板 | 看板（0 二级） | 四点位；长期影响状态卡为特色位 |
| L2 疾病本体 | 我的分期（3 二级） | FIGO 分期是宫颈癌的"起点" |
| L3 治疗与决策 | 治疗历程（4 二级） | 路径三选一 + 后装是独有字段 |
| L4 指标分析 | 检查与指标（3 二级）+ 病情整理·指标检测 | SCC-Ag 组织学条件显示 |
| L5 安全与症状 | 放疗与长期影响（4 二级） | 独立整线（专属） |
| L6 营养与体重 | 营养支持（2 二级） | 骨架 |
| L7 心理与家庭 | 心理支持（3 二级）+ 性与生育·性健康（私密） | 母亲身份为专属子页 |
| L8 复诊与随访 | 复诊准备（4 二级） | 三类随访节点（细胞学+SCC-Ag+影像） |
| L9 资料与导出 | **病情整理（5 二级，独立一级）**+ 就诊准备子页 | 家族脚手架要求 + cervical 特色 |
| L10 试验与线索 | 临床研究（3 二级） | 骨架 |
| 横切层 | 病情一图秀（3 二级）+ 私密默认过滤 + 指南出处 | 一图秀带二级是 cervical 与 lymphoma/GBM 的差别 |

---

## 二、cervical schema 表分组与专属表清单

共 **35 张表**：`0001_initial.sql` 34 张（grep 实数）+ `0002_profile_meta.sql` 1 张；`schema/freeze-contract.md` sha256 冻结，加结构只能新增迁移（`scripts/check-schema.mjs` 拦截改 0001）。

| 组 | 表 | 职责一句话 |
| --- | --- | --- |
| 档案级（2） | `subjects` | 患者档案：headline/stage/mindset 三个"一眼看到"标量 + histology（决定 SCC-Ag 显示）+ hpv_status + dash_keys/path（JSON 数组） |
| | `section_titles` | 分节标题表化（key/ord）——食管癌那轮 `*_title` 列返工的教训，加一节只加一行 |
| 指标（3，通用） | `metrics` | kind: numeric/grade/qual；分类指标 unit 必须 NULL、dec NULL |
| | `metric_points` | v_num 可空 + v_text 保分类原值 + src 来源 |
| | `molecular` | 分子四态 state：ok 已检测 / na 未检测 / warn 需关注 / pending 待出（**未检测≠阴性**）；宫颈癌词表 = PD-L1 CPS、p16、MMR、HER2（腺癌） |
| 病情与时间轴（4，通用） | `events` | 一图秀事件 {d,label} |
| | `rhythm` | 随访节奏（item/freq/guideline/next） |
| | `cycles` | 周期计划/实际 |
| | `treatment_lines` | 治疗线容器 |
| 宫颈专属（20，勿互相抄回） | `stage_rows` / `pathology_rows` / `pathway_rows` / `surgery_rows` / `rt_rows` | FIGO 分期（IIIC r/p，TEXT 原样抄）、病理、路径三选一版本链、手术范围、EBRT+后装分列 |
| | `late_effect_rows` / `lymphedema_rows` / `vagina_rows` / `menopause_rows` / `hormone_rows` | 放疗长期影响五件套：肠膀胱事件、淋巴水肿、阴道狭窄与扩张（is_private 默认 1）、绝经症状、激素替代医嘱留痕 |
| | `fertility_rows` / `fert_surgery_rows` / `ovary_rows` / `sexual_rows` | 生育档案、生育保留手术（含随访要求原文位）、卵巢功能、性健康（is_private 默认 1） |
| | `cytology_rows` / `hpv_rows` / `imaging_rows` / `screening_rows` | 细胞学与 HPV 只存 result_text 原文（无正常/异常枚举列）、影像、筛查史 |
| | `nutrition_rows` / `supplement_rows` | 进食量、补充剂与医嘱 |
| 通用尾段（5） | `viewpoints` / `trials` / `documents` / `candidate_fields` / `demo_meta` | 看法（恒不是结论，无 is_conclusion 列）、试验收藏、人工归档、解析候选、演示元数据 |
| 迁移件（0002） | `profile_meta` | 档案元信息扩展 |

cervical 独有五条口径（写死在 0001 头注释，读模型与前端都按此执行）：**A** FIGO 只记录不自算（不设 TNM→FIGO 推导列或触发器，IIIC 细分 TEXT 原样抄）；**B** EBRT 与后装分列、禁"总剂量"合成列（剂量学不可相加）；**C** 细胞学/HPV 只存原文（无正常/异常枚举列，防界面重判读）；**D** 性与生育默认私密（sexual_rows/vagina_rows is_private 缺省 1，读模型默认过滤，导出层不得包含）；**E** SCC-Ag 只属鳞癌（数据层不拦，check 脚本比对 metrics.key 与 histology）。家族四契约同段：看法恒不是结论、四点位 NULL≠0（宫颈癌不做四点位留白）、更正只新增版本、事实四层不合并（文档/候选/记录/指标分表）。

THY 借鉴点：cervical 的 A（分层只展示医生标签）可直接套 T1；B 的"分列禁合成"思路对应 THY 的 **Tg 与 TgAb 必须同测、TgAb 阳性时 Tg 不可比**（趋势可比性口径要进 schema：试剂/方法变更列）；D 的私密缺省对应 THY 的妊娠计划/夫妻接触限制/情绪记录。

---

## 三、cervical 客户端链路结构（M5 移植底本）

链路：**`src/client.js`（482 行，手写唯一源）→ `scripts/build-client.mjs`（116 行，零依赖字符串替换）→ `lib/client.js`（488 行，生成物勿手改，`--check` 兜同步）**。为什么生成不手抄：面板参数、接口前缀、版本、仓库各自只有一份来源，生成后由 `npm run check` 的 `--check` 拦漂移。`build-client.mjs` 替换完还回扫 `__[A-Z_]+__` 残留占位（静默 undefined 防线）+ canonicalRepository 强校验 `https://github.com/owner/repo`。

**src/client.js 段落（customFrame 外壳，M5 移植时整段保留、只换品牌）**：

1. 装载壳：`window.__ModuleLoader__.load({ id: '__PKG_NAME__', factory(require) })`；无 loader 静默退出。
2. 常量段：TITLE / PANEL_TITLE / SUBTITLE / DESCRIPTION + 注入的面板参数（BUSINESS_SIDE/WIDTH、CUSTOM_FRAME、AGENT_DEFAULT/MIN/MAX/STEP、NARROW_BELOW、DRAWER_MAX）。
3. 宽度记忆：clampWidth/snapWidth（对齐 ratioStep 0.02，避免 33.7%）、loadWidth/saveWidth → localStorage。
4. 样式段：全部内联 style 对象（rootStyle/headerStyle/brandStyle/verStyle/hintStyle/paneStyle/splitterStyle/buttonStyle/ghostStyle…），主色 `#18AFA5`（青）配中性冷灰。
5. 会话判定：currentSession/ownsSession/ownedSession（官方 dsh-site-selection 同款，含 snapshot 兜底）。
6. **原生草稿桥**：fillDraft 只填入不发送（校验 ownedSession、occurrences/phase 防引用冲突）；pendingDraft 队列存 DRAFT_QUEUE_KEY，Panel 内 500ms 轮询 flushDraft，composer 未就绪留队重试。
7. onboardingPrompt：5 行开场白（本机资料整理、不提供诊疗建议、分工声明、"看法不是医生结论"）。
8. Panel 组件：`<header>` 顶栏（首个子元素，`--dsh-frame-leading-clearance` 避让 macOS 窗口按钮；品牌+版本 chip+提示+「AI 对话/收起」按钮）→ iframe 业务区（8s broken 兜底可重试）→ `<aside>` 原生会话**始终挂载**只 display 显隐 → splitter（鼠标拖 + 键盘 ←/→/Home/End，25%–45%，role=separator + aria-valuenow）→ 窄屏（**容器宽** ResizeObserver <760px，非 window.innerWidth）转覆盖抽屉 → postMessage `cervi:agent-draft`（校验 event.source===iframe.contentWindow + 同源，截 8000 字）。
9. apply/register：title/panelTitle/icon 🪷/repository/audience/requirements/initialization:'empty'/embedded:true/version/layout{businessSide,businessWidth}/customFrame；`inject: ['desktopWorkbenches','sessions']`。

**品牌变量注入点清单（M5 移植"换什么"，THY 照单）**：

| 类别 | 项 | cervical 现值 | THY 应取 | 来源 |
| --- | --- | --- | --- | --- |
| 构建注入（14 个 token，改各自源头即可） | `__PKG_NAME__` | @xyb-community/cervical-workbench | @xyb-community/thyroid-workbench（已定） | package.json name |
| | `__REPOSITORY__` | github.com/xyb-openharness-dsh-plugins/cervical-workbench | thyroid 同款 owner/repo（强校验 https://github.com/owner/repo） | package.json repository |
| | `__API_PREFIX__` / `__UI_ENTRY__` | /api/cervical、/api/cervical/ui | /api/thyroid（全仓 API 路由由它派生） | dsh/routes.js |
| | `__VERSION__` | 0.1.1 | 按 THY 版本簿记 | lib/version.js（← VERSION 文件） |
| | `__BUSINESS_SIDE__`/`__BUSINESS_WIDTH__`/`__CUSTOM_FRAME__` | left / 0.65 / true | 同值（0.65 两条理由在 layout.js 注释） | lib/layout.js PANEL |
| | `__AGENT_DEFAULT__/MIN/MAX/STEP/NARROW_BELOW/DRAWER_MAX__` | 0.35 / 0.25 / 0.45 / 0.02 / 760 / 420 | 同值（HOST_LIMITS 0.25–0.7 宿主强校验） | lib/layout.js AGENT_PANE |
| src/client.js 手写品牌（8 处） | TITLE / PANEL_TITLE / SUBTITLE / DESCRIPTION | 小莲宝 CerviPal / 小莲宝宫颈癌工作台 / 本机数据 · 记录不是诊断 / …… | 「小蝶宝 ThyPal」等（DEV-REQUIREMENTS 默认占位，发布前可改） | 手改 |
| | WIDTH_KEY / DRAFT_QUEUE_KEY | cervip.pal.cervical.agent-pane.v1 / cervip.pal.cervical.initial-drafts.v1 | 换 thyp.pal.thyroid.* 类前缀（G1 定） | 手改（localStorage 键） |
| | 消息类型 | `cervi:agent-draft` | `thy:agent-draft` 类（业务侧 postMessage 两端同改） | 手改 |
| | icon / 色板 | 🪷；#18AFA5 主色、#28605c 深青、#f2f8f7/#f5faf9 底、#e2efec 边、#158f87 提示、#7d9490 版本字、#c4e2dd splitter 焦点 | 全套换肤（THY 候选色 G1 定，见 §六） | 手改（rootStyle/headerStyle/brandStyle/buttonStyle/ghostStyle/note/drawer 阴影/splitterFocus） |
| | register 元数据 | audience '宫颈癌患者与照护者'、author、requirements、onboardingPrompt 5 行、Fallback 与顶栏 hint 文案 | 按 THY 双主体重写 | 手改 |

`scripts/build-client.mjs` 本身**零癌种内容**，可直接复用；`lib/layout.js` 的 PANEL/AGENT_PANE/HOST_LIMITS 结构与注释（customFrame 判定依据、0.65 的两条理由）也是移植底本。THY 仓 `dsh/` 目前只有 index.js 骨架——`server/routes/store/import/export/readmodels/settings/mineru/layout/workbench/demo` 十件都要从 cervical 平移（见 §七）。

---

## 四、breast 基准 L1–L10 做法摘要（小粉宝 0.12.0：8 一级 / 27 二级）

一级全集：看板 / 病情整理 / 病情一图秀 / 临床 / 营养支持 / 心理支持 / 全程与康复 / 收藏与回顾（实测 `prototypes/v0.3/app.js` 与 SPEC §3 一致）。

| # | 线 | breast 基准做法 | 出处 |
| --- | --- | --- | --- |
| L1 | 看板 | 单页：当前阶段（**用户选**）、一件事、上肢差值提醒、最近变化、安排、问题入口；不做自动判定阶段 | SPEC §2 |
| L2 | 疾病本体 | 病情整理·病情档案：病理转录、标本、指标序列；报告原文可回溯、自动判读不做 | SPEC §2/§3 |
| L3 | 治疗与决策 | 临床·治疗历程（计划 vs 实际、方案与药物）+ 全程与康复"术后恢复三阶段"话题（D15 定名） | SPEC §2/§3 |
| L4 | 指标分析 | 病情整理·指标检测：分组卡 + CTCAE 分级徽章 + 背面区间 + needsUln（×ULN 型需化验单参考上限） | 26 §3.1、23 号 |
| L5 | 安全与症状 | 全程与康复·上肢与淋巴水肿独立主题；四点位测量与差值（缺健侧不生成差值）；症状强度记录 | SPEC §2/§3 |
| L6 | 营养与体重 | 独立一级 3 二级：当下困扰 / 进食与体重 / 建议与回顾；体重进指标、只做趋势无 CTCAE 界限 | SPEC §2、23 §8 |
| L7 | 心理与家庭 | 独立一级 4 二级：当下感受 / 我的记录 / 支持资源 / 身体与亲密；**主体（患者/照护者）区分**、私密标记、敏感话题入口（HVT §4.5） | SPEC §2/§3 |
| L8 | 复诊与随访 | 全程与康复·近期安排 + 就诊准备 | SPEC §2 |
| L9 | 资料与导出 | **收藏与回顾独立一级**：问题清单版本、快照、Markdown 导出、源变标「已过时」；病情整理承载导入+草稿核对+解析 | SPEC §2 |
| L10 | 试验与线索 | 临床·试验线索（一期虚构样例仅作界面演示，真实登记库二期） | SPEC §2 |
| 横切 | 一图秀 | 多指标时间轴、治疗条、缩放与时间窗、点详情回源、3D 翻转卡 | SPEC §2 |

**对 THY 直接可借的三条 breast 立场（SPEC §4.5，HVT 补丁）**：

1. "LVEF 与骨密度只做**与治疗同窗的记录**，不做毒性判定"——THY 的**骨密度/房颤监测**（长期 TSH 抑制风险）逐字同构：记录数值+日期+机构，页面常显"是否调整由治疗团队决定"。
2. "内分泌副作用**记录体验不做归因**；强度轨道呈现，不画成趋势曲线"——THY 的抑制过度/不足症状日记（心悸/怕热/乏力/便秘）同构，且 THY 更要防"症状=剂量错了"的自判。
3. "生育与性健康是**可选话题不是必填表**；默认私密，三处过滤"——THY 的妊娠与生育线沿用；breast 还有"术式是独立字段不与治疗混写"→ THY 手术范围（腺叶/全切/颈清）独立字段同构。

判定纪律（26 号）：HCC 曾因"营养一张表、心理完全没有、指标无卡无分级、二级为 0"被判结构性不足——THY 走查时逐线过同一张表。

---

## 五、家族通用件 vs 必须癌种化部位

**通用骨架（换癌种不换结构）**：

| 件 | 出处 | 要点 |
| --- | --- | --- |
| 三层结构 线→页→卡 | 26 §1 | 一级 8–10 / 二级 24–30；二级为 0 的一级 ≤2；单线二级 ≤6；<8/<20 直接判结构性不足 |
| customFrame 外壳 | cervical src/client.js、20 号、lib/layout.js | businessSide/0.65 + 会话面板 25%–45% 可拖；顶栏 AI 按钮、splitter、宽度记忆、草稿桥、始终挂载、窄屏抽屉——M5 整段移植 |
| 看板四点位 | SPEC 家族段 | 定调条→「现在可以做」→特色状态卡→随访卡→接下来/最近变化 |
| 一图秀 | 16 号 R1–R12 | 三合同 + 单点不连线、治疗条分层、末点避让、minmax(0,1fr) |
| 3D 指标卡翻转 | 16 §2、19 §4 | data-flipped 唯一开关、固定高度、reduced-motion 降级 |
| 指标分组 + CTCAE 分级 | 23 号 | 绝对阈值 vs ×ULN（needsUln）；分类卡（TI-RADS/分级）不进趋势 |
| 私密=数据结构属性 | 26 §4.3、cervical 口径 D | is_private/visibility 列 + 三出口（一图秀/摘要/导出）各过滤、收敛一个函数；THY 加 author_role 双源标签（配偶 FCR≥患者，user-research §8.3） |
| 版本链只增不改 | SCHEMA-SPEC、0001 头注 | 更正=INSERT+翻 is_current；触发器禁改禁删（THY：剂量变更、分层标签变更、TSH 目标变更都是版本链） |
| 分节标题表化 | cervical `section_titles` | 教训件：不用 subjects 上的 *_title 列 |
| 设置三区 / 两区导出 / 试验线索卡 / MinerU 管线 | SETTINGS-DESIGN、29 号、18 号 | 拒根/桌面根、Token 三态；fact/view 分区；失败不产候选 |
| **30-RESPONSIVE-RULES** | THY 本地已有两份：`docs/30-RESPONSIVE-RULES.md`（病种无关 starter 版）+ `docs/RESPONSIVE-RULES.md`（GBM v0.1.5 带病种示例版） | 接入点：①业务区视口=iframe 宽（AI 面板展开后 @media 量到的就是业务区宽）；②六条硬规则（标签+值+说明纵向堆、grid+minmax(0,1fr)、行内标签不做 flex item、min-width:0、横向滚动配 .scroll-hint、短 token nowrap）；③断点只有 1180/900/600 三档；④验收=`npm run probe:resp`（多档宽 × 一级页出数字）+ `test/responsive.test.mjs`。移植动作：`scripts/probe-responsive.mjs` 的 SCAN 段抄入、`#main` 与页面 hash 换 THY 选择器。⚠️ THY 本地 RESPONSIVE-RULES.md 的示例词（"最近 KPS / MRI / 激素"）是 GBM 遗留，落地时换成 THY 语境（Tg/TgAb、优甲乐剂量、TI-RADS） |
| 工程件 | lib/version.js + build-version.mjs、freeze-contract、check-* 族 | VERSION 唯一来源；迁移哈希冻结；无头实测出数字 |

**必须癌种化（不许换名复用）**：品牌三档色与色板（青 #18AFA5 全套，见 §三清单）；指标字典（SCC-Ag/细胞学/HPV → **Tg/TgAb/TSH/FT4/FT3/血钙/PTH**；TgAb 阳性时 Tg 不可比是 THY 特有口径，试剂/方法变更要留痕）；分子词表（PD-L1 CPS/p16/MMR/HER2 四态 → **BRAF/RET/RAS 三态：检出/未检出/未检测，未检测≠阴性**）；20 张 *_rows 专属表全换（手术范围、声音日记、钙磷 PTH、RAI 治疗记录、隔离防护 checklist、剂量变更、TSH 目标、超声、复发事件、妊娠状态……见 §六）；demo 画像（histology 鳞/腺/腺鳞 → **乳头状/滤泡状/髓样/未分化四型**，MTC/ATC 主界面切报告原文模式）；治疗条形状（路径三选一+后装 → 手术+RAI+调药的**年度长程节奏**）；随访节奏（细胞学+SCC-Ag+影像三类 → **Tg+TgAb+颈部超声，6–12 个月、终生**）；试验检索关键词（RET 融合/塞普替尼/索拉非尼/仑伐替尼语境；THY 只走在线通道，离线语料仅胰腺癌覆盖）；check-wording 红线词表（THY 加 T1–T7 词族，见 §六.4）；API 前缀与 routes。

---

## 六、THY 结构建议草案（M2 原型候选，待 G1 讨论）

### 6.1 设计输入对齐

- **PATIENT-FLOW 三流反推**：流一（手术与病理/并发症）→ 线 2+3；流二（碘治疗与调药）→ 线 4+5；流三（终生随访）→ 线 5+10。三条流全部有两条以上线承接，反推原则满足。
- **THY 五大特殊语境的结构化落位**：长程终生随访（年度节奏）→ 线 5 随访日历按"治疗应答分层递减密度"（H2）+ 线 10；碘131 治疗档案（家族独有）→ 线 4 独立整线；TSH 抑制剂量管理 → 线 5 后半（G1 可拆）；妊娠期场景 → 线 6（与 RAI 禁忌联动的状态机）；并发症双线（声音/低钙）→ 线 3 双轨道并列。
- **T1–T7 红线（重构版，待 G1 签认进 DEV-REQUIREMENTS 重写件）**：THY 现行 DEV-REQUIREMENTS 的"本癌种专属"表是 M1–M7（MPM 残留），按 SCENARIOS 的"不做"条款重构七条——**T1 分层判定归医生**（ATA 初始/动态反应分层只展示医生维护标签+变更史，不自动判级；S01）；**T2 不建议调整剂量**（优甲乐/左甲状腺素只记变更历史与医生目标，不给调药方案；S03）；**T3 不做碘131 适应症判断**（高危/中危/低危推荐语境只引用指南原文；S04）；**T4 不判复发**（Tg 升高≠复发、正常≠没事，趋势向上→报告医生；S05）；**T5 不判 TI-RADS**（超声分类存体系名+原文，产品不自评；S06）；**T6 不判神经/旁腺损伤**（声音与低钙的暂时/永久标注由医生维护；S02）；**T7 不做"可以不查"暗示**（随访疲劳用轻提醒+年度总结，不做依从性判定；S08）。

### 6.2 一级 10 条候选线（覆盖 T1–T7 与 S01–S13）

| # | 候选线名 | 接哪句患者原话 | L 线 / 红线 | 与 cervical（及 breast）的刻意不同 |
| --- | --- | --- | --- | --- |
| 1 | 看板 | "我现在整体什么情况？这半年该做什么？"；照护者："下次抽血约在哪天？" | L1 | 沿用四点位，特色状态卡=**并发症双线状态卡（声音线 + 低钙线，暂时/永久标注）+ 下次随访倒计时**（cervical 是放疗长期影响卡；breast 是上肢差值卡）；双主体入口（本人/代记） |
| 2 | 我的瘤与分层 | "乳头状癌 VI 期是什么？""ATA 低危什么意思？为什么 50 岁以下有转移也算 Ⅰ 期？" | L2；T1 | cervical 叫「我的分期」（FIGO 库）；THY 改**病理四型（乳头状/滤泡状/髓样/未分化）+ AJCC 55 岁划线分期 + ATA 初始分层与动态反应分层（医生标签）+ 分子三态（BRAF/RET/RAS，未检测≠阴性）**——THY 的"分层比分期更重要"（分层决定 TSH 目标与碘治疗），MTC/ATC 自动切报告原文模式；复发与转移事件也在此线（发现日期/部位/确认方式） |
| 3 | 手术与并发症 | "手术后声音哑了""手麻、口周发麻" | L3+L5；T6 | 对位 cervical「放疗与长期影响」：THY 的长期影响起点是**手术**不是放疗；**声音线（嘶哑分级+饮水呛咳+喉镜原文）与低钙线（血钙/PTH 化验+麻木抽搐打卡+钙剂骨化三醇用药）双轨道并列**为家族独有结构；颈肩康复与疤痕（颈清后）收此线 |
| 4 | 碘131 档案 | "碘131 要不要做？要隔离几天？""5 天内不能抱孩子是什么意思？" | L3 延伸；T3 | **家族独有整线**（无任何家族成员有核素治疗）：RAI 治疗记录（清甲/辅助/清灶、mCi 剂量、Rx-WBS 原文）+ **隔离防护日历（接触对象×天数 checklist 状态化，按家庭成员构成快照触发）**+ 低碘饮食与口干/唾液腺 + 备孕间隔联动（男 2 月/女 6–12 月） |
| 5 | 随访与调药 | "半年一次 Tg、一年一次超声，要跟一辈子？""优甲乐为什么又加减量了？" | L4+L8；T2 T4 T5 T7 | cervical 影像只是子页、breast 无调药线：THY **长程随访是主轴**——随访日历按"治疗应答分层"展示递减密度（年度语境，非周期式）+ Tg/TgAb 趋势（TgAb 阳性时 Tg 不可比的口径卡）+ 颈部超声并列（TI-RADS 原文/测量/当时 Tg 三列）+ **剂量时间线与 TSH 目标原文并列**（医生维护区间）+ 骨与心血管监测（同 breast §4.5 LVEF/骨密度"同窗记录不判定"立场） |
| 6 | 妊娠与生育 | "备孕要等碘治疗后多久？""孕期优甲乐要加量吗？" | L7 延伸（C1–C6/H5） | cervical 有「性与生育」（生育保留手术记录）；THY 语义完全不同：**妊娠是与碘治疗禁忌联动的状态机**——备孕 RAI 冷却期倒计时、孕期 LT4 加量与每 4 周甲功提醒、产后回调与 6 周复查、Tg/超声顺延至产后的说明卡；孕期自动屏蔽碘治疗入口并显禁忌提示 |
| 7 | 病情一图秀 | "变化发生在哪一步" | 横切层 | 骨架同构；默认选线换 **Tg/TSH 数值线 + 声音分级/低钙事件分类节点**（不连线） |
| 8 | 营养与生活 | "TSH 抑制期老饿、心悸，能吃点什么？"；"脖子上的疤…" | L6 | 骨架同构 + THY 语境：TSH 抑制期代谢与体重、**症状日记（心悸/怕热/乏力/便秘按强度轨道，不做归因）**、补钙与服药间隔管理（与左甲状腺素 ≥4h） |
| 9 | 心理与家庭 | "都说 good cancer，怎么没人当真？""我女儿要不要查 RET？" | L7 | cervical 专属子页是"母亲身份"；THY 改**遗传与家系（MTC-RET 胚系，家属只加提示不加判定，26 §5）**+ 配偶 FCR 双源独立记录（user-research §8：配偶代报会被自身焦虑染色）+ 随访疲劳与"good cancer"孤立感话题 |
| 10 | 复诊与资料 | S07 复诊准备；S12 文档导入；S11 "还有没有我能参加的研究" | L8 尾+L9+L10 合并（GBM/MPM 同款） | 对 cervical 拆「复诊准备」「病情整理」「临床研究」三条：THY 合并为一条 4 子页；两区导出 private 过滤同家族；MinerU 六部件按 18 号 |

### 6.3 二级 30 个候选页签

| 一级 | 二级候选 | 职责一句 |
| --- | --- | --- |
| 看板（0） | — | 双主体四点位 |
| 我的瘤与分层（4） | 病理与分层 / 分子与基因 / 复发与转移事件 / 报告原文 | 四型+AJCC+ATA 双层（医生标签）；三态矩阵（未检测≠阴性）；部位/确认方式/应对路径只列不荐；逐项回原文 |
| 手术与并发症（4） | 手术记录 / 声音线 / 低钙与钙磷 / 颈肩康复与疤痕 | 术式枚举+IONM；嘶哑分级+呛咳+喉镜原文；血钙/PTH 序列+症状打卡+用药；颈清后锻炼打卡+疤痕照片时间线（可选本地） |
| 碘131 档案（4） | RAI 治疗记录 / 隔离防护日历 / 低碘与口干 / 治疗后扫描与反应 | 清甲/辅助/清灶+剂量+机构；接触对象×天数 checklist+家庭成员快照；饮食起止+唾液腺症状日记；Rx-WBS 原文+口干等反应留痕 |
| 随访与调药（6） | 随访日历 / Tg·TgAb 趋势 / 颈部超声并列 / 剂量时间线 / TSH 目标与甲功 / 骨与心血管 | 分层递减密度的年度日历+轻提醒；双指标+试剂可比性口径；TI-RADS 原文/测量/当时 Tg 三列无判读；变更历史版本链；医生维护区间+FT4/FT3 序列；同窗记录不判定 |
| 妊娠与生育（2） | 备孕与 RAI 冷却期 / 孕期与产后管理 | 冷却期倒计时+间隔说明（以医生意见为准）；孕期加量与 4 周抽血提醒+产后回调+Tg 顺延说明卡 |
| 病情一图秀（0） | — | 数值线 + 声音/低钙分类节点 |
| 营养与生活（3） | 当下困扰 / 进食与体重 / 症状日记 | TSH 抑制期语境三说明；体重进指标联动剂量变更；强度轨道不画曲线不归因 |
| 心理与家庭（3） | 当下感受 / 遗传与家系 / 支持资源与照护者 | 私密默认；RET 胚系与一级亲属提示（医生发起）；配偶 FCR 双源记录+代记场景 |
| 复诊与资料（4） | 复诊节奏 / 资料库与导入 / 整理草稿与核对 / 就诊准备与导出（试验线索并入） | 终生节奏+材料清单；MinerU 管线；候选核对；两区导出（private 过滤）+ RET/靶向语境试验线索 |

合计：一级 **10** / 二级 **30**（0+4+4+4+6+2+0+3+3+4）。

### 6.4 差异化判据自查（对 26 号 §4.1 与反推原则）

- 一级 10（∈8–10）/ 二级 30（压 24–30 上限，G1 可把「症状日记」并回「进食与体重」、或「颈肩康复与疤痕」并回「手术记录」降到 28–29）；二级为 0 的一级 = 2（看板、一图秀）≤2；单线二级最大 6（随访与调药）= 上限。
- **与 cervical 并排一级名称一致率（实测）**：THY 10 条中与 cervical 12 条完全同名 = 看板、病情一图秀 共 **2 条 = 20% ≤70%** ✅；宽松口径再算部分同名（营养与生活↔营养支持、心理与家庭↔心理支持、复诊与资料↔复诊准备、我的瘤与分层↔我的分期）约 60%，仍过线。
- 与 MPM 轮草案并排：完全同名 3 条（看板、病情一图秀、复诊与资料——后者是家族合并线惯用名，保留）。
- S01–S13 全部有落页：S01→线2·病理与分层；S02→线3·声音线/低钙线；S03→线5·剂量时间线+TSH 目标；S04→线4；S05→线5·Tg·TgAb；S06→线5·超声并列；S07→线10·就诊准备与导出；S08→线5·随访日历；S09→线8；S10→线9·遗传与家系；S11→线10·试验线索；S12→线10·资料库与导入；S13→线3·颈肩康复与疤痕（气管食管受累康复语境）。S14–S17（髓样专属/儿童/未分化路径/费用）二期不占结构。
- 每条线一句原话来自 SCENARIOS/BRIEF/user-research F 层与 H 假设——**F 层是文献语境改写句，M1 访谈回填后需留痕替换**（user-research 明确 0 一手引语）。

### 6.5 已知张力（G1 决策点，写明不沉默）

1. **「随访与调药」6 个二级顶格**：TSH 抑制是 THY 五大特殊语境之一，若 M1 访谈显示"优甲乐加减量困惑"是独立高频（F4 证据强），应拆回「随访与超声」「药与 TSH 抑制」两条 → 一级变 11，需砍线或超编留痕（建议拆出的同时把「复发与转移事件」并回线5，或接受 11 级并记录理由）。
2. **「妊娠与生育」只给 2 个二级**：是全家族最薄的一条线，但它是 H5 优先验证项 + RAI 硬禁忌联动，砍掉会丢第一权重场景；若 M1 证明 Pregnancy 模式使用频次低，可降级并入「随访与调药」（孕期甲功提醒本就在抽血节奏里）。
3. **一图秀带不带二级**：cervical 给 3 个、breast/GBM/MPM 给 0 个；本草案取 0（压"二级为 0 ≤2"上限）。
4. **T1–T7 载体**：现行 DEV-REQUIREMENTS 是 MPM 残留（M1–M7），本草案 §6.1 的重构七条需 G1 签认后重写该文件（连 H2/R5/默认值一并本地化），否则词表测试（check-wording）没有 THY 红线可拦。
5. **复发与转移事件的归属**：放线 2（疾病本体，"应对路径只列不荐"）与放线 5（随访语境，"Tg 升高≠复发"）都说得通；本草案取线 2，若走查发现随访页频繁跳转再挪。
6. **品牌与色板**：「小蝶宝 ThyPal」为 DEV-REQUIREMENTS 占位默认（可回退）；THY 候选主色未定（家族已有青 #18AFA5/粉/紫莲/绿等，G1 从蝴蝶意象定三档色）。

---

## 七、移植注意（cervical 0.1.1 → THY）

**直接复用（文件级，改 ID/品牌后原样搬）**：

| 层 | 文件 | 说明 |
| --- | --- | --- |
| 客户端 | `src/client.js` + `scripts/build-client.mjs` + `lib/layout.js` | customFrame 外壳全结构（顶栏/会话/宽度/草稿桥/抽屉/broken 兜底）零癌种内容；只换 §三清单的 14 token 源头 + 8 处手写品牌；build-client.mjs 原样 |
| | `lib/zip.js`、`lib/version.js` + `scripts/build-version.mjs` | 导出打包与版本唯一来源 |
| 数据层 | `dsh/` 12 文件的形态：server/routes/store/import/export/readmodels/settings/mineru/layout/index/workbench/demo | 零依赖 http + 127.0.0.1 + 前缀改写（`/api/cervical`→`/api/thyroid`）；导入-解析-候选管线、候选 accept、导出模板、设置三区全保留。**THY 现状 dsh/ 只有 index.js，十件全要平移** |
| | `schema/freeze-contract.md` 机制 + 0001/0002 结构 | 迁移冻结与"只增不改"执行器；表内容全换（见下）。**THY 现状无 schema/ 目录，从零建但机制照抄** |
| 工程 | `scripts/check-{schema,syntax,version,wording,pack,workbench-package,install,demo-columns}.mjs`、`dev-server.mjs` | 家族检查器；wording 红线词表按 T1–T7 扩（T2 调药/T3 适应症/T4 复发/T5 TI-RADS/T6 损伤/T7 可以不查）；check-demo-columns 对 THY 新列重配 |
| 原型 | `prototypes/v0.2/` 骨架段 | PAGES/SUBPAGES/SUBTITLES 常量结构、state 模型（view/sub/sel/range/zoom/pin/flipped/privateOpen…）、hash 路由 + go-* 动作表、esc/fmtDate/delta 工具、pageHead/subnav 渲染、3D 翻面 flipCard、sidebar/breadcrumb/index.html 壳（skip-link 与 `#main` 焦点管理）、一图秀 SVG 段 |
| 样式 | `style.css` 令牌骨架 | 五组令牌结构保留，色值按 19 §9 换肤规则整组替换 |

**必须换掉（不许换名复用）**：

1. **schema 20 张专属表**：stage/pathology/pathway/surgery/rt/late_effect/lymphedema/vagina/menopause/hormone/fertility/fert_surgery/ovary/sexual/cytology/hpv/imaging/screening/nutrition/supplement_rows → THY 专属表（病理与分层、手术范围、声音日记、喉镜记录、血钙 PTH、补钙用药、RAI 治疗、隔离防护 checklist、剂量变更、TSH 目标、颈部超声、复发转移事件、妊娠状态、遗传家系提示……按 §六.3 逐页配表）。通用 14 张平移：subjects/section_titles/metrics/metric_points/molecular（词表换 **三态**：检出/未检出/未检测）/events/rhythm/cycles/treatment_lines/viewpoints/trials/documents/candidate_fields/demo_meta + nutrition/supplement 按需 + profile_meta。
2. **cervical 五条独有口径 → THY 口径重写**：A FIGO 不自算 → **分层只展示医生标签（T1），AJCC 分期只抄报告**；B EBRT/后装分列 → **声音线/低钙线双轨分列 + RAI 治疗按次分记录**；C 细胞学原文 → **TI-RADS 分类只存体系名+原文（T5）+ Tg/TgAb 试剂可比性留痕**；D 性与生育私密 → 妊娠计划/夫妻接触限制/情绪记录按 26 §4.3 visibility + author_role 双源；E SCC-Ag 条件显示 → **换 MTC/ATC 条件显示**（病理类型驱动主界面切报告原文模式，DTC 模块自动隐藏——与 SCC-Ag 同构的条件显示逻辑，条件字段换成 pathology_type）。
3. **demo 画像与指标字典**：histology 鳞/腺/腺鳞 → 乳头状/滤泡状/髓样/未分化；SCC-Ag/细胞学/HPV 序列 → Tg/TgAb/TSH/FT4/血钙/PTH + 体重；窗口与演示律照家族（化验 2–4 周一点、影像不加密；**THY 特例：随访 6–12 个月节奏的演示数据要跨多年**，与"长程"语境一致，demo 生成器时间轴按年铺）。
4. **文案全量**：SUBTITLES 12 条、看板任务卡与 go-* 跳转、页脚免责句、onboardingPrompt 5 行、Fallback/顶栏 hint——全部按 THY 立场重写（新增：T1–T7 全词族、"解释不是判断"上屏纪律、过度诊断争议"不能套用到个人"）。
5. **品牌与身份**：TITLE/PANEL_TITLE、icon（蝴蝶意象候选）、色板全套、WIDTH_KEY/DRAFT_QUEUE_KEY 前缀、`cervi:agent-draft` 消息类型（业务侧 postMessage 两端同改）、package.json name/repository（name 已定 thyroid-workbench）、cordis.patch.yml（已本地化 ✅）、API 前缀。
6. **30-RESPONSIVE-RULES 落地**：probe-responsive.mjs SCAN 段抄入 + `#main`/hash 换 THY；RESPONSIVE-RULES.md 示例词去 GBM 化（KPS/MRI/激素 → Tg/TgAb、优甲乐、TI-RADS）。
7. **DEV-REQUIREMENTS 本地化（THY 特有前置件）**：MPM 残留三处（H2 文字、R5 research 目录名、M1–M7 整表 + 默认值表）必须先重写，其中"病程=全病程（生存期短）"默认值与 THY"长程终生随访"直接冲突，改为"病程=长程（确诊至终生随访）"。
8. **试验数据源**：THY 只走在线通道（离线语料仅胰腺癌覆盖，DEV-REQUIREMENTS §四）；关键词按 RET 融合/分化型碘难治语境加权；无真实覆盖时不做入口（同 GBM 诚实边界）。

---

### 落点提示

- 本笔记 §6.2–6.3 → 填 `docs/DIFF-MATRIX.md` §二全量行与 §三自查（重名率 20% 已实测；THY 尚无 DIFF-MATRIX，本篇即其输入）；§6.3 → M2 原型 PAGES/SUBPAGES/SUBTITLES 常量；§三 → M5 客户端移植清单；§七 → DEV-PLAN 与 DEV-REQUIREMENTS 重写件。
- 待 M1 补：SCENARIOS 一手访谈回填（F 层改写句全部待替换）、breast 基准的逐线走查表（26 §7 模板）、T1–T7 词族与 check-wording 对接、妊娠模式与碘禁忌联动的状态机字段细化、Tg/TgAb 试剂可比性在 schema 的落列方式。
