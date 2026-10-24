'use strict';
/* 小蝶宝 ThyPal v0.2.0 — 甲状腺癌（THY）工作台交互原型。
   所有数据来自 demo-data.js（合成演示数据）；不读写真实文件、不调用模型或宿主 API。
   页面树唯一权威：research-notes/family-landscape.md §6.1–§6.3（10 一级 / 30 二级）。
   红线（DEV-REQUIREMENTS T1–T7）：
   T1 ATA 动态风险分层只引用原文——无分层判定列，零自动分级计算，分层标签由医生维护；
   T2 TSH 抑制零调药建议——剂量时间线 + 医生目标原文并列，不出现"建议调整/加量/减量"；
   T3 碘131 独立事件档案——剂量/隔离/出院指导原文，不做适应症判断；
   T4 Tg 升高≠复发、正常≠没事——趋势向上→报告医生，本台不判复发；
   T5 超声零判读——TI-RADS 只抄报告原文/体系名，产品不自评；并发症双线（声音轨道 + 钙/PTH 指标卡）不并入趋势；
   T6 长程终生随访——年度节奏语境 + 轻提醒，不暗示可以少查；
   T7 双主体 author_role + visibility 三出口（sharedOnly 单一函数）；妊娠场景按记录不判定；MTC/ATC 一期只做"见报告原文"标注。
   未检测 ≠ 阴性（虚线徽章+常驻句）；分类节点（分层/TI-RADS）只画节点不连线。 */

const APP_INFO = {
  version: '0.2.0',
  build: '2026-10-24',
  channel: 'prototype',
  channelLabel: '交互原型 · 未接入 DSH / AI',
  brand: '小蝶宝 ThyPal',
  en: 'thyroid'
};
APP_INFO.displayVersion = `v${APP_INFO.version}`;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let uidSeq = 0;
const uid = (p) => p + (++uidSeq);
const DAY = 86400000;

/* ---------------- icons & nav ---------------- */
const icons = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  tumor: 'M12 4a5 5 0 0 1 5 5c0 2.5-1.7 3.4-1.7 5.5H8.7C8.7 12.4 7 11.5 7 9a5 5 0 0 1 5-5ZM9.5 20h5M12 8v4',
  scalpel: 'M4 20l6-6M10 14 20 4l-1 5-6 6-3-1ZM4 20h5',
  atom: 'M12 12h.01M12 3c4 3 6 6 6 9s-2 6-6 9c-4-3-6-6-6-9s2-6 6-9ZM5 8c5 0 9 2 12 4M19 8c-5 0-9 2-12 4M5 16c5 0 9-2 12-4M19 16c-5 0-9-2-12-4',
  calendar: 'M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2m-8 3h2m4 0h2',
  chart: 'M4 20V5m0 15h16M8 16l3-5 3 3 4-7',
  heart: 'M12 20.3c-4.6-2.9-7.4-5.6-7.4-9A4.1 4.1 0 0 1 12 8.4a4.1 4.1 0 0 1 7.4 2.9c0 3.4-2.8 6.1-7.4 9Z',
  mind: 'M9 21v-3H7a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3 5 5 0 0 1 10 0 3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-2v3M9 13h.01M15 13h.01',
  visit: 'M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16M9 15l2 2 4-4'
};
const icon = (k) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[k]}"/></svg>`;

/* 页面树（family-landscape §6.2/§6.3：10 一级 / 30 二级） */
const PAGES = [
  ['dash', '看板', 'home'], ['tumor', '我的瘤与分层', 'tumor'], ['surgery', '手术与并发症', 'scalpel'],
  ['rai', '碘131 档案', 'atom'], ['followup', '随访与调药', 'calendar'], ['fertility', '妊娠与生育', 'heart'],
  ['chart', '病情一图秀', 'chart'], ['care', '营养与生活', 'chart2'], ['mind', '心理与家庭', 'mind'],
  ['docs', '复诊与资料', 'visit']
];
icons.chart2 = icons.chart;
const SUBPAGES = {
  tumor: [['pathology', '病理与分层'], ['molecular', '分子与基因'], ['recurrence', '复发与转移事件'], ['reports', '报告原文']],
  surgery: [['op', '手术记录'], ['voice', '声音线'], ['calcium', '低钙与钙磷'], ['neck', '颈肩康复与疤痕']],
  rai: [['records', 'RAI 治疗记录'], ['isolation', '隔离防护日历'], ['diet', '低碘与口干'], ['wbs', '治疗后扫描与反应']],
  followup: [['calendar', '随访日历'], ['tg', 'Tg·TgAb 趋势'], ['us', '颈部超声并列'], ['dose', '剂量时间线'], ['tsh', 'TSH 目标与甲功'], ['bone', '骨与心血管']],
  fertility: [['prep', '备孕与 RAI 冷却期'], ['preg', '孕期与产后管理']],
  care: [['concerns', '当下困扰'], ['intake', '进食与体重'], ['symptoms', '症状日记']],
  mind: [['feelings', '当下感受'], ['genetic', '遗传与家系'], ['support', '支持资源与照护者']],
  docs: [['schedule', '复诊节奏'], ['library', '资料库与导入'], ['candidates', '整理草稿与核对'], ['prepare', '就诊准备与导出']]
};
const SUBTITLES = {
  dash: '把今天能做的一件事放在最前面；并发症双线、随访节奏都从这里出发。',
  tumor: '病理四型对照、ATA 分层引用医生标签；分子三态记，未检测≠阴性；解释只解释名词，不做判断。',
  surgery: '手术影响从手术那天算起：声音线与低钙线双轨道并列，暂时/永久标注由医生维护。',
  rai: '碘131 治疗按次建档：剂量、隔离天数、出院指导原文；要不要做、做多大剂量由医生决定。',
  followup: '长程随访是主轴：年度节奏日历、Tg/TgAb 口径、超声三列并列、剂量版本链与 TSH 目标原文并列。',
  fertility: '妊娠是与碘治疗禁忌联动的状态机：冷却期倒计时、孕期说明按记录不判定。',
  chart: 'Tg/TSH/体重放回同一段时间；分层与 TI-RADS 是分类节点，只画节点不连线。',
  care: 'TSH 抑制期代谢、体重与症状日记：只记事实，不做归因。',
  mind: '感受默认私密、配偶 FCR 双源独立记录；遗传与家系只列医生答复原文。',
  docs: '复诊节奏、资料库、候选核对与两区导出分开放；试验线索不是推荐。'
};

/* 13 场景直达（INTERACTION-DESIGN v1：S01–S13；HVT X1/X2 的走查锚点） */
const SCENES = [
  ['S01', '分层', 'tumor', 'pathology', [['to-molecular', 'tumor', 'molecular'], ['to-recurrence', 'tumor', 'recurrence'], ['to-reports', 'tumor', 'reports']], '分层摘要'],
  ['S02', '并发症', 'surgery', 'voice', [['to-calcium', 'surgery', 'calcium'], ['to-op', 'surgery', 'op'], ['to-symptoms', 'care', 'symptoms']], '并发症记录'],
  ['S03', '调药', 'followup', 'dose', [['to-tsh', 'followup', 'tsh']], '剂量时间线'],
  ['S04', '碘131', 'rai', 'records', [['to-isolation', 'rai', 'isolation'], ['to-diet', 'rai', 'diet'], ['to-prep', 'fertility', 'prep']], '治疗档案'],
  ['S05', 'Tg', 'followup', 'tg', [['to-tsh', 'followup', 'tsh'], ['to-chart', 'chart', '']], '口径卡'],
  ['S06', '超声', 'followup', 'us', [['to-tg', 'followup', 'tg'], ['to-questions', 'docs', 'prepare']], '并列表'],
  ['S07', '复诊', 'docs', 'prepare', [['to-schedule', 'docs', 'schedule']], '复诊摘要'],
  ['S08', '随访', 'followup', 'calendar', [['to-tg', 'followup', 'tg'], ['to-us', 'followup', 'us'], ['to-bone', 'followup', 'bone'], ['to-preg', 'fertility', 'preg']], '随访节奏'],
  ['S09', '营养', 'care', 'intake', [['to-concerns', 'care', 'concerns']], '语境记录'],
  ['S10', '遗传', 'mind', 'genetic', [['to-feelings', 'mind', 'feelings'], ['to-support', 'mind', 'support']], '医生答复留痕'],
  ['S11', '试验', 'docs', 'prepare', [['to-library', 'docs', 'library']], '收藏线索'],
  ['S12', '导入', 'docs', 'library', [['to-candidates', 'docs', 'candidates']], '候选核对'],
  ['S13', '康复', 'surgery', 'neck', [['to-op', 'surgery', 'op']], '康复打卡']
];

/* ---------------- 指标目录（与一图秀同一来源；23 号：分组单一来源） ---------------- */
const CATALOG = {
  TG: { name: 'Tg（甲状腺球蛋白）', unit: 'ng/mL', cat: '血清与甲功', color: '#2A7F8C', dec: 2, note: 'Tg 数值只照抄化验单并标注状态（抑制/刺激）；解读归内分泌医生——Tg 升高 ≠ 复发，正常也不等于没事。' },
  TGAB: { name: 'TgAb（抗 Tg 抗体）', unit: 'IU/mL', cat: '血清与甲功', color: '#5B9AA6', dec: 0, note: 'TgAb 阳性时 Tg 数值不可比；口径卡见「Tg·TgAb 趋势」页签。' },
  TSH: { name: 'TSH（促甲状腺激素）', unit: 'mIU/L', cat: '血清与甲功', color: '#1B5D68', dec: 2, note: '本台不计算"是否达标"——目标区间由医生维护，原文并列见「TSH 目标与甲功」页签。' },
  FT4: { name: 'FT4（游离甲状腺素）', unit: 'pmol/L', cat: '血清与甲功', color: '#8FB9C0', dec: 1 },
  WEIGHT: { name: '体重', unit: 'kg', cat: '体格与代谢', color: '#C46A2B', dec: 1 },
  RISK: { name: 'ATA 动态反应分层', unit: '', cat: '分层与影像分类', color: '#7A8B94', dec: 0, categorical: true, note: '医生维护标签（极佳/血清学不完全/结构性不完全反应），变更史见「病理与分层」页签。' },
  TIRADS: { name: 'TI-RADS 分类', unit: '', cat: '分层与影像分类', color: '#A98A5B', dec: 0, categorical: true, note: '只存报告体系名+原文（T5），本台不自评；分类节点不连线。' }
};
const CAT_ORDER = ['血清与甲功', '体格与代谢', '分层与影像分类'];
/* THY 无 CTCAE/×ULN 分级对照：数值只照抄化验单；目标/参考区间并列医生与化验单原文（23 号立场：没显示 ≠ 正常）。 */

/* ---------------- AI 协助示例（INTERACTION-DESIGN：填入输入框但不自动发送；候选核对闭环） ---------------- */
const AI_DEMOS = {
  dash: { prompt: '帮我把这半年的随访变化排成一段话，复诊时照着说。', cand: { title: '随访变化摘要（演示候选）', fields: [['最近 Tg', '0.9 ng/mL（2026-10-10，抑制状态）'], ['最近超声', '2026-01-18 · TI-RADS 分类原文已登记'], ['下次抽血', '2026-11-07（以预约为准）']], src: '看板摘要（演示）' } },
  tumor: { prompt: '帮我把"ATA 中危"和"BRAF V600E 检出"各解释成一句大白话。', cand: { title: '术语解释候选（演示）', fields: [['ATA 中危', '医生给出的初始危险度标签（引用原文，解释不是判断）'], ['BRAF V600E', '乳头状癌常见基因改变之一；含义请医生结合全部结果说明'], ['口径', '只解释名词，不推算预后']], src: '病理与分层（演示）' } },
  surgery: { prompt: '今天说话又哑了一点，帮我记到声音日记里。', cand: { title: '声音日记候选（演示）', fields: [['日期', '2026-10-24'], ['状态', '嘶哑（单选）'], ['归档', '入声音线；暂时/永久标注由医生维护']], src: '声音线（演示）' } },
  rai: { prompt: '把出院指导里"餐具分开"那条整理成隔离打卡项。', cand: { title: '隔离打卡候选（演示）', fields: [['事项', '餐具分开清洗'], ['依据', '出院指导原文摘录'], ['状态', '待打卡']], src: '隔离防护日历（演示）' } },
  followup: { prompt: '我拍了张化验单，帮我把 Tg 和 TSH 读出来登记。', cand: { title: '甲功抄单候选（演示）', fields: [['日期', '待核对'], ['Tg', '照抄数值 + 状态标注'], ['TSH', '照抄数值；目标原文并列不计算']], src: 'Tg·TgAb 趋势（演示）' } },
  fertility: { prompt: '帮我把医生说的"6–12 个月避孕"整理成一张冷却期说明卡。', cand: { title: '冷却期说明候选（演示）', fields: [['起算', '碘治疗日 2026-04-10'], ['区间', '6–12 个月（医生答复原文摘录）'], ['口径', '何时开始备孕以医生意见为准']], src: '备孕与 RAI 冷却期（演示）' } },
  chart: { prompt: '把术后到现在 Tg 的三次变化讲一段给我听。', cand: { title: '时段摘要候选（演示候选）', fields: [['时段', '2025-01-20 → 2026-10-10'], ['Tg', '0.2 → 0.4 → 0.9（原文数值）'], ['口径', '每条线按自身范围缩放，不可比']], src: '病情一图秀（演示）' } },
  care: { prompt: '今天下午心悸了一会儿，帮我记到症状日记里。', cand: { title: '症状日记候选（演示）', fields: [['日期', '2026-10-24'], ['症状', '心悸 · 强度 2（单选）'], ['口径', '只记日记不归因']], src: '症状日记（演示）' } },
  mind: { prompt: '帮我记一条我自己的感受：最近总怕 Tg 再升高。', cand: { title: '感受候选（演示 · 默认私密）', fields: [['内容', '最近总怕 Tg 再升高'], ['记录人', '本人'], ['可见性', 'private（默认不进导出）']], src: '当下感受（演示）' } },
  docs: { prompt: '帮我把复诊要问的几条整理成疑问清单。', cand: { title: '疑问清单候选（演示）', fields: [['问题 1', '下次抽血前要不要停药'], ['问题 2', '超声年度复查约在哪个月'], ['来源', '就诊准备生成']], src: '就诊准备（演示）' } }
};

/* ---------------- state ---------------- */
const state = {
  page: 'dash', sub: {}, profileId: 'demo1',
  range: 'all', zoom: 100,
  sel: { demo1: ['TG', 'TSH', 'WEIGHT', 'RISK'], demo2: ['TG', 'TSH', 'WEIGHT'] },
  toggles: { treatment: true, keypoints: true },
  pin: null, flipped: new Set(),
  agent: { open: false, w: 35, draft: null, cand: null },
  cfg: {
    root: '/Users/demo/Documents/ThyPal（演示）', size: { doc: 2.6, derived: 0.5, db: 0.2 },
    backupAt: '2026-10-23 22:10', tokenState: 'none', tokenMasked: null, consent: false
  },
  /* 逐档案的可编辑内存态（原型仅内存，刷新重置） */
  mem: {
    demo1: { questions: null, savedTrials: [], materials: {}, iso: {}, meals: [], additions: {} },
    demo2: { questions: null, savedTrials: [], materials: {}, iso: {}, meals: [], additions: {} }
  }
};
const DATA = typeof DEMO_DATA !== 'undefined' ? DEMO_DATA : {};
const TODAY = DATA.meta?.today || '2026-10-24';
const profile = () => DATA.profiles.find((p) => p.id === state.profileId) || DATA.profiles[0];
const mem = () => state.mem[state.profileId];
const questions = () => { const m = mem(); if (!m.questions) m.questions = (profile().questions || []).map((q) => ({ ...q })); return m.questions; };
const added = (k) => { const m = mem(); if (!m.additions[k]) m.additions[k] = []; return m.additions[k]; };
/* private 三出口过滤（看板摘要 / 导出 / AI 上下文 默认）共用此函数——全台唯一一份 */
const sharedOnly = (p) => (p.viewpoints || []).filter((v) => v.visibility !== 'private');
const privateCount = (p) => (p.viewpoints || []).filter((v) => v.visibility === 'private').length;

/* ---------------- 通用 UI ---------------- */
const btn = (text, action, cls = '', attr = '') => `<button class="${cls}" data-action="${action}" ${attr}>${text}</button>`;
const go = (text, page, sub = '', cls = '', attr = '') => btn(text, 'go', cls, `data-page="${page}" data-sub="${esc(sub)}"${attr ? ' ' + attr : ''}`);
const pill = (text, cls = '') => `<span class="pill ${cls}">${esc(text)}</span>`;
const shortDate = (d) => String(d).slice(5).replace('-', '.');
const longDate = (d) => String(d).replace(/-/g, '.');
const fmtNum = (v, dec) => (dec === 0 ? String(Math.round(v)) : Number(v).toFixed(dec ?? 1));
const addDays = (d, n) => longDate(new Date(Date.parse(d) + n * DAY)).replace(/\./g, '-');
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

function toast(t, opts = {}) {
  clearTimeout(state.toastTimer);
  const el = $('#toast');
  el.innerHTML = esc(t) + (opts.back ? ` <button class="toast-back" data-action="go" data-page="dash">回到看板</button>` : '');
  el.classList.add('visible');
  state.toastTimer = setTimeout(() => el.classList.remove('visible'), 4200);
}
function openModal(title, body, foot = '', eyebrow = '小蝶宝 · 交互演示') {
  $('#dialog-title').textContent = title;
  $('#dialog-eyebrow').textContent = eyebrow;
  $('#dialog-body').innerHTML = body;
  $('#dialog-foot').innerHTML = foot;
  if (!$('#dialog').open) $('#dialog').showModal();
  document.body.style.overflow = 'hidden';
}
const closeModal = () => { if ($('#dialog').open) $('#dialog').close(); };
$('#dialog').addEventListener('close', () => { document.body.style.overflow = ''; });

function navigate(page, sub) {
  state.page = page;
  if (sub) state.sub[page] = sub;
  try { history.replaceState(null, '', '#' + page + (sub ? '/' + sub : '')); } catch (e) { /* file:// 下忽略 */ }
  render();
  $('#main').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
const section = (title, desc = '', action = '') => `<div class="section-title"><div><h2>${title}</h2>${desc ? `<p>${esc(desc)}</p>` : ''}</div>${action}</div>`;
const backRow = () => state.page === 'dash' ? '' : `<div class="back-row"><button class="text-button" data-action="go" data-page="dash">← 回到看板</button></div>`;
/* 本页病情上下文（0.2.1）：AI 协助按钮的提示词带着当前档案的关键信息走，患者不用自己复述。
   字段名以 demo/build-demo-data.mjs 的档案形状为准（rai.courses[].kind/dose/stay、stageLine、CATALOG.TG）。 */
function aiPromptWithCtx(key) {
  const base = AI_DEMOS[key]?.prompt || '请基于我的记录给出整理建议。';
  const ctx = [];
  try {
    const p = profile();
    ctx.push(`档案：${p.name}，${p.age ?? '—'} 岁，${p.diagnosisShort || p.diagnosis || '甲状腺癌术后'}`);
    if (p.stageLine) ctx.push(`当前阶段：${p.stageLine}`);
    if (key === 'followup' || key === 'dash' || key === 'chart') {
      const tg = lastOf('TG');
      if (tg) ctx.push(`最近 Tg：${tg.v} ng/mL（${tg.d}）`);
    }
    if (key === 'rai' && Array.isArray(p.rai?.courses) && p.rai.courses.length) {
      const c = p.rai.courses[p.rai.courses.length - 1];
      ctx.push(`最近碘131：${c.kind} ${c.dose}（${c.d}；${c.stay || ''}）`);
    }
  } catch { /* 上下文取不到就只发提示词本身 */ }
  ctx.push('以上来自本机记录（演示数据），判断由我和治疗团队做。');
  return `${base}\n\n${ctx.join('\n')}`;
}
function lastOf(code) {
  const pts = seriesAll(code);
  return pts.length ? pts[pts.length - 1] : null;
}
const aiBtn = (label = 'AI 协助示例') => btn(label, 'ai-draft', 'soft', `data-ai="${state.page}"`);
function head(title, desc, action = '') {
  return `<div class="page-head"><div><span class="eyebrow">THYPAL / THYROID WORKBENCH</span><h1>${title}</h1><p>${desc}</p></div><div class="actions">${action}</div></div>`;
}
const subnav = () => {
  const items = SUBPAGES[state.page]; if (!items) return '';
  const sel = state.sub[state.page] || items[0][0];
  return `<nav class="subnav" role="tablist" aria-label="${PAGES.find((p) => p[0] === state.page)[1]}二级页面">${items.map(([k, s]) => `<button role="tab" aria-selected="${sel === k}" data-action="sub" data-sub="${k}">${esc(s)}</button>`).join('')}</nav>`;
};
const subLabel = (page) => {
  const items = SUBPAGES[page]; if (!items) return '';
  const k = state.sub[page] || items[0][0];
  return items.find((x) => x[0] === k)[1];
};
const pageHeadFor = (desc, action = '') => head(subLabel(state.page), desc, action ? `${action}${aiBtn()}` : aiBtn()) + subnav();
/* ⋯ 更多菜单（手工通道收敛口；每页至多一个显式编辑入口） */
const moreMenu = (items) => `<details class="more-menu"><summary aria-label="更多操作">⋯</summary><div class="menu">${items.map(([t, a, attr]) => `<button data-action="${a}" ${attr || ''}>${esc(t)}</button>`).join('')}</div></details>`;
const authorTag = (a) => a === 'CAREGIVER' ? pill('照护者代记', 'mist') : a === 'PATIENT' ? pill('本人自记', 'blue') : '';

/* ---------------- 序列与治疗条 ---------------- */
function seriesAll(code) {
  const p = profile();
  const m = CATALOG[code];
  if (!m) return [];
  if (m.categorical) return ((p.metrics.qual || {})[code] || []).map((x) => ({ d: x.d, v: x.code, src: x.src, label: x.label }));
  const arr = ((p.metrics.numeric || {})[code]) || [];
  return arr.map((x) => ({ d: x.d, v: x.v, src: x.src }));
}
function profileStart(p) {
  const dates = [Date.parse(p.surgery.ops[0].d) - 10 * DAY];
  Object.values(p.metrics.numeric || {}).forEach((a) => a.forEach((x) => dates.push(Date.parse(x.d))));
  CAT_ORDER.forEach(() => {});
  Object.values(p.metrics.qual || {}).forEach((a) => a.forEach((x) => dates.push(Date.parse(x.d))));
  return Math.min(...dates);
}
function profileEnd(p) {
  const dates = [Date.parse(TODAY)];
  Object.values(p.metrics.numeric || {}).forEach((a) => a.forEach((x) => dates.push(Date.parse(x.d))));
  return Math.max(...dates);
}
/* THY 治疗与随访条（T3/T5）：手术=菱形节点，碘131=节点+隔离期带，超声=小节点；并发症（声音/钙）不进此条 */
function treatmentBands(p) {
  const out = [];
  (p.surgery.ops || []).forEach((o) => out.push({ kind: 'surgery', label: '手术', date: o.d, color: '#1B5D68' }));
  (p.rai.courses || []).forEach((c) => {
    out.push({ kind: 'rai', label: `碘131 ${esc(c.dose.split('（')[0])}`, date: c.d, color: '#E8590C' });
    out.push({ kind: 'iso', label: '隔离', from: c.d, to: addDays(c.d, c.isolationDays), color: '#E8590C' });
  });
  (p.us || []).forEach((u) => out.push({ kind: 'us', label: '超声', date: u.d, color: '#7A8B94' }));
  return out;
}

/* ---------------- 一图秀（16 号合同 R1–R12） ---------------- */
const CW = 980, CH = 432, CX0 = 56, CX1 = 950, CY0 = 148, CY1 = 372;
const LANES = { surgery: 36, rai: 36, iso: 60, us: 60 };

function domain() {
  const p = profile();
  const end = profileEnd(p);
  const months = { '3m': 3, '6m': 6, '12m': 12 }[state.range];
  const start = months ? new Date(new Date(end).setMonth(new Date(end).getMonth() - months)) : new Date(profileStart(p));
  const span = end - start.getTime();
  const kept = span * state.zoom / 100;
  return [end - kept, end];
}
const inDomain = (d, t0, t1) => { const t = Date.parse(d); return t >= t0 && t <= t1; };
const xOf = (t, t0, t1) => CX0 + (t - t0) / Math.max(1, t1 - t0) * (CX1 - CX0);
function smoothPath(coords) { /* 单调三次 Hermite（Fritsch–Carlson）：过点、防过冲、采样间隔不均匀安全（THY 长程复查节奏 2 周–4 月混杂，Catmull-Rom 在密集点过冲出尖角——用户真机指认 2026-10-24） */
  if (!coords.length) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  const n = coords.length, dx = [], sl = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    dx[i] = coords[i + 1].x - coords[i].x;
    sl[i] = dx[i] === 0 ? 0 : (coords[i + 1].y - coords[i].y) / dx[i];
  }
  m[0] = sl[0]; m[n - 1] = sl[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (sl[i - 1] * sl[i] <= 0) { m[i] = 0; continue; }        // 局部极值点：切线水平
    const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
    m[i] = (w1 + w2) / (w1 / sl[i - 1] + w2 / sl[i]);           // 加权调和平均
  }
  for (let i = 0; i < n - 1; i++) {                             // Fritsch-Carlson 限幅：防区段过冲
    if (sl[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / sl[i], b = m[i + 1] / sl[i], q = a * a + b * b;
    if (q > 9) { const t = 3 / Math.sqrt(q); m[i] = t * a * sl[i]; m[i + 1] = t * b * sl[i]; }
  }
  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C ${(coords[i].x + h).toFixed(1)} ${(coords[i].y + m[i] * h).toFixed(1)}, ${(coords[i + 1].x - h).toFixed(1)} ${(coords[i + 1].y - m[i + 1] * h).toFixed(1)}, ${coords[i + 1].x.toFixed(1)} ${coords[i + 1].y.toFixed(1)}`;
  }
  return d;
}
function seriesFor(code, t0, t1) {
  const m = CATALOG[code];
  const all = seriesAll(code);
  if (!all.length) return { code, m, lo: 0, hi: 1, span: 1, pts: [], all };
  const vals = all.map((p) => p.v);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo || Math.max(Math.abs(hi) * 0.08, 1); /* 零跨度兜底；归一化基准=全期 min/max */
  return { code, m, lo, hi, span, pts: all.filter((p) => inDomain(p.d, t0, t1)), all };
}
function monthTicks(t0, t1) {
  const out = []; const d = new Date(t0); let cur = new Date(d.getFullYear(), d.getMonth(), 1);
  if (cur.getTime() < t0) cur.setMonth(cur.getMonth() + 1);
  while (cur.getTime() <= t1) {
    const x = xOf(cur.getTime(), t0, t1);
    if (x > CX0 + 6 && x < CX1 - 6) out.push({ x, label: `${String(cur.getFullYear()).slice(2)}-${String(cur.getMonth() + 1).padStart(2, '0')}` });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  const step = out.length > 18 ? 4 : out.length > 8 ? 2 : 1;
  return step === 1 ? out : out.filter((_, i) => i % step === 0);
}
function chartSVG(t0, t1) {
  const sel = state.sel[state.profileId];
  const series = sel.map((c) => seriesFor(c, t0, t1)).filter((s) => s.pts.length);
  if (!series.length) {
    return `<div class="empty"><h3>这个时间窗里没有所选指标</h3><p>扩大时间范围，或在左侧加选一个指标。</p></div>`;
  }
  const p = profile();
  const bands = state.toggles.treatment ? treatmentBands(p).filter((b) => {
    const s = b.date ? Date.parse(b.date) : Date.parse(b.from);
    const e = b.date ? s : Date.parse(b.to);
    return e >= t0 && s <= t1;
  }) : [];
  const yOf = (s, v) => CY1 - (v - s.lo) / s.span * (CY1 - CY0);
  const grid = [0, 1, 2, 3, 4].map((i) => { const y = CY0 + i * (CY1 - CY0) / 4; return `<line class="grid" x1="${CX0}" x2="${CX1}" y1="${y}" y2="${y}"/>`; }).join('');

  /* 治疗条分层（R3）：手术/碘131 在「治疗」泳道（碘131 节点 + 隔离期带），超声在「随访检查」泳道 */
  const strip = [];
  bands.forEach((b) => {
    if (b.kind === 'surgery') {
      const x = xOf(Date.parse(b.date), t0, t1).toFixed(1);
      strip.push(`<g><path d="M ${x} ${LANES.surgery + 4.5} l4.5 4.5 -4.5 4.5 -4.5 -4.5 Z" fill="${b.color}"/><text x="${(+x + 7).toFixed(1)}" y="${LANES.surgery + 13}" font-size="8.5" fill="${b.color}" font-weight="500">${esc(b.label)}</text></g>`);
    } else if (b.kind === 'rai') {
      const x = xOf(Date.parse(b.date), t0, t1).toFixed(1);
      strip.push(`<g><path d="M ${x} ${LANES.rai + 4.5} l4.5 4.5 -4.5 4.5 -4.5 -4.5 Z" fill="${b.color}"/><text x="${(+x + 7).toFixed(1)}" y="${LANES.rai + 13}" font-size="8.5" fill="${b.color}" font-weight="500">${esc(b.label)}</text></g>`);
      strip.push(`<line x1="${x}" x2="${x}" y1="${CY0}" y2="${CY1}" stroke="${b.color}" stroke-width="1.2" stroke-dasharray="3 6" opacity=".35"/>`);
    } else if (b.kind === 'iso') {
      const x1 = Math.max(xOf(Date.parse(b.from), t0, t1), CX0), x2 = Math.min(xOf(Date.parse(b.to), t0, t1), CX1);
      strip.push(`<g><rect x="${x1.toFixed(1)}" y="${LANES.iso}" width="${Math.max(x2 - x1, 7).toFixed(1)}" height="8" rx="4" fill="${b.color}" opacity=".22"/><text x="${(x1 + 1).toFixed(1)}" y="${(LANES.iso - 4).toFixed(1)}" font-size="8.5" fill="${b.color}" font-weight="500">${esc(b.label)}</text></g>`);
    } else if (b.kind === 'us') {
      const x = xOf(Date.parse(b.date), t0, t1).toFixed(1);
      strip.push(`<g><circle cx="${x}" cy="${LANES.us + 4.5}" r="3.4" fill="${b.color}"/><text x="${(+x + 6.5).toFixed(1)}" y="${LANES.us + 13}" font-size="8.5" fill="${b.color}" font-weight="500">${esc(b.label)}</text></g>`);
    }
  });
  const rowLabels = state.toggles.treatment ? `<text x="6" y="${LANES.surgery + 7}" font-size="8.5" fill="#96a5b2">治疗</text><text x="6" y="${LANES.iso + 7}" font-size="8.5" fill="#96a5b2">检查</text>` : '';

  /* 末点标签三向避让（R4） */
  const lastPos = series.map((s) => {
    const c = s.pts.map((p) => ({ x: xOf(Date.parse(p.d), t0, t1), y: yOf(s, p.v) }));
    const last = c[c.length - 1];
    return { s, x: last.x, y: last.y, v: s.pts[s.pts.length - 1].v };
  }).sort((a, b) => a.y - b.y);
  let cursor = -Infinity;
  for (const it of lastPos) { it.ly = Math.max(it.y, cursor + 13); cursor = it.ly; }
  const overflow = lastPos.length ? Math.max(0, lastPos[lastPos.length - 1].ly - (CY1 + 2)) : 0;
  if (overflow) for (const it of lastPos) it.ly -= overflow;

  const lines = series.map((s, si) => {
    const coords = s.pts.map((p) => ({ x: xOf(Date.parse(p.d), t0, t1), y: yOf(s, p.v) }));
    /* R2 单点不连线；分类序列（分层/TI-RADS）只画节点不连线（红线） */
    const canLine = !s.m.categorical && s.pts.length > 1;
    const path = canLine ? `<path class="line" d="${smoothPath(coords)}" stroke="${s.m.color}" pathLength="1"/>` : '';
    const dots = coords.map((c, i) => {
      const pt = s.pts[i];
      const isLast = i === s.pts.length - 1;
      const r = isLast ? 5.2 : 4;
      const active = state.pin && state.pin.code === s.code && state.pin.date === pt.d;
      const tip = s.m.categorical ? `${s.m.name}：${pt.label || fmtNum(pt.v, 0)} · ${pt.d}` : `${s.m.name} ${fmtNum(pt.v, s.m.dec)} ${s.m.unit} · ${pt.d}`;
      return `<circle class="pt${active ? ' active' : ''}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${r}" fill="${s.m.color}" data-action="pin" data-code="${s.code}" data-date="${pt.d}"><title>${esc(tip)}</title></circle>`;
    }).join('');
    const lp = lastPos.find((x) => x.s === s);
    const nearRight = lp.x > CX1 - 46;
    const lx = nearRight ? lp.x - 8 : lp.x + 8;
    const ltxt = s.m.categorical ? `${s.pts[s.pts.length - 1].label || fmtNum(lp.v, 0)}` : fmtNum(lp.v, s.m.dec);
    const label = state.toggles.keypoints
      ? `<text class="delta-tag" x="${lx.toFixed(1)}" y="${(lp.ly + 4 + (si % 2 ? -11 : 0)).toFixed(1)}" text-anchor="${nearRight ? 'end' : 'start'}" fill="${s.m.color}">${ltxt}</text>` : '';
    return `<g>${path}${dots}${label}</g>`;
  }).join('');
  const ticks = monthTicks(t0, t1).map((t) => `<line class="axis" x1="${t.x.toFixed(1)}" x2="${t.x.toFixed(1)}" y1="${CY1}" y2="${CY1 + 5}"/><text class="tick" x="${t.x.toFixed(1)}" y="${CY1 + 18}" text-anchor="middle">${t.label}</text>`).join('');
  const singleNotes = series.filter((s) => !s.m.categorical && s.pts.length === 1).map((s) => `${esc(s.m.name)} 只有 1 点，不连线`).join('；');
  const catNote = series.filter((s) => s.m.categorical).map((s) => `${esc(s.m.name)} 是分类节点，只画点不连线`).join('；');
  return `<svg class="chart" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="一图秀：所选指标时间轴">
    ${grid}${strip.join('')}${rowLabels}${lines}${ticks}
    <text x="${CX1}" y="${CH - 8}" text-anchor="end" font-size="9.5" fill="#96a5b2">每条线按该指标全部记录范围缩放，不代表不同指标数值可比。</text>
    ${singleNotes ? `<text x="${CX0}" y="${CH - 8}" font-size="9.5" fill="#96a5b2">${esc(singleNotes)}</text>` : ''}
    ${catNote ? `<text x="${CX0}" y="${CH - 22}" font-size="9.5" fill="#96a5b2">${esc(catNote)}；节点标签与原文见来源页签。</text>` : ''}
  </svg>`;
}
function metricCard(code) {
  const m = CATALOG[code];
  const all = seriesAll(code);
  if (!all.length) {
    return `<div class="ccard" aria-label="${esc(m.name)}：暂无记录">
      <span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)}</span>
      <span class="name">${esc(m.name)}</span>
      <span class="val">—<small>${esc(m.unit)}</small></span>
      <span class="na">这个档案里还没有${esc(m.name)}的记录。没显示不等于正常——下次化验后登记进来。${esc(m.note || '')}</span>
    </div>`;
  }
  if (m.categorical) {
    const last = all[all.length - 1];
    return `<div class="ccard" aria-label="${esc(m.name)}：分类记录，只列各次结果，不做趋势线">
      <span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)} · 分类序列</span>
      <span class="name">${esc(m.name)}</span>
      <span class="val">${esc(last.label || fmtNum(last.v, 0))}<small>${last.label ? '' : m.unit}</small></span>
      <span class="vals">${all.slice(-4).map((x) => `<span><b>${esc(x.label || fmtNum(x.v, 0))}</b><br>${shortDate(x.d)}</span>`).join('')}</span>
      <span class="rec">${all.length} 次记录 · ${shortDate(last.d)} · 医生维护标签/报告原文 · 分类节点不连线不翻转</span>
    </div>`;
  }
  const pts = all, last = pts[pts.length - 1], prev = pts[pts.length - 2];
  const diff = prev ? last.v - prev.v : 0;
  const arrow = prev ? (diff > 0 ? '↑' : diff < 0 ? '↓' : '→') : '';
  const badge = code === 'TG' ? pill('Tg 升高 ≠ 复发', 'dashed') : code === 'TSH' ? pill('目标原文并列', 'grey') : '';
  const backNote = m.note || '本台不设分级对照；数值解读归医生。';
  const backPts = pts.slice(-5);
  const bw = 168, bh = 54, bpad = 6;
  const vals = backPts.map((x) => x.v);
  const blo = Math.min(...vals), bhi = Math.max(...vals);
  const bspan = bhi - blo || 1;
  const bx = (i) => bpad + (backPts.length === 1 ? (bw - bpad * 2) / 2 : i / (backPts.length - 1) * (bw - bpad * 2));
  const by = (v) => bh - bpad - (v - blo) / bspan * (bh - bpad * 2);
  const path = backPts.length > 1 ? `<path class="sp-line" d="${smoothPath(backPts.map((x, i) => ({ x: bx(i), y: by(x.v) })))}" stroke="${m.color}" pathLength="1"/>` : '';
  const dots = backPts.map((x, i) => `<circle class="sp-dot" cx="${bx(i).toFixed(1)}" cy="${by(x.v).toFixed(1)}" r="2.8" fill="${m.color}"/>`).join('');
  return `<button class="mcard" aria-pressed="${state.flipped.has(code)}" data-action="flip" data-code="${code}" aria-label="${esc(m.name)}，最新 ${fmtNum(last.v, m.dec)} ${esc(m.unit)}，点击查看最近 ${backPts.length} 次记录与口径说明">
    <span class="mcard-inner">
      <span class="mface front" aria-hidden="true">
        <span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)}</span>
        <span class="name">${esc(m.name)}${badge}</span>
        <span class="val">${fmtNum(last.v, m.dec)}<small>${esc(m.unit)}</small></span>
        <span class="delta">${prev ? `${arrow} 较前次 <em>${diff > 0 ? '+' : ''}${fmtNum(diff, m.dec)}</em>` : '仅 1 次记录'}</span>
        <span class="rec">共 ${pts.length} 次 · ${shortDate(last.d)}</span>
        <span class="meta"><span>${esc(last.src || '')}</span><span class="hint">点开看口径与最近记录</span></span>
      </span>
      <span class="mface back" aria-hidden="true">
        <span class="cat">最近 ${backPts.length} 次 · ${esc(m.cat)}</span>
        <span class="name">${esc(m.name)}</span>
        <span class="count">${esc(backNote)}</span>
        <svg class="spark" viewBox="0 0 ${bw} ${bh}" aria-hidden="true"><line class="base" x1="${bpad}" x2="${bw - bpad}" y1="${bh - bpad}" y2="${bh - bpad}"/>${path}${dots}</svg>
        <span class="spark-labels"><span>${esc(shortDate(backPts[0].d))}</span><span>${fmtNum(backPts[0].v, m.dec)} → ${fmtNum(last.v, m.dec)}</span><span>${esc(shortDate(last.d))}</span></span>
        <span class="foot">仅回顾已核对记录 · 对照不是诊断</span>
      </span>
    </span>
  </button>`;
}

/* ================= 看板（双主体 8 入口 + 特色状态卡 + 场景直达） ================= */
function pageDash() {
  const p = profile();
  const m = mem();
  const voice = p.surgery.voice.entries || [];
  const lastVoice = voice[voice.length - 1];
  const ca = p.surgery.calcium.labs || [];
  const lastCa = ca[ca.length - 1];
  const calRows = (p.calendar || []).flatMap((y) => y.rows.map((r) => ({ ...r, year: y.year })));
  const nextVisit = calRows.find((r) => !r.done);
  const ready = p.materials.filter((x) => (m.materials[x.id] || x.state) === 'ready').length;
  const shared = sharedOnly(p);
  const selfEntries = [
    ['◷', '下次抽血与随访', nextVisit ? `${nextVisit.d} · ${nextVisit.item}` : '待医院通知', 'followup', 'calendar', 'S08'],
    ['▤', '抄一次化验单', 'Tg / TSH / TgAb 照化验单抄，2–4 周节奏到今天', 'followup', 'tg', 'S05'],
    ['◎', '看看我的分层', p.pathology.typeLabel + ' · ' + p.stageLine.split('·')[0].trim(), 'tumor', 'pathology', 'S01'],
    ['⌁', '碘治疗后提醒', p.rai.courses.length ? `最近一次 ${shortDate(p.rai.courses[p.rai.courses.length - 1].d)} · 隔离与复查语境` : '暂无碘治疗记录', 'rai', 'records', 'S04']
  ];
  const careEntries = [
    ['⌁', '隔离防护打卡', p.rai.isolation.filter((x) => x.done).length + ' / ' + p.rai.isolation.length + ' 项已打卡 · 按出院指导原文', 'rai', 'isolation', 'S04'],
    ['☰', '复诊材料清单', `${ready} / ${p.materials.length} 项已备齐 · 只整理复诊材料`, 'docs', 'schedule', 'S07'],
    ['✎', '她/他想问的事', `${questions().filter((q) => !q.asked).length} 条想问的事待问`, 'docs', 'prepare', 'S07'],
    ['◷', '今天该做什么', nextVisit ? `下一次：${nextVisit.item}（${nextVisit.d}）` : '按医嘱随访；异常随时联系团队', 'followup', 'calendar', 'S08']
  ];
  const duo = (title, cls, entries) => `<div class="duo-col ${cls}"><span class="duo-tag"><i></i>${title}</span>
    <div class="task-grid">${entries.map(([g, t2, d, page, sub, scene]) => `<button class="task-entry" data-action="go" data-page="${page}" data-sub="${sub}" data-scene="${scene}">
      <span class="entry-icon">${g}</span><b>${esc(t2)}</b><span>${esc(d)}</span><span class="arrow">→</span></button>`).join('')}</div></div>`;
  const numericSel = state.sel[state.profileId].filter((c) => !CATALOG[c].categorical).slice(0, 2);
  const catSel = state.sel[state.profileId].find((c) => CATALOG[c].categorical);
  return `${head('看板', SUBTITLES.dash, aiBtn())}
    <div class="stage-strip"><span class="eyebrow">当前阶段 · 引用医生语境</span><b>${esc(p.stageLine)}</b><small>${esc(p.diagnosis)} · ${p.age} 岁 · 演示数据</small></div>
    <div class="duo">${duo(`本人 · 现在可以做（${p.gender === '女' ? '她' : '他'}主导）`, 'self', selfEntries)}${duo(`照护者 · 现在可以做（${p.caregiverLabel}）`, 'care', careEntries)}</div>
    <div class="scene-strip" aria-label="13 个场景直达（演示导航）"><span class="lab">场景直达：</span>${SCENES.map(([k, n]) => `<button class="scene-chip" data-action="scene" data-scene="${k}" aria-label="场景 ${k} ${n}">${k} ${n}</button>`).join('')}</div>
    <div class="change-strip" data-product="特色状态卡">
      <div class="chg"><span>声音线（并发症双线 · 一）</span><b>${lastVoice ? `${esc(lastVoice.label)} · ${longDate(lastVoice.d)}` : '—'}</b><p>${lastVoice ? esc(lastVoice.note) : '还没有记录'}；暂时/永久标注由医生维护</p></div>
      <div class="chg"><span>低钙线（并发症双线 · 二）</span><b>${lastCa ? `血钙 ${fmtNum(lastCa.ca, 2)} · PTH ${fmtNum(lastCa.pth, 1)} · ${shortDate(lastCa.d)}` : '—'}</b><p>${esc(p.surgery.calcium.label)}：${esc(p.surgery.calcium.labelQuote.slice(0, 34))}…；钙/PTH 是指标卡，不并入趋势</p></div>
      <div class="chg"><span>下次随访倒计时</span><b>${nextVisit ? (/\d{4}-\d{2}-\d{2}/.test(nextVisit.d) ? `${nextVisit.d}（还有 ${daysBetween(TODAY, nextVisit.d)} 天）` : `${nextVisit.d} · 待预约`) : '—'}</b><p>${nextVisit ? esc(nextVisit.item) : '待医院通知'}；年度节奏语境，不暗示可以少查</p></div>
      <div class="actions">${go('看并发症双线', 'surgery', 'voice', 'soft')}${go('看随访日历', 'followup', 'calendar', 'soft')}</div>
    </div>
    ${section('接下来 · 指标卡', '点数值卡翻到背面看口径与最近 5 次；分类卡（分层/TI-RADS）不翻不连线。', go('看病情一图秀', 'chart', '', 'primary'))}
    <div class="dash-cols">
      <div class="metric-grid">${numericSel.map(metricCard).join('')}${catSel ? metricCard(catSel) : ''}${metricCard('TGAB')}</div>
      <div class="stack">
        <div class="card accent">
          <div class="card-head"><div><h3>双主体说明</h3><p>照护者代记的条目带「照护者代记」徽章；私密感受默认不进摘要、导出与 AI 上下文（三出口同一过滤）。</p></div>${pill(`已隐藏 ${privateCount(p)} 条私密记录`, 'mist')}</div>
          <p class="small-note" style="margin:0">本页摘要只引用已登记事实与报告原文；${esc(DATA.meta.disclaimer)}</p>
        </div>
        <div class="card" data-product="想问的事">
          <div class="card-head"><div><h3>想问的事</h3><p>${questions().filter((q) => !q.asked).length} 条待问 · ${questions().length} 条累计</p></div>${go('去疑问清单', 'docs', 'prepare')}</div>
          ${questions().slice(0, 2).map((q) => `<div class="row"><div class="row-main"><div><b>${esc(q.text)}</b><p>${esc(q.src)}</p></div></div>${pill(q.asked ? '已问' : '待问', q.asked ? 'green' : 'grey')}</div>`).join('') || '<p class="small-note" style="margin:0">还没有记录。</p>'}
        </div>
      </div>
    </div>`;
}

/* ================= 我的瘤与分层 ================= */
const MOL_META = {
  detected: { label: '检出', cls: 'green' },
  not_detected: { label: '未检出', cls: 'grey' },
  not_tested: { label: '未检测', cls: 'dashed' }
};
function pagePathology() {
  const p = profile();
  const pa = p.pathology;
  return `${pageHeadFor('病理四型对照 + 本例病理 + ATA 双层（医生标签与原文）："ATA 中危什么意思"——解释不是判断。', moreMenu([['改这一条', 'manual-edit', 'data-code="pathology"']]))}
    <div class="notice blue"><b>四型对照是名词解释，不是病情判断。</b>本例是哪一型、意味着什么，请医生结合报告原文说明；本页不推算预后、不给任何生存数字。髓样癌/未分化癌一期只做「见报告原文」标注。</div>
    <div class="type-cards" data-product="四型对照">
      ${pa.fourTypes.map((t) => `<div class="type-card${t.key === pa.type ? ' mine' : ''}">
        <h3>${esc(t.name)}${t.key === pa.type ? pill('本例', 'blue') : ''}</h3>
        <p>${esc(t.desc)}</p>
        <div class="flag">${esc(t.flag)}</div>
      </div>`).join('')}
    </div>
    <div class="card" style="margin-top:14px" data-product="本例病理与分期">
      <div class="card-head"><div><span class="eyebrow">${longDate(pa.opDate)} · ${esc(pa.hospital)}</span><h2 style="margin-top:4px">本例病理：${esc(pa.typeLabel)}</h2><p>${esc(pa.method)}</p></div></div>
      <blockquote class="reaction-quote"><b>AJCC 分期（只抄报告）：</b>${esc(pa.ajccQuote)}</blockquote>
      <p class="small-note">${esc(pa.ajccNote)}</p>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card" data-product="ATA 初始分层">
        <div class="card-head"><div><h3>ATA 初始危险度分层（医生标签）</h3><p>分层决定 TSH 目标与碘治疗语境——本台只展示，不计算。</p></div>${pill('引用原文', 'blue')}</div>
        <blockquote class="reaction-quote">${esc(pa.ataInitialQuote)}</blockquote>
        <p class="small-note">${esc(pa.ataNote)}</p>
      </div>
      <div class="card" data-product="动态反应分层">
        <div class="card-head"><div><h3>动态反应分层 · 变更史（医生维护）</h3><p>极佳 / 血清学不完全 / 结构性不完全反应。</p></div>${pill(`${pa.dynamicHistory.length} 次`, 'grey')}</div>
        ${pa.dynamicHistory.map((h) => `<div class="row"><div class="row-main"><div><b>${esc(h.label)}</b><p>${longDate(h.d)} · ${esc(h.quote)}</p></div></div>${pill(h.by, 'mist')}</div>`).join('') || '<p class="small-note" style="margin:0">还没有医生标签记录。</p>'}
        <p class="small-note" style="margin-top:8px">${esc(pa.dynamicNote)}</p>
      </div>
    </div>
    <p class="small-note" style="margin-top:10px">本页不做任何风险分层计算——分层标签由医生维护，逐项可回「报告原文」页签查出处。</p>
    <div class="actions" style="margin-top:10px">${go('看分子与基因', 'tumor', 'molecular', 'soft', 'data-step="to-molecular"')}${go('看报告原文', 'tumor', 'reports', 'soft', 'data-step="to-reports"')}</div>`;
}
function pageMolecular() {
  const p = profile();
  const items = p.molecular;
  const n = { detected: 0, not_detected: 0, not_tested: 0 };
  items.forEach((x) => n[x.status]++);
  return `${pageHeadFor('每项标志物按 检出 / 未检出 / 未检测 三态记录；"BRAF 阳性什么意思"——解释不是判断。')}
    <div class="notice blue" data-product="三态档案"><b>未检测不等于阴性。</b>报告里没有的项目按「未检测」记，不会补成阴性；${n.not_tested} 项未检测属于正常情况，是否补测由医生结合分层决定。MTC/ATC 相关检测一期只做「见报告原文」标注。</div>
    <div class="mol-grid">
      ${items.map((x) => {
    const meta = MOL_META[x.status];
    return `<div class="mol-card${x.status === 'not_tested' ? ' notested' : ''}">
          <div class="mol-head"><b>${esc(x.marker)}</b>${pill(meta.label, meta.cls)}</div>
          ${x.value ? `<div class="val">报告原文：${esc(x.value)}</div>` : ''}
          <p>${esc(x.explain)}</p>
          <div class="mol-meta">${x.method ? `方法 ${esc(x.method)} · ${esc(x.date)}` : '未送检 · 无方法与日期'}</div>
          <div class="actions" style="margin-top:9px">${btn('把这个问题记下来', 'q-from-term', 'soft', `data-term="${esc(x.marker)}"`)}</div>
        </div>`;
  }).join('')}
    </div>
    <p class="small-note">本页解释是「名词解释」不是「病情判断」；对治疗与预后的含义请医生结合全部结果说明。问题会存进「疑问清单」（就诊准备页签）。</p>`;
}
function pageRecurrence() {
  const p = profile();
  const list = p.recurrence.events || [];
  return `${pageHeadFor('复发与转移事件：发现日期 / 部位 / 确认方式 三条登记；应对路径只列不荐。', btn('＋ 登记事件', 'event-add', 'primary'))}
    <div class="notice blue"><b>Tg 升高 ≠ 复发，正常也不等于没事。</b>是否有新的复发或转移事件，由医生结合超声、Tg 与影像判断；本页只登记医生明确告知过的事件。</div>
    <div data-product="事件登记">
      ${list.map((e) => `<div class="row"><div class="row-main"><div><b>${esc(e.site)}</b><p>${longDate(e.d)} · 确认方式：${esc(e.how)}${e.note ? ' · ' + esc(e.note) : ''}</p></div></div>${pill('医生告知', 'blue')}</div>`).join('') || `<div class="empty"><h3>暂无事件登记</h3><p>${esc(p.recurrence.note)}</p></div>`}
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>这一页不做什么</h3></div></div>
        <div class="flag-list"><div>不按 Tg 数值自动判定复发</div><div>不推算复发概率、不给生存数字</div><div>更正=新增版本，旧记录保留</div></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>下一步</h3></div></div>
        <div class="flag-list"><div>Tg 趋势与口径看「Tg·TgAb 趋势」页签（趋势向上→报告医生）</div><div>超声证据看「颈部超声并列」页签</div></div>
        <div class="actions" style="margin-top:12px">${go('看 Tg·TgAb 趋势', 'followup', 'tg', 'soft', 'data-step="to-tg"')}${go('看颈部超声并列', 'followup', 'us', 'soft')}</div>
      </div>
    </div>`;
}
function pageReports() {
  const p = profile();
  return `${pageHeadFor('逐项回原文：每份报告的日期、类型与摘录；原件留在你的资料目录。')}
    <div class="card" data-product="报告原文">
      <div class="table-wrap"><table><thead><tr><th>日期</th><th>类型</th><th>标题</th><th>摘录（原文）</th><th></th></tr></thead><tbody>
        ${p.reports.map((r) => `<tr><td class="num">${esc(r.d)}</td><td>${pill(r.kind, r.kind === '病理报告' ? 'blue' : 'grey')}</td><td><b>${esc(r.title)}</b></td><td style="min-width:220px">${esc(r.excerpt)}</td><td>${btn('看原文', 'src', 'text-button', `data-src="${esc(r.kind)} · ${esc(r.d)}"`)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small-note">"摘录"列照抄报告；需要完整原件时到「资料库与导入」查档。若报告有更新版本，将作为新版本登记，不覆盖旧记录。</p>
    </div>`;
}

/* ================= 手术与并发症（双线：声音轨道 + 钙/PTH 指标卡，不并入趋势） ================= */
const VOICE_STATES = { normal: '正常', mild: '轻度嘶哑', moderate: '明显嘶哑', severe: '重度嘶哑' };
function pageOp() {
  const p = profile();
  return `${pageHeadFor('术式枚举 + IONM 状态 + 住院天数：手术影响的起点，只抄手术记录原文。', moreMenu([['改这一条', 'manual-edit', 'data-code="op"']]))}
    ${(p.surgery.ops || []).map((o) => `<div class="card" style="margin-bottom:14px" data-product="手术记录">
      <div class="card-head"><div><span class="eyebrow">${longDate(o.d)} · ${esc(o.hospital)}</span><h2 style="margin-top:4px">${esc(o.title)}</h2></div>${pill('手术记录原文', 'blue')}</div>
      <blockquote class="reaction-quote">${esc(o.quote)}</blockquote>
      <div class="kv"><span><b>术中神经监测：</b>${esc(o.ionm)}</span><span><b>住院：</b>${esc(o.stay)}</span></div>
      <div class="actions" style="margin-top:10px">${go('看声音线', 'surgery', 'voice', 'soft')}${go('看低钙与钙磷', 'surgery', 'calcium', 'soft')}${go('看颈肩康复与疤痕', 'surgery', 'neck', 'soft')}</div>
    </div>`).join('')}
    <div class="help-box">并发症双线从这里出发：声音线（嘶哑分级+饮水呛咳+喉镜原文）与低钙线（血钙/PTH 化验+麻木抽搐打卡+钙剂用药）分轨道并列；两线都不并入一图秀趋势（T5）。器官功能是否受累（气管/食管）及康复问题，请医生结合手术记录说明。</div>`;
}
function pageVoice() {
  const p = profile();
  const list = [...(p.surgery.voice.entries || []), ...added('voice')];
  return `${pageHeadFor('嘶哑分级 + 饮水呛咳 + 喉镜原文；"手术后声音哑了"——只记时间线，不判神经损伤。', btn('＋ 记一条声音日记', 'voice-add', 'primary'))}
    <div class="notice blue"><b>嘶哑程度与「暂时/永久」标注由医生维护。</b>${esc(p.surgery.voice.note)}</div>
    <div class="card" data-product="声音轨道">
      ${list.map((x) => `<div class="row"><div class="row-main"><div><b>${esc(x.label || VOICE_STATES[x.state] || '—')}</b><p>${longDate(x.d)} · ${esc(x.note || '')}</p></div></div>${authorTag(x.author)}${pill(esc(x.src || '记录'), 'grey')}</div>`).join('') || '<p class="small-note" style="margin:0">还没有声音日记。</p>'}
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card" data-product="饮水呛咳打卡">
        <div class="card-head"><div><h3>饮水呛咳打卡</h3><p>发生就记一条；进食吞咽训练归康复科与医生。</p></div></div>
        ${(p.surgery.voice.cough || []).map((x) => `<div class="row"><div class="row-main"><div><b>${longDate(x.d)}</b><p>${esc(x.text)}</p></div></div></div>`).join('') || '<p class="small-note" style="margin:0">还没有打卡。</p>'}
      </div>
      <div class="card" data-product="喉镜原文">
        <div class="card-head"><div><h3>喉镜报告原文</h3><p>每次喉镜的结论照抄，可回「报告原文」查档。</p></div></div>
        ${(p.surgery.voice.laryngoscopy || []).map((x) => `<blockquote class="reaction-quote"><span class="d">${longDate(x.d)}</span> ${esc(x.quote)}</blockquote>`).join('') || '<p class="small-note" style="margin:0">还没有喉镜记录。</p>'}
      </div>
    </div>`;
}
function pageCalcium() {
  const p = profile();
  const c = p.surgery.calcium;
  const list = [...(c.labs || []), ...added('calclab')];
  return `${pageHeadFor('血钙/PTH 只照抄化验单并并列参考区间 + 麻木抽搐打卡 + 钙剂用药；"手麻、口周发麻"——不判旁腺损伤。', btn('＋ 抄一次血钙/PTH', 'ca-add', 'primary'))}
    <div class="notice blue"><b>暂时/永久标注由医生维护。</b>${esc(c.label)}：${esc(c.labelQuote)} 补钙何时减、何时停由医生决定，本台零调药建议；并发症数值不并入一图秀趋势（T5）。</div>
    <div class="card" data-product="血钙/PTH 指标卡">
      <div class="table-wrap"><table><thead><tr><th>日期</th><th>血钙（mmol/L）</th><th>PTH（pg/mL）</th><th>参考区间（化验单自带）</th><th>来源</th></tr></thead><tbody>
        ${list.map((x) => `<tr><td class="num">${esc(x.d)}</td><td class="num"><b>${fmtNum(x.ca, 2)}</b></td><td class="num"><b>${fmtNum(x.pth, 1)}</b></td><td class="muted">${esc(x.refCa)}；${esc(x.refPth)}</td><td>${esc(x.src)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small-note">本台不计算"是否正常"——化验单参考区间与数值并列即止；解读归医生。</p>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card" data-product="麻木抽搐打卡">
        <div class="card-head"><div><h3>麻木 / 抽搐打卡</h3><p>发生就记；急症（抽搐不止等）直接联系医生。</p></div>${btn('＋ 打卡', 'ca-sym', 'soft')}</div>
        ${(c.symptoms || []).map((x) => `<div class="row"><div class="row-main"><div><b>${longDate(x.d)}</b><p>${esc(x.text)}</p></div></div></div>`).join('') || '<p class="small-note" style="margin:0">还没有打卡。</p>'}
      </div>
      <div class="card" data-product="钙剂用药留痕">
        <div class="card-head"><div><h3>钙剂 / 骨化三醇（医嘱原文留痕）</h3><p>只记医生给过和停过的医嘱。</p></div></div>
        ${(c.meds || []).map((x) => `<div class="row"><div class="row-main"><div><b>${esc(x.item)}</b><p>${longDate(x.d)} · ${esc(x.quote)}</p></div></div></div>`).join('')}
        <p class="small-note" style="margin-top:8px">钙剂与左甲状腺素同服影响吸收，一般间隔 4 小时以上（医嘱语境）——具体听医生。</p>
      </div>
    </div>`;
}
function pageNeck() {
  const p = profile();
  const list = [...(p.surgery.neck.exercises || []), ...added('rehab')];
  return `${pageHeadFor('颈清后锻炼打卡 + 疤痕照片时间线（可选本地）；气管食管受累相关康复问题请医生说明。', btn('＋ 打卡（康复/疤痕）', 'neck-add', 'primary'))}
    <div class="grid two">
      <div class="card" data-product="康复打卡">
        <div class="card-head"><div><h3>颈肩功能锻炼打卡</h3><p>锻炼处方与强度请康复科或医生确认。</p></div></div>
        ${list.map((x) => `<div class="row"><div class="row-main"><div><b>${longDate(x.d)}</b><p>${esc(x.text)}</p></div></div>${authorTag(x.author)}</div>`).join('') || '<p class="small-note" style="margin:0">还没有打卡。</p>'}
      </div>
      <div class="card" data-product="疤痕时间线">
        <div class="card-head"><div><h3>疤痕照片时间线</h3><p>照片只存本地资料目录，默认不上传。</p></div></div>
        ${(p.surgery.neck.scars || []).map((x) => `<div class="row"><div class="row-main"><div><b>${longDate(x.d)}</b><p>${esc(x.text)}</p></div></div>${pill('本地', 'grey')}</div>`).join('')}
        <p class="small-note" style="margin-top:8px">${esc(p.surgery.neck.note)}</p>
      </div>
    </div>
    <div class="help-box">若手术记录提到气管/食管受累（如 S13 场景），相关康复记录也收在本页签；康复方案由医生与康复科决定，本台只做打卡与留痕。</div>`;
}

/* ================= 碘131 档案（T3：独立事件档案，家族独有整线） ================= */
function pageRaiRecords() {
  const p = profile();
  const list = [...(p.rai.courses || []), ...added('rai')];
  return `${pageHeadFor('碘131 按次建档：清甲/辅助/清灶 + mCi 剂量 + 机构；"要不要做、隔离几天"——只记已发生的事实与原文。', btn('＋ 登记碘治疗事件', 'rai-add', 'primary'))}
    <div class="notice blue"><b>碘131 是否需要做、剂量多大，由核医学科与内分泌医生决定。</b>本档案只记录已发生治疗的事实、剂量与出院指导原文，不做适应症判断（T3）。</div>
    ${list.map((c) => `<div class="card" style="margin-bottom:14px" data-product="RAI 治疗记录">
      <div class="card-head"><div><span class="eyebrow">${longDate(c.d)} · ${esc(c.hospital)}</span><h2 style="margin-top:4px">碘-131 ${esc(c.kind)}治疗 · ${esc(c.dose)}</h2></div>${pill('治疗单原文', 'blue')}</div>
      <blockquote class="reaction-quote">${esc(c.doseQuote)}</blockquote>
      <div class="kv"><span><b>隔离：</b>${esc(c.stay)}</span><span><b>出院指导（原文）：</b>${esc(c.dischargeQuote)}</span></div>
      <div class="actions" style="margin-top:10px">${go('看隔离防护日历', 'rai', 'isolation', 'soft', 'data-step="to-isolation"')}${go('看治疗后扫描与反应', 'rai', 'wbs', 'soft', 'data-step="to-wbs"')}${go('看低碘与口干', 'rai', 'diet', 'soft')}</div>
    </div>`).join('')}
    <div class="help-box">备孕/妊娠与 RAI 的间隔（男 2 月 / 女 6–12 月）按出院指导与医生答复原文执行，联动见「妊娠与生育」线；孕期状态下碘治疗入口自动屏蔽（禁忌提示常驻）。</div>`;
}
function pageIsolation() {
  const p = profile();
  const m = mem();
  const rows = (p.rai.isolation || []).map((x, i) => ({ ...x, key: 'iso' + i, done: m.iso['iso' + i] !== undefined ? m.iso['iso' + i] : x.done }));
  const done = rows.filter((x) => x.done).length;
  return `${pageHeadFor('接触对象 × 天数 checklist 状态化，按家庭成员构成快照触发；打卡依据=出院指导原文。')}
    <div class="notice blue"><b>隔离天数与防护范围以出院指导原文为准。</b>本页只是把原文拆成可打卡的条目——不新增任何防护要求。</div>
    <div class="card" data-product="家庭成员快照">
      <div class="card-head"><div><h3>家庭成员快照（隔离期触发）</h3><p>接触对象来自家庭构成快照；快照可在设置里更新。</p></div></div>
      ${(p.rai.familySnapshot || []).map((f) => `<div class="row"><div class="row-main"><div><b>${esc(f.name)} · ${esc(f.relation)}</b><p>${esc(f.note)}</p></div></div>${pill('快照', 'grey')}</div>`).join('')}
    </div>
    <div class="mat-list" style="margin-top:14px" data-product="隔离打卡">
      <div class="mat-progress"><b>${done} / ${rows.length} 项已打卡</b><div class="progress"><i style="width:${rows.length ? Math.round(done / rows.length * 100) : 0}%"></i></div></div>
      ${rows.map((x) => `<div class="mat-row${x.done ? ' done' : ''}">
        <input type="checkbox" ${x.done ? 'checked' : ''} data-action="iso-check" data-key="${x.key}" aria-label="${esc(x.item)}：点击切换打卡状态">
        <div class="mat-main"><b>${esc(x.item)}</b><p><b class="muted">对象：</b>${esc(x.who)}${x.note ? ' · ' + esc(x.note) : ''}</p></div>
        ${pill(x.done ? '已打卡' : '未打卡', x.done ? 'green' : 'grey')}
      </div>`).join('')}
    </div>
    <p class="small-note" style="margin-top:10px">打卡状态保存在本页（演示仅内存）；对具体的接触限制有疑问时，直接对照「RAI 治疗记录」页签里的出院指导原文，或问核医学科。</p>`;
}
function pageDiet() {
  const p = profile();
  const d = p.rai.diet;
  const list = [...(d.entries || []), ...added('diet')];
  return `${pageHeadFor('低碘饮食起止 + 口干/唾液腺症状日记；吃什么、吃多少听医生与营养科。', btn('＋ 记一条症状', 'diet-add', 'primary'))}
    <div class="stage-strip" data-product="低碘起止"><span class="eyebrow">低碘饮食（按医嘱日期）</span><b>${esc(d.lowIodineFrom)} → ${esc(d.lowIodineTo)}</b><small>${esc(d.quote)}</small></div>
    <div class="card" data-product="口干与唾液腺日记">
      <div class="card-head"><div><h3>口干 / 唾液腺症状日记</h3><p>只记发生与缓解；不做归因。</p></div></div>
      ${list.map((x) => `<div class="row"><div class="row-main"><div><b>${longDate(x.d)}</b><p>${esc(x.text)}</p></div></div>${authorTag(x.author)}</div>`).join('') || '<p class="small-note" style="margin:0">还没有记录。</p>'}
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>治疗后反应留痕</h3><p>颈部肿胀、唾液腺胀痛等，治疗后的身体反应逐条留痕。</p></div></div>
        ${(p.rai.reactions || []).map((x) => `<div class="row"><div class="row-main"><div><b>${longDate(x.d)}</b><p>${esc(x.text)}</p></div></div>${authorTag(x.author)}</div>`).join('') || '<p class="small-note" style="margin:0">还没有记录。</p>'}
      </div>
      <div class="card"><div class="card-head"><div><h3>这一页不做什么</h3></div></div>
        <div class="flag-list"><div>不开低碘食谱——怎么吃请医生与营养科说明</div><div>不做"碘摄入量"计算</div><div>备孕期碘营养问题单独问医生（联动妊娠与生育线）</div></div>
      </div>
    </div>`;
}
function pageWbs() {
  const p = profile();
  return `${pageHeadFor('Rx-WBS（治疗后全身显像）报告原文 + 治疗后反应留痕；显像结论只抄原文。')}
    <div class="card" data-product="治疗后扫描">
      ${(p.rai.wbs || []).map((w) => `<div class="row"><div class="row-main"><div><b>${esc(w.kind)} · ${longDate(w.d)}</b><blockquote class="reaction-quote" style="margin:6px 0 0">${esc(w.quote)}</blockquote><p>后续：${esc(w.next)}</p></div></div>${pill('报告原文', 'blue')}</div>`).join('') || '<div class="empty"><h3>还没有显像记录</h3><p>做完治疗后，把报告原文登记进来。</p></div>'}
    </div>
    <p class="small-note" style="margin-top:10px">「摄取」「未见明确转移灶」等表述都是显像报告的原文词——含义与后续处理请医生解释；本台不解读显像。</p>
    <div class="actions" style="margin-top:10px">${go('看 Tg·TgAb 趋势', 'followup', 'tg', 'soft')}${go('看颈部超声并列', 'followup', 'us', 'soft')}</div>`;
}

/* ================= 随访与调药（T2/T4/T5/T7：长程主轴） ================= */
function pageCalendar() {
  const p = profile();
  const rows = (p.calendar || []).flatMap((y) => y.rows.map((r) => ({ ...r, year: y.year })));
  const next = rows.find((r) => !r.done);
  return `${pageHeadFor('随访日历按"治疗应答分层"展示递减密度（年度语境，非周期式）+ 轻提醒；"要跟一辈子？"——节奏由医生定，本台不暗示可以少查（T6/T7）。')}
    <div class="stage-strip" data-product="下次随访"><span class="eyebrow">下次随访 · 轻提醒</span><b>${next ? `${next.d} · ${next.item}` : '待医院通知'}</b><small>${next ? esc(next.note) : ''}</small></div>
    ${(p.calendar || []).map((y) => `<div class="card" style="margin-bottom:14px" data-product="随访日历">
      <div class="card-head"><div><h3>${esc(y.year)} 年</h3><p>年度节奏语境；项目与间隔以医嘱语境为准。</p></div>${pill(`${y.rows.length} 项`, 'grey')}</div>
      ${y.rows.map((r) => `<div class="row"><div class="row-main"><div><b>${esc(r.item)}</b><p>${esc(r.d)} · ${esc(r.note || '')}</p></div></div>${pill(r.done ? '已完成' : '待预约', r.done ? 'green' : 'yellow')}</div>`).join('')}
    </div>`).join('')}
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>年度语境说明（T6）</h3></div></div>
        <div class="flag-list"><div>随访是长程的：术后 2 年内密度高、之后按医生安排递减</div><div>本台不暗示可以少查，也不做依从性判定</div><div>每次复查前的疑问先存进「疑问清单」</div></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>下一步</h3></div></div>
        <div class="flag-list"><div>Tg 趋势与口径看「Tg·TgAb 趋势」</div><div>年度超声看「颈部超声并列」</div></div>
        <div class="actions" style="margin-top:12px">${go('看 Tg·TgAb 趋势', 'followup', 'tg', 'soft', 'data-step="to-tg"')}${go('看颈部超声并列', 'followup', 'us', 'soft', 'data-step="to-us"')}${go('去就诊准备与导出', 'docs', 'prepare', 'soft')}</div>
      </div>
    </div>`;
}
function pageTg() {
  const p = profile();
  const tg = seriesAll('TG'), tgab = seriesAll('TGAB');
  const last = tg[tg.length - 1], prev = tg[tg.length - 2];
  const trend = prev && last.v > prev.v;
  return `${pageHeadFor('Tg / TgAb 双指标 + 试剂可比性口径卡；数值照抄化验单，×ULN/状态口径并列；"Tg 变化了"——不判复发（T4）。', btn('＋ 抄一次化验单', 'tg-add', 'primary'))}
    <div class="notice blue" data-product="口径卡"><b>Tg 数值的三个口径，缺一不可比：</b>① 抑制状态 vs 刺激状态（来源标注在每条记录）；② TgAb 阳性时 Tg 不可比（本档案：${esc((p.tgabNote || '').split('；')[0])}）；③ 换实验室/试剂时留痕（记录里标注"同一实验室同一试剂平台"）。${esc(p.tgabNote || '')}</div>
    <div class="card" data-product="Tg 序列">
      <div class="card-head"><div><h3>Tg（甲状腺球蛋白）</h3><p>${last ? `最近 ${longDate(last.d)} · ${fmtNum(last.v, 2)} ng/mL${prev ? `（前次 ${fmtNum(prev.v, 2)}）` : ''}` : '暂无记录'}</p></div>${trend ? pill('趋势向上 → 报告医生', 'yellow') : pill('数值照抄 · 不判定', 'grey')}</div>
      ${tg.slice().reverse().map((x) => `<div class="row"><div class="row-main"><div><b>${fmtNum(x.v, 2)} ng/mL</b><p>${longDate(x.d)} · ${esc(x.src)}</p></div></div></div>`).join('') || '<p class="small-note" style="margin:0">还没有记录。</p>'}
      <p class="small-note" style="margin-top:8px">${esc(CATALOG.TG.note)}</p>
    </div>
    <div class="card" style="margin-top:14px" data-product="TgAb 序列">
      <div class="card-head"><div><h3>TgAb（抗 Tg 抗体）</h3><p>与 Tg 同窗同测；阳阴性状态由化验单标注，本台照抄。</p></div></div>
      ${tgab.slice().reverse().map((x) => `<div class="row"><div class="row-main"><div><b>${fmtNum(x.v, 0)} IU/mL</b><p>${longDate(x.d)} · ${esc(x.src)}</p></div></div></div>`).join('') || '<p class="small-note" style="margin:0">还没有记录。</p>'}
    </div>
    <div class="actions" style="margin-top:10px">${go('看 TSH 目标与甲功', 'followup', 'tsh', 'soft', 'data-step="to-tsh"')}${go('看病情一图秀', 'chart', '', 'soft', 'data-step="to-chart"')}</div>`;
}
function pageUs() {
  const p = profile();
  const list = [...(p.us || []), ...added('us')];
  return `${pageHeadFor('颈部超声并列三列：TI-RADS 原文 / 淋巴结测量原文 / 当时 Tg——只并列事实，不做判读（T4/T5）。', btn('＋ 登记超声报告', 'us-add', 'primary'))}
    <div class="notice blue"><b>TI-RADS 分类只存体系名+报告原文，本台不自评。</b>${esc(p.usNote || '')} 结节"变小了/变大了"这类比较由报告医生做出，本台不比较。</div>
    ${list.map((u) => `<div class="card" style="margin-bottom:14px" data-product="超声并列">
      <div class="card-head"><div><span class="eyebrow">${longDate(u.d)} · ${esc(u.kind)}</span></div>${pill('报告原文', 'blue')}</div>
      <div class="table-wrap"><table><tbody>
        <tr><th style="width:150px">TI-RADS（原文）</th><td>${esc(u.tirads)}</td></tr>
        <tr><th>淋巴结测量（原文）</th><td>${esc(u.measure)}</td></tr>
        <tr><th>当时 Tg</th><td><b>${u.tgAtTime != null ? fmtNum(u.tgAtTime, 2) + ' ng/mL' : '未同窗'}</b> <span class="muted">· ${esc(u.tgSrc || '')}</span></td></tr>
        <tr><th>报告结论（原文）</th><td>${esc(u.excerpt)}</td></tr>
        <tr><th>下次</th><td>${esc(u.next)}</td></tr>
      </tbody></table></div>
    </div>`).join('')}
    <div class="actions" style="margin-top:10px">${go('看 Tg·TgAb 趋势', 'followup', 'tg', 'soft', 'data-step="to-tg"')}${go('把疑问记下来', 'docs', 'prepare', 'soft', 'data-step="to-questions"')}</div>`;
}
function pageDose() {
  const p = profile();
  const list = [...(p.followup.doseTimeline || []), ...added('dose')];
  return `${pageHeadFor('剂量时间线 = 版本链：医生每次调整新增一条，旧记录保留；"为什么加减量"——调整理由以医生解释为准（T2 零调药建议）。', btn('＋ 登记剂量变更（医嘱原文）', 'dose-add', 'primary'))}
    <div class="notice blue"><b>本台零调药建议。</b>剂量调整只发生在医生诊室里；这里记录的是已经发生的变更（医嘱原文）。</div>
    <div class="card" data-product="剂量时间线">
      ${list.map((x, i) => `<div class="detour-card${i === list.length - 1 ? ' end' : ''}">
        <span class="tl-dot" aria-hidden="true"></span>
        <div class="detour-body"><div class="det-head"><b>${esc(x.item)}</b><span class="place">${longDate(x.d)} · ${esc(x.version || '')}</span></div>
        <blockquote>${esc(x.quote)}</blockquote></div>
      </div>`).join('') || '<p class="small-note" style="margin:0">还没有记录。</p>'}
      <p class="small-note" style="margin-top:8px">${esc(p.followup.doseNote)}</p>
    </div>
    <div class="actions" style="margin-top:10px">${go('看 TSH 目标与甲功', 'followup', 'tsh', 'soft', 'data-step="to-tsh"')}</div>`;
}
function pageTsh() {
  const p = profile();
  const t = p.followup.tshTarget;
  const tsh = seriesAll('TSH'), ft4 = seriesAll('FT4');
  const lastT = tsh[tsh.length - 1];
  return `${pageHeadFor('医生给的 TSH 目标原文与化验数值并列；本台不计算"是否达标"——达标与否由医生评估（T2）。', moreMenu([['更正目标记录', 'manual-edit', 'data-code="tshtarget"']]))}
    <div class="stage-strip" data-product="TSH 目标原文"><span class="eyebrow">TSH 控制目标（医生维护）</span><b>${esc(t.range)}</b><small>${esc(t.quote)} · ${esc(t.updated)}</small></div>
    <p class="small-note" style="margin:10px 0 14px">${esc(t.note)}</p>
    <div class="card" data-product="TSH 序列">
      <div class="card-head"><div><h3>TSH（促甲状腺激素）</h3><p>${lastT ? `最近 ${longDate(lastT.d)} · ${fmtNum(lastT.v, 2)} mIU/L（目标 ${esc(t.range)} 原文并列如上）` : '暂无记录'}</p></div>${pill('并列展示 · 不计算', 'grey')}</div>
      ${tsh.slice().reverse().map((x) => `<div class="row"><div class="row-main"><div><b>${fmtNum(x.v, 2)} mIU/L</b><p>${longDate(x.d)} · ${esc(x.src)}</p></div></div></div>`).join('')}
    </div>
    <div class="card" style="margin-top:14px" data-product="FT4 序列">
      <div class="card-head"><div><h3>FT4（游离甲状腺素）</h3><p>与 TSH 同窗；参考区间照化验单原文。</p></div></div>
      ${ft4.slice().reverse().map((x) => `<div class="row"><div class="row-main"><div><b>${fmtNum(x.v, 1)} pmol/L</b><p>${longDate(x.d)} · ${esc(x.src)}</p></div></div></div>`).join('')}
    </div>
    <div class="actions" style="margin-top:10px">${go('看剂量时间线', 'followup', 'dose', 'soft')}${go('看骨与心血管', 'followup', 'bone', 'soft')}</div>`;
}
function pageBone() {
  const p = profile();
  return `${pageHeadFor('长程 TSH 抑制期的骨与心血管监测：与年度复查同窗记录、原文照抄，不做风险判定。')}
    <div class="card" data-product="骨与心血管同窗记录">
      <div class="card-head"><div><h3>同窗记录（不判定）</h3><p>与「随访日历」的年度复查同窗；报告原文照抄。</p></div></div>
      ${(p.bone.rows || []).map((r) => `<div class="row"><div class="row-main"><div><b>${esc(r.item)}</b><p>${longDate(r.d)} · ${esc(r.quote)}</p></div></div>${pill('报告原文', 'blue')}</div>`).join('') || '<p class="small-note" style="margin:0">还没有同窗记录。</p>'}
    </div>
    <p class="small-note" style="margin-top:10px">${esc(p.bone.note)}</p>
    <div class="actions" style="margin-top:10px">${go('看随访日历', 'followup', 'calendar', 'soft')}</div>`;
}

/* ================= 妊娠与生育（T7：状态机 + 记录不判定） ================= */
function pagePrep() {
  const p = profile();
  const f = p.fertility;
  if (!f) {
    return `${pageHeadFor('本档案暂无备孕/妊娠计划；若计划变化，在这里登记冷却期与间隔说明（以医生意见原文为准）。')}
      <div class="empty" data-product="冷却期"><h3>暂无备孕计划记录</h3><p>备孕、妊娠与 RAI 的间隔规则（男 2 月 / 女 6–12 月）按出院指导与医生答复原文执行；需要记录时从这里开始。</p></div>
      <div class="actions" style="margin-top:10px">${go('看 RAI 治疗记录', 'rai', 'records', 'soft')}</div>`;
  }
  const c = f.cooldown;
  const days6 = daysBetween(TODAY, c.from), days12 = daysBetween(TODAY, c.to);
  const clamp = (n) => Math.max(0, n);
  return `${pageHeadFor('冷却期倒计时 + 间隔说明；倒计时只是日期算术，何时开始备孕以医生意见为准（记录不判定）。', moreMenu([['更正冷却期起算', 'manual-edit', 'data-code="cooldown"']]))}
    <div class="notice blue"><b>RAI 冷却期（女性 6–12 月语境，原文引用）</b>${esc(c.quote)}</div>
    <div class="countdown-grid" data-product="冷却期倒计时">
      <div class="count-card"><span class="eyebrow">满 6 个月 · ${esc(c.fromNote)}</span><b>${clamp(days6) > 0 ? `还有 ${days6} 天` : '已满'}</b><small>${esc(c.from)}（起算：碘治疗日 ${esc(c.raiDate)}）</small></div>
      <div class="count-card"><span class="eyebrow">满 12 个月 · ${esc(c.toNote)}</span><b>${clamp(days12) > 0 ? `还有 ${days12} 天` : '已满'}</b><small>${esc(c.to)}</small></div>
      <div class="count-card"><span class="eyebrow">当前状态</span><b>${esc(f.state)}</b><small>下次复诊议题：何时开始备孕（以医生意见为准）</small></div>
    </div>
    <div class="card" style="margin-top:14px" data-product="间隔说明">
      <div class="card-head"><div><h3>间隔说明（原文引用）</h3><p>男 2 月 / 女 6–12 月——以出院指导与医生答复原文为准。</p></div>${pill('引用原文', 'blue')}</div>
      <blockquote class="reaction-quote">${esc((p.rai.courses[0] || {}).dischargeQuote || '—')}</blockquote>
      <p class="small-note">${esc(c.note)}</p>
    </div>
    <div class="help-box">孕期状态下碘治疗入口自动屏蔽（禁忌提示常驻，见「孕期与产后管理」）；备孕期间如需新做 RAI，间隔重新起算——以核医学科意见为准。</div>`;
}
function pagePreg() {
  const p = profile();
  const f = p.fertility;
  return `${pageHeadFor('孕期与产后：LT4 加量说明、每 4 周甲功提醒、产后回调与 6 周复查、Tg/超声顺延说明——全部按记录不判定（T7）。')}
    <div class="notice red-box" data-product="RAI 禁忌提示"><b>妊娠状态：碘治疗入口已屏蔽。</b>孕期 RAI 为禁忌（禁忌提示常驻）；本页不提供任何碘治疗登记入口。</div>
    ${f ? `${f.pregCards.map((c) => `<div class="card" style="margin-bottom:14px" data-product="孕期说明卡">
      <div class="card-head"><div><h3>${esc(c.title)}</h3></div>${pill('记录不判定', 'mist')}</div>
      <blockquote class="reaction-quote">${esc(c.quote)}</blockquote>
      <div class="flag">${esc(c.flag)}</div>
    </div>`).join('')}
    <div class="card" data-product="产后管理">
      <div class="card-head"><div><h3>产后管理（说明卡）</h3><p>节奏来自医生书面说明原文；具体以医生安排为准。</p></div></div>
      ${(f.postpartum || []).map((x) => `<div class="row"><div class="row-main"><div><p style="margin:0">${esc(x)}</p></div></div></div>`).join('')}
    </div>` : `<div class="empty"><h3>本档案暂无备孕/妊娠记录</h3><p>「备孕与 RAI 冷却期」页签登记计划后，这里会出现孕期与产后说明卡。</p></div>`}
    <p class="small-note" style="margin-top:10px">本页所有卡片都是「记录 + 原文引用」：孕期 Tg 一过性升高 ≠ 复发，也不等于没事；解读归产科与内分泌医生。</p>
    <div class="actions" style="margin-top:10px">${go('看 Tg·TgAb 趋势', 'followup', 'tg', 'soft')}${go('看随访日历', 'followup', 'calendar', 'soft')}</div>`;
}

/* ================= 病情一图秀 ================= */
function pageChart() {
  const sel = state.sel[state.profileId];
  const [t0, t1] = domain();
  const groups = CAT_ORDER.map((cat) => ({ cat, items: Object.keys(CATALOG).filter((c) => CATALOG[c].cat === cat) }));
  return `${pageHeadFor('Tg/TSH/体重放回同一段时间；ATA 分层与 TI-RADS 是分类节点，只画节点不连线。')}
    <div class="overview">
      <aside class="rail">
        <details class="pick" open><summary>指标选择<small>${sel.length}/4</small></summary>
          <div class="metric-list">
            ${groups.map((g) => `<div class="cat-label">${esc(g.cat)}</div>${g.items.map((c) => {
    const m = CATALOG[c];
    const all = seriesAll(c);
    const on = sel.includes(c);
    return `<label class="metric-pick"><input type="checkbox" data-action="sel" data-code="${c}" ${on ? 'checked' : ''}><i style="background:${m.color}"></i><span>${esc(m.name)}</span><small>${all.length ? (m.categorical ? (all[all.length - 1].label || '') : fmtNum(all[all.length - 1].v, m.dec) + ' ' + m.unit) : '无记录'}</small></label>`;
  }).join('')}`).join('')}
          </div>
        </details>
        <section><h3>时间窗</h3>
          <div class="chips">${[['all', '全期'], ['12m', '近 12 月'], ['6m', '近 6 月']].map(([k, n]) => `<button class="chip" aria-pressed="${state.range === k}" data-action="range" data-range="${k}">${n}</button>`).join('')}</div>
          <div class="zoom"><input type="range" min="40" max="100" value="${state.zoom}" data-action="zoom" aria-label="缩放时间窗（右端锚定最新）"><span>${state.zoom}%</span></div>
        </section>
        <section><h3>图层</h3>
          <div class="chips">
            <button class="chip" aria-pressed="${state.toggles.treatment}" data-action="toggle" data-key="treatment">手术/碘131/超声节点</button>
            <button class="chip" aria-pressed="${state.toggles.keypoints}" data-action="toggle" data-key="keypoints">末点数值</button>
          </div>
        </section>
      </aside>
      <div class="timeline-main">
        <div class="chart-panel" id="chart-panel" data-product="一图秀">
          <div class="chart-top">
            <div class="legend">${sel.filter((c) => seriesAll(c).length).map((c) => {
    const s = seriesFor(c, t0, t1);
    return `<span><i style="background:${CATALOG[c].color}"></i><b>${esc(CATALOG[c].name)}</b><span class="range">${CATALOG[c].categorical ? '分类节点' : `全期 ${fmtNum(s.lo, CATALOG[c].dec)}–${fmtNum(s.hi, CATALOG[c].dec)} ${esc(CATALOG[c].unit)}`}</span></span>`;
  }).join('')}</div>
            <div class="chips"><button class="chip" data-action="unpin" ${state.pin ? '' : 'hidden'}>收起固定点</button></div>
          </div>
          <div class="chart-wrap"><div class="scroll-hint">表格与曲线过宽时可横向滚动（有意为之）→</div>${chartSVG(t0, t1)}</div>
          ${state.pin ? (() => {
    const s = seriesAll(state.pin.code).find((x) => x.d === state.pin.date);
    const m = CATALOG[state.pin.code];
    if (!s) return `<div class="pin"><div><b>该记录已不在当前时间窗</b><p>扩大时间范围或取消固定后可回看。</p></div>${btn('收起', 'unpin', 'soft')}</div>`;
    return `<div class="pin"><div><b>${esc(m.name)} ${m.categorical ? esc(s.label || '') : fmtNum(s.v, m.dec) + ' ' + esc(m.unit)} · ${longDate(s.d)}</b><p>来源：${esc(s.src || '演示数据')}</p><p class="muted">原型不打开真实原件；接入后这里跳到该条记录并高亮。</p></div>${btn('收起', 'unpin', 'soft')}</div>`;
  })() : ''}
        </div>
        <p class="small-note">手术/碘131/超声节点画在数据区上方独立泳道，关掉图层后曲线位置不变；分层与 TI-RADS 分类节点不连线（红线）；超过 4 条序列会被回弹并提示。</p>
      </div>
    </div>`;
}

/* ================= 营养与生活 ================= */
function pageConcerns() {
  const p = profile();
  return `${pageHeadFor('TSH 抑制期代谢与体重、补钙与服药间隔：三说明 + 跳转；"老饿、心悸，能吃点什么"——只记事实，不做归因。')}
    <div class="grid two">
      <div class="card" data-product="TSH 抑制期语境三说明">
        <div class="card-head"><div><h3>三说明（语境，不是诊断）</h3></div></div>
        ${(p.concerns.notes || []).map((x) => `<div class="row"><div class="row-main"><div><p style="margin:0">${esc(x)}</p></div></div></div>`).join('')}
      </div>
      <div class="card"><div class="card-head"><div><h3>去记一条</h3><p>身体的事、吃的事、情绪的事分开放。</p></div></div>
        <div class="flag-list"><div>身体感受 → 「症状日记」页签（强度轨道）</div><div>吃与体重 → 「进食与体重」页签</div><div>情绪与家人 → 「心理与家庭」线</div></div>
        <div class="actions" style="margin-top:12px">${go('去症状日记', 'care', 'symptoms', 'soft')}${go('去进食与体重', 'care', 'intake', 'soft')}${go('去当下感受', 'mind', 'feelings', 'soft')}</div>
      </div>
    </div>
    <p class="small-note" style="margin-top:10px">体重曲线在一图秀里与 Tg/TSH 同窗可看（联动剂量变更节点）；是否与药物相关由医生判断。</p>`;
}
function pageIntake() {
  const p = profile();
  const wt = seriesAll('WEIGHT');
  const meals = mem().meals || [];
  const last = wt[wt.length - 1];
  return `${pageHeadFor('只记"吃了多少、体重多少"；TSH 抑制期代谢语境的解读归医生与营养科。')}
    <div class="grid two">
      <div class="card" data-product="体重记录">
        <div class="card-head"><div><h3>体重（照护者可代记）</h3><p>${last ? `最近 ${longDate(last.d)} · ${fmtNum(last.v, 1)} kg` : '暂无记录'}</p></div></div>
        ${wt.slice(-6).reverse().map((x) => `<div class="row"><div class="row-main"><div><b>${fmtNum(x.v, 1)} kg</b><p>${esc(x.src || '')}</p></div></div>${pill(longDate(x.d), 'grey')}</div>`).join('')}
        <div class="form-grid" style="margin-top:12px"><div><label class="form-label" for="wt-quick">今天早上称了（kg）</label><input id="wt-quick" inputmode="decimal" placeholder="如 52.5"></div></div>
        <div class="actions" style="margin-top:10px">${btn('记下体重', 'wt-save', 'soft')}</div>
      </div>
      <div class="card" data-product="进食记录">
        <div class="card-head"><div><h3>今天吃了什么量</h3><p>三顿快记；量与搭配的调整听营养科。</p></div></div>
        <div class="actions" style="gap:8px">${['早餐', '午餐', '晚餐'].map((meal) => btn(`记${meal}`, 'meal-log', 'soft', `data-meal="${meal}"`)).join('')}</div>
        <div style="margin-top:12px">${meals.slice(-6).reverse().map((x) => `<div class="row"><div class="row-main"><div><b>${esc(x.meal)}</b><p>已记 · ${longDate(x.d)}</p></div></div></div>`).join('') || '<p class="small-note" style="margin:0">还没记；点上面的按钮即可。</p>'}</div>
      </div>
    </div>
    <div class="notice" style="margin-top:14px"><b>TSH 抑制期语境三说明：</b>① 怕热、心悸、食欲变化常被提及，是否与药物相关由医生判断；② 体重变化请结合症状日记给医生看；③ 补钙剂/备孕补充剂与左甲状腺素间隔 4 小时以上（医嘱语境）——本页只记事实。</div>
    <div class="actions" style="margin-top:10px">${go('去当下困扰', 'care', 'concerns', 'soft', 'data-step="to-concerns"')}</div>`;
}
function pageSymptoms() {
  const p = profile();
  const list = [...(p.symptoms || []), ...added('sym')];
  return `${pageHeadFor('心悸/怕热/乏力/便秘按强度轨道记（轻1/中2/重3）；不画曲线、不归因。', btn('＋ 记一条症状', 'sym-add', 'primary'))}
    <div class="notice blue">${esc(p.symptomsNote || '')}</div>
    <div class="card" data-product="症状轨道">
      ${list.map((x) => `<div class="row"><div class="row-main"><div><b>${esc(x.kind)} · 强度 ${x.intensity}${'●'.repeat(x.intensity)}${'○'.repeat(3 - x.intensity)}</b><p>${longDate(x.d)} · ${esc(x.note || '')}</p></div></div>${authorTag(x.author)}${pill('强度轨道', 'grey')}</div>`).join('') || '<p class="small-note" style="margin:0">还没有记录。</p>'}
    </div>
    <div class="help-box">强度轨道只打卡不连线（分类记录）；症状持续或加重时联系医生——本台不做归因，也不给处理建议。</div>`;
}

/* ================= 心理与家庭 ================= */
function pageFeelings() {
  const p = profile();
  const shared = sharedOnly(p);
  const hidden = privateCount(p);
  return `${pageHeadFor('默认只属于你：private 的记录不进看板摘要、不进导出、不进 AI 上下文。"都说 good cancer，怎么没人当真"——这里可以记。', btn('＋ 记一条感受', 'feel-add', 'primary'))}
    <div class="grid two">
      <div class="card" data-product="感受记录">
        <div class="card-head"><div><h3>可共享（shared）</h3><p>会出现在导出的看法区，且标注"不是医生结论"。</p></div>${pill(`${shared.length} 条`, 'blue')}</div>
        ${shared.map((v) => `<div class="row"><div class="row-main"><div><b>${esc(v.content)}</b><p>${longDate(v.date)} · ${v.role === 'PATIENT' ? '本人' : '照护者'} · ${esc(v.topic)}</p></div></div>${pill('shared', 'blue')}</div>`).join('') || '<p class="small-note" style="margin:0">还没有共享的感受。</p>'}
      </div>
      <div class="private" data-product="私密区">
        <h3>私密（private）· ${hidden} 条</h3>
        <p class="small-note">本页是私密记录的"家"：列表只对本人展示；复发恐惧这类话先写在这里，其他出口统一过滤。</p>
        <div style="margin-top:10px">${(p.viewpoints || []).filter((v) => v.visibility === 'private').map((v) => `<div class="row"><div class="row-main"><div><b>${esc(v.content)}</b><p>${longDate(v.date)} · ${v.role === 'PATIENT' ? '本人' : '照护者'} · ${esc(v.topic)}</p></div></div>${pill('private', 'mist')}</div>`).join('')}</div>
      </div>
    </div>
    <div class="help-box">三出口过滤共用同一个函数（sharedOnly）：看板摘要、导出预览、AI 上下文。想带私密内容进 AI 时逐条显式勾选，草稿预览会标红提醒。</div>
    <div class="actions" style="margin-top:10px">${go('去支持资源与照护者', 'mind', 'support', 'soft')}</div>`;
}
function pageGenetic() {
  const p = profile();
  const g = p.genetic;
  return `${pageHeadFor('遗传与家系：MTC-RET 胚系语境 + 一级亲属提示（家属只加提示不加判定，26 §5）；只列医生答复原文。')}
    <div class="notice blue"><b>${esc(g.note)}</b></div>
    <div class="card" data-product="遗传问答留痕">
      <div class="card-head"><div><h3>问了什么、医生怎么答（原文）</h3><p>家系问题的答复逐条留痕；本页不加任何判定。</p></div></div>
      ${(g.qa || []).map((x) => `<div class="qa-item"><div class="qa-q">${esc(x.q)}</div><blockquote>${esc(x.a)}</blockquote></div>`).join('') || '<p class="small-note" style="margin:0">还没有问答留痕。</p>'}
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>三态口径同样适用</h3></div></div>
        <div class="flag-list"><div>RET 胚系：未检测 ≠ 阴性（与「分子与基因」同一口径）</div><div>MTC/ATC 一期只做「见报告原文」标注</div><div>家系筛查是否需要、查什么，由医生发起</div></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>下一步</h3></div></div>
        <div class="flag-list"><div>想问的问题先记进「疑问清单」</div><div>情绪话题去「当下感受」（默认私密）</div></div>
        <div class="actions" style="margin-top:12px">${go('去就诊准备与导出', 'docs', 'prepare', 'soft')}${go('去当下感受', 'mind', 'feelings', 'soft', 'data-step="to-feelings"')}</div>
      </div>
    </div>`;
}
function pageSupport() {
  const p = profile();
  return `${pageHeadFor('支持资源与照护者：可核实条目只列不荐；配偶 FCR 双源独立记录（user-research §8）。')}
    <div class="grid two">
      <div class="card" data-product="支持资源">
        <div class="card-head"><div><h3>支持资源（只列可核实条目）</h3><p>参加与否自行判断；本台不做推荐。</p></div></div>
        <div class="flag-list"><div>医院心理门诊 / 心理热线（属地卫健委公布渠道）</div><div>患者社群与病友组织（以官方登记信息为准）</div><div>随访疲劳话题可与医生谈——本台只提供记录位</div></div>
      </div>
      <div class="card" data-product="照护者">
        <div class="card-head"><div><h3>照护者（${esc(p.caregiverLabel)}）</h3><p>代记条目带徽章；照护者自己的感受单独记录。</p></div></div>
        <div class="flag-list"><div>FCR 双源：患者与配偶的「复发恐惧」各自独立记录，不合并、不代报</div><div>代记口径见「看板」双主体说明</div></div>
        <div class="actions" style="margin-top:12px">${go('去当下感受（双源记录）', 'mind', 'feelings', 'soft')}</div>
      </div>
    </div>
    <div class="card" style="margin-top:14px" data-product="代记与家事">
      <div class="card-head"><div><h3>家事与代记留痕</h3><p>抽血陪诊、材料经办、家事安排——shared/private 按条标注。</p></div></div>
      ${(p.family || []).map((x) => `<div class="row"><div class="row-main"><div><b>${esc(x.topic)} · ${esc(x.content)}</b><p>${longDate(x.d)} · ${x.author === 'CAREGIVER' ? '照护者' : '本人'}${x.witnessed ? ' · 经本人确认（witnessed）' : ''}</p></div></div>${pill(x.visibility === 'private' ? 'private' : 'shared', x.visibility === 'private' ? 'mist' : 'blue')}</div>`).join('')}
    </div>`;
}

/* ================= 复诊与资料 ================= */
function pageSchedule() {
  const p = profile();
  const m = mem();
  const rows = p.materials.map((x) => ({ ...x, st: m.materials[x.id] || x.state }));
  const ready = rows.filter((x) => x.st === 'ready').length;
  return `${pageHeadFor('终生节奏 + 材料清单；材料只整理复诊与报销事项，无职业病线（THY 无此线）。')}
    <div class="card" data-product="复诊节奏">
      <div class="milestones">
        ${p.rhythm.map((r) => `<div class="milestone"><span class="dot"></span><div><b>${esc(r.item)}</b><p>频率：${esc(r.freq)} · 依据：${esc(r.guideline)}</p></div><small>${esc(r.next)}</small></div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:14px" data-product="材料清单">
      <div class="card-head"><div><h3>材料清单（三态勾选）</h3><p>${ready} / ${rows.length} 项已备齐 · ${esc(DATA.meta.materialNote)}</p></div></div>
      <div class="mat-list">
        ${rows.map((x) => `<div class="mat-row${x.st === 'ready' ? ' done' : ''}">
          <input type="checkbox" ${x.st === 'ready' ? 'checked' : ''} data-action="mat-check" data-id="${x.id}" ${x.st === 'partial' ? 'data-partial="1"' : ''} aria-label="${esc(x.name)}：当前${x.st === 'ready' ? '已备齐' : x.st === 'partial' ? '部分备齐' : '未备齐'}，点击切换">
          <div class="mat-main"><b>${esc(x.name)}</b><p><b class="muted">为什么：</b>${esc(x.why)}</p></div>
          ${pill(x.st === 'ready' ? '已备齐' : x.st === 'partial' ? '部分备齐' : '未备齐', x.st === 'ready' ? 'green' : x.st === 'partial' ? 'yellow' : 'grey')}
        </div>`).join('')}
      </div>
    </div>
    <div class="actions" style="margin-top:10px">${go('去就诊准备与导出', 'docs', 'prepare', 'soft')}</div>`;
}
function pageLibrary() {
  const p = profile();
  return `${pageHeadFor('导入 → 解析（MinerU 管线按 18 号）→ 候选 → 核对；接受之前都只是候选。', btn('＋ 导入文件', 'doc-add', 'primary'))}
    <div class="flow-steps"><span class="on">选文件</span><span>解析（本机 / 云端）</span><span>候选字段</span><span>逐项核对</span><span>入库</span></div>
    <div class="card" data-product="资料库">
      <div class="table-wrap"><table><thead><tr><th>文件</th><th>类型</th><th>大小</th><th>状态</th><th></th></tr></thead><tbody>
        ${p.documents.map((d) => `<tr><td><b>${esc(d.name)}</b></td><td>${pill(d.kind, 'grey')}</td><td class="num">${esc(d.size)}</td><td>${pill(d.status, d.status === '已核对' ? 'green' : 'yellow')}</td><td>${btn('看原文', 'src', 'text-button', `data-src="${esc(d.name)}"`)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small-note">原件存放在你选的资料目录；主目录 / 根目录 / 桌面根会被拒绝。云端解析需在 设置 · 文档解析 配置 Token。</p>
    </div>
    <div class="actions" style="margin-top:14px">${go('去整理草稿与核对', 'docs', 'candidates', 'soft', 'data-step="to-candidates"')}</div>`;
}
function pageCandidates() {
  const p = profile();
  const list = p.candidates || [];
  return `${pageHeadFor('解析候选逐项核对：确认才入事实层；每项可拒，拒收无副作用。')}
    <div class="notice blue"><b>接受 ≠ 审核。</b>候选来自解析结果，只有你逐项确认后才算已核对记录；本页演示三态（待核对 / 已入库 / 已拒收）。</div>
    <div data-product="候选核对">
      ${list.map((c) => `<div class="row">
        <div class="row-main"><div><b>${esc(c.field)}：${esc(c.value)}</b><p>${esc(c.src)}</p></div></div>
        <div class="actions">${pill(c.state, c.state === '已入库' ? 'green' : c.state === '已拒收' ? 'grey' : 'yellow')}${c.state === '待核对' ? btn('确认入库', 'cand-accept', 'soft', `data-id="${c.id}"`) + btn('拒收', 'cand-reject2', 'soft', `data-id="${c.id}"`) : ''}</div>
      </div>`).join('') || '<div class="empty"><h3>没有待核对候选</h3><p>从「资料库与导入」导入文件后会出现在这里。</p></div>'}
    </div>
    <div class="help-box">更正=新增版本：入库后发现填错，用「⋯ → 改这一条」登记新版本，旧记录保留（不出现"不可恢复"）。</div>`;
}
function pagePrepare() {
  const p = profile();
  const m = mem();
  const ready = p.materials.filter((x) => (m.materials[x.id] || x.state) === 'ready').length;
  return `${pageHeadFor('就诊准备与两区导出（private 过滤）+ 试验线索；试验线索不是推荐（S07/S11）。', btn('＋ 添加疑问', 'q-add', 'primary'))}
    <div class="grid two">
      <div class="card" data-product="疑问清单">
        <div class="card-head"><div><h3>疑问清单</h3><p>${questions().filter((q) => !q.asked).length} 条待问 · ${questions().length} 条累计；勾选=已问。</p></div></div>
        ${questions().map((q) => `<div class="row"><div class="row-main"><div><b>${esc(q.text)}</b><p>${esc(q.src)}</p></div></div><label class="chk"><input type="checkbox" data-action="q-asked" data-id="${q.id}" ${q.asked ? 'checked' : ''} aria-label="标记已问：${esc(q.text)}">已问</label></div>`).join('') || '<p class="small-note" style="margin:0">还没有疑问；点「＋ 添加疑问」。</p>'}
      </div>
      <div class="card" data-product="复诊摘要">
        <div class="card-head"><div><h3>复诊摘要（两区导出）</h3><p>事实区 + 看法区；private 过滤（${privateCount(p)} 条已隐藏）· 材料 ${ready}/${p.materials.length}</p></div></div>
        <div class="flag-list"><div>事实区：只含已核对记录（病理/分层/化验/超声/RAI/剂量）</div><div>看法区：shared 感受，标注"不是医生结论"</div><div>三出口同一过滤：看板 / 导出 / AI 上下文</div></div>
        <div class="actions" style="margin-top:12px">${btn('预览导出（两区）', 'export', 'primary')}${btn('复制 Markdown', 'copy-md', 'soft')}</div>
      </div>
    </div>
    <div class="card" style="margin-top:14px" data-product="试验线索">
      <div class="card-head"><div><h3>试验线索（RET / 靶向语境）</h3><p>${esc(DATA.meta.trialNote)}；试验线索不是推荐，是否适合由研究团队评估。</p></div></div>
      ${(p.trials || []).map((t) => `<div class="row"><div class="row-main"><div><b>${esc(t.title)}</b><p>${esc(t.phase)} · 来源 ${esc(t.source)} · ${esc(t.status)}</p></div></div>${btn(m.savedTrials.includes(t.key) ? '已收藏' : '收藏', 'trial-save', 'soft', `data-key="${esc(t.key)}"`)}</div>`).join('')}
    </div>`;
}
function exportMarkdown(p) {
  const m = mem();
  const shared = sharedOnly(p);
  const lines = ['# 复诊摘要（演示）· ' + TODAY, '', '> 以下内容由本人与照护者整理，不是医生结论；私密记录（private）已过滤，不进本摘要。', ''];
  lines.push('## 一、疑问清单', '');
  questions().filter((q) => !q.asked).forEach((q, i) => lines.push(`${i + 1}. ${q.text}`, `   - 来源：${q.src}`));
  lines.push('', '## 二、事实区（已核对记录）', '');
  lines.push(`- 病理与分层：${p.pathology.typeLabel}；${p.pathology.ataInitialQuote.slice(0, 42)}…（原文见报告）`);
  lines.push(`- TSH 目标（医生维护）：${p.followup.tshTarget.range}（${p.followup.tshTarget.quote.slice(0, 30)}…）`);
  const tg = seriesAll('TG').slice(-1)[0];
  const tsh = seriesAll('TSH').slice(-1)[0];
  if (tg) lines.push(`- 最近 Tg：${fmtNum(tg.v, 2)} ng/mL（${longDate(tg.d)}，${tg.src}）`);
  if (tsh) lines.push(`- 最近 TSH：${fmtNum(tsh.v, 2)} mIU/L（${longDate(tsh.d)}）`);
  const us = (p.us || []).slice(-1)[0];
  if (us) lines.push(`- 最近颈部超声：${longDate(us.d)}；${us.measure}`);
  (p.rai.courses || []).forEach((c) => lines.push(`- 碘-131：${c.d} ${c.kind} ${c.dose}；${c.stay}`));
  (p.followup.doseTimeline || []).slice(-1).forEach((d) => lines.push(`- 当前剂量：${d.item}（${d.d}，医嘱原文）`));
  lines.push('', '## 三、看法区（shared，不是医生结论）', '');
  shared.forEach((v) => lines.push(`- ${longDate(v.date)} · ${v.role === 'PATIENT' ? '本人' : '照护者'}：${v.content}`));
  lines.push('', `> private 记录 ${privateCount(p)} 条未进入本摘要（三出口同一过滤）。`, '');
  return lines.join('\n');
}

const RENDERERS = {
  dash: pageDash,
  tumor: () => ({ pathology: pagePathology, molecular: pageMolecular, recurrence: pageRecurrence, reports: pageReports })[state.sub.tumor || 'pathology'](),
  surgery: () => ({ op: pageOp, voice: pageVoice, calcium: pageCalcium, neck: pageNeck })[state.sub.surgery || 'op'](),
  rai: () => ({ records: pageRaiRecords, isolation: pageIsolation, diet: pageDiet, wbs: pageWbs })[state.sub.rai || 'records'](),
  followup: () => ({ calendar: pageCalendar, tg: pageTg, us: pageUs, dose: pageDose, tsh: pageTsh, bone: pageBone })[state.sub.followup || 'calendar'](),
  fertility: () => ({ prep: pagePrep, preg: pagePreg })[state.sub.fertility || 'prep'](),
  chart: pageChart,
  care: () => ({ concerns: pageConcerns, intake: pageIntake, symptoms: pageSymptoms })[state.sub.care || 'concerns'](),
  mind: () => ({ feelings: pageFeelings, genetic: pageGenetic, support: pageSupport })[state.sub.mind || 'feelings'](),
  docs: () => ({ schedule: pageSchedule, library: pageLibrary, candidates: pageCandidates, prepare: pagePrepare })[state.sub.docs || 'schedule']()
};
function render() {
  const page = RENDERERS[state.page] || pageDash;
  const p = profile();
  const subs = SUBPAGES[state.page];
  $('#nav').innerHTML = PAGES.map(([id, label, ic]) => `<button class="nav-button" aria-current="${state.page === id ? 'page' : 'false'}" data-action="go" data-page="${id}">${icon(ic)}<span>${label}</span>${subs && id === state.page && SUBPAGES[id] ? `<span class="nav-count">${SUBPAGES[id].length}</span>` : ''}</button>`).join('');
  $('#breadcrumb').textContent = PAGES.find((x) => x[0] === state.page)[1] + (subs ? ' / ' + subLabel(state.page) : '');
  $('#profile-name').textContent = `${p.name.replace('（演示）', '')}的资料`;
  $('#profile-meta').textContent = `${p.age} 岁 · ${p.diagnosisShort}`;
  $('#profile-avatar').textContent = p.name[0];
  $('#profile-btn').setAttribute('aria-label', `切换演示档案，当前为${p.name}`);
  $('#main').innerHTML = `<div class="page-enter">${backRow()}${page()}</div>`;
  $('#app-version').textContent = APP_INFO.displayVersion;
  $('#app-build').textContent = APP_INFO.build;
  $('#ver-chip').textContent = APP_INFO.displayVersion;
  $('#ready-store').innerHTML = `<i></i><span>资料目录</span><b>已激活</b>`;
  renderAgent();
}
/* ---------------- AI 面板（20 号合同：开/收/调宽 25–45%，收起不结束会话） ---------------- */
function clampAgentW(w) { return Math.min(45, Math.max(25, w)); }
function renderAgent() {
  const a = state.agent;
  $('#agent-splitter').hidden = !a.open;
  $('#agent-pane').hidden = !a.open;
  $('#agent-toggle').setAttribute('aria-expanded', String(a.open));
  $('#agent-toggle').textContent = a.open ? '收起 AI 对话' : 'AI 对话';
  document.documentElement.style.setProperty('--agent-w', a.w + '%');
  $('#agent-splitter').setAttribute('aria-valuenow', String(Math.round(a.w)));
  if (!a.open) return;
  const body = $('.agent-body');
  const demo = a.draft && AI_DEMOS[a.draft] ? AI_DEMOS[a.draft] : null;
  const candHtml = demo && demo.cand ? `<div class="agent-cand" data-testid="agent-cand">
      <b>演示候选 · 未发送（一切 AI 产出都是候选）</b>
      <p class="cand-title">${esc(demo.cand.title)}</p>
      <ul>${demo.cand.fields.map(([k, v]) => `<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join('')}</ul>
      <small>来源：${esc(demo.cand.src)} · 逐项核对后才入事实层；拒收无副作用</small>
      <div class="actions">
        <button class="primary" data-action="cand-ok">确认入事实层</button>
        <button class="soft" data-action="cand-fix">不对，改一下</button>
        <button class="soft" data-action="cand-reject">不用这条</button>
      </div>
    </div>` : '';
  const staticNote = `<div class="notice plain">这是<b>演示面板</b>：原型未接入真实 AI，不会发送任何内容；真实版本走宿主接口接入。</div>`;
  const demoMsgs = `<div class="agent-msg user"><b>示例输入</b><p>把最近两次 Tg 化验和当时的优甲乐剂量排在一起。</p></div>
    <div class="agent-msg bot"><b>演示回复（未接通）</b><p>真实版本会基于「Tg·TgAb 趋势」的已核对记录生成草稿；本原型不生成内容。</p></div>`;
  body.innerHTML = candHtml + staticNote + (candHtml ? '' : demoMsgs) + `<p class="small-note">私密内容（visibility=private 的感受记录）默认不进入 AI 上下文（sharedOnly 统一过滤）；需要带入时逐条显式勾选。输入框里的草稿只保存在本页，不会自动发送。</p>`;
  const input = $('.agent-foot input');
  if (demo && input) { input.value = demo.prompt; input.setAttribute('aria-label', 'AI 草稿（待你发送，演示不发送）'); }
}
function setAgent(open) {
  state.agent.open = open;
  renderAgent();
}
function agentResize(deltaPct) {
  state.agent.w = clampAgentW(state.agent.w + deltaPct);
  renderAgent();
}
(function agentSplitterInit() {
  const sp = $('#agent-splitter');
  let dragging = false;
  sp.addEventListener('pointerdown', (e) => {
    dragging = true; sp.setPointerCapture(e.pointerId); e.preventDefault();
  });
  sp.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = $('.stage').getBoundingClientRect(); /* 按容器 rect 夹取，不用 window 宽 */
    const pct = ((rect.right - e.clientX) / rect.width) * 100;
    state.agent.w = clampAgentW(pct);
    renderAgent();
  });
  const end = () => { dragging = false; };
  sp.addEventListener('pointerup', end); sp.addEventListener('pointercancel', end);
  sp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { agentResize(2); e.preventDefault(); } /* 变窄 */
    else if (e.key === 'ArrowRight') { agentResize(-2); e.preventDefault(); } /* 变宽 */
    else if (e.key === 'Home') { state.agent.w = 45; renderAgent(); e.preventDefault(); }
    else if (e.key === 'End') { state.agent.w = 25; renderAgent(); e.preventDefault(); }
  });
})();

/* ---------------- 弹窗 ---------------- */
function openProfiles() {
  openModal('切换演示档案', `<div class="notice plain">两套档案各带完整时间线；切换后指标序列、并发症双线、碘档案与页面数据全部换源，私密记录互不可见。</div>
    ${DATA.profiles.map((p) => `<button class="profile-row ${p.id === state.profileId ? 'on' : ''}" data-action="pick-profile" data-id="${p.id}"><div><b>${esc(p.name)} · ${p.age} 岁 · ${p.primaryRole === 'PATIENT' ? '本人主导' : '照护者主导（' + p.caregiverLabel + '）'}</b><p>${esc(p.diagnosis)} · ${esc(p.stageLine)}</p></div><span class="profile-caret">${p.id === state.profileId ? '当前' : '切换'}</span></button>`).join('')}`,
    '<button data-action="close">关闭</button>', '小蝶宝 · 演示');
}
function openSettings(tab) {
  const c = state.cfg;
  openModal('设置', `<div class="cfg-tabs" role="tablist">
      <button role="tab" aria-selected="${tab !== 'parse' && tab !== 'data'}" data-action="cfg-tab" data-tab="ws">工作区</button><button role="tab" aria-selected="${tab === 'parse'}" data-action="cfg-tab" data-tab="parse">文档解析</button><button role="tab" aria-selected="${tab === 'data'}" data-action="cfg-tab" data-tab="data">临床数据包</button>
    </div>
    <div style="margin-top:16px" class="cfg-block" data-tab="ws" ${tab && tab !== 'ws' ? 'hidden' : ''}>
      <h3 style="font-size:12.5px">资料目录</h3>
      <p class="small-note">业务数据放在你选的目录里；主目录、根目录、桌面根会被拒绝。</p>
      <div class="path-row"><code>${esc(c.root)}</code><button class="soft" data-action="pick-root">更改位置</button></div>
      <div class="grid three" style="margin-top:12px">
        <div class="cfg-stat"><b>2.6 GB</b><span>原件与扫描件（估算）</span></div>
        <div class="cfg-stat"><b>0.5 GB</b><span>解析产物（估算）</span></div>
        <div class="cfg-stat"><b>0.2 GB</b><span>本机数据库（估算）</span></div>
      </div>
      <p class="small-note" style="margin-top:12px">上次备份：${esc(c.backupAt)}（演示）。</p>
    </div>
    <div style="margin-top:16px" class="cfg-block" data-tab="parse" ${tab !== 'parse' ? 'hidden' : ''}>
      <h3 style="font-size:12.5px">MinerU 文档解析（18 号）</h3>
      <p class="small-note">TXT/MD/CSV 本机解析；PDF/图片走云端解析需配置 Token。Token 只校验不回显（失败区分 401 / 429 / 网络错误）。</p>
      <div class="actions" style="margin-top:10px"><button class="soft" data-action="token-config">配置 Token</button></div>
      <label class="switch-row" style="margin-top:12px"><input type="checkbox" data-action="consent" ${c.consent ? 'checked' : ''}><span>同意将文件上传至云端解析（不上传时 PDF 无法解析，原件保留在本机）</span></label>
    </div>
    <div style="margin-top:16px" class="cfg-block" data-tab="data" ${tab !== 'data' ? 'hidden' : ''}>
      <h3 style="font-size:12.5px">临床数据包（审慎开启）</h3>
      <p class="small-note">导出结构化病程数据包（不含 private 记录）；导出前会再次提示确认。演示模式不生成真实数据包。</p>
      <div class="actions" style="margin-top:10px"><button class="soft" data-action="export">预览导出（两区）</button></div>
    </div>`,
    '<button data-action="close">关闭</button>', '小蝶宝 · 设置');
}
function openAbout() {
  openModal('关于小蝶宝', `<p><b>小蝶宝 ThyPal</b> · 甲状腺癌工作台 · 交互原型 ${APP_INFO.displayVersion}（构建 ${APP_INFO.build}）</p>
    <p class="small-note">本页为交互原型：未接入 DSH / AI，不读写真实文件；全部数据为合成演示。品牌为占位，色板按 19 号 §9 换肤。</p>`,
    '<button data-action="close">关闭</button>', '关于');
}
function openHelp() {
  openModal('原型操作说明', `<p class="small-note">左侧导航切换 10 条一级线（共 30 个页签）；看板有双主体 8 入口与 13 枚场景 chip（S01–S13）。</p>
    <p class="small-note">每页有「AI 协助示例」按钮：填草稿进面板但不发送；候选需逐项核对才入事实层。显式编辑每页 ≤1 处（＋按钮或 ⋯ 菜单）；删除不存在——更正=新增版本。</p>
    <p class="small-note">指标卡点击翻面；一图秀可勾 4 条序列、缩放时间窗、点节点固定详情；AI 对话面板可拖宽（25%–45%）。</p>`,
    '<button data-action="close">关闭</button>', '帮助');
}
function openExport() {
  const p = profile();
  const md = exportMarkdown(p);
  openModal('复诊摘要（两区导出 · 演示）', `<div class="notice plain">两区 = 事实区（已核对记录）+ 看法区（shared 感受，标注"不是医生结论"）；private ${privateCount(p)} 条已过滤（三出口同一过滤）。</div>
    <pre class="md-preview">${esc(md)}</pre>`,
    `<button class="soft" data-action="copy-md">复制 Markdown</button><button data-action="close">关闭</button>`, '导出预览');
}
function openQuickForm() { openModal('快录一项', `<p class="small-note">数值快录走「Tg·TgAb 趋势 / 进食与体重」页签的快录位（每页显式编辑 ≤1）。</p>`, `<button data-action="close">关闭</button>`); }
function openVoiceForm() {
  openModal('记一条声音日记（3 字段）', `<div class="form-grid">
      <div><label class="form-label" for="f-d">日期</label><input id="f-d" type="date" value="${TODAY}"></div>
      <div><label class="form-label" for="f-s">状态（单选）</label><select id="f-s">${Object.entries(VOICE_STATES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
      <div><label class="form-label" for="f-n">备注</label><input id="f-n" placeholder="如：说话久了一点就哑"></div>
    </div><p class="small-note">嘶哑分级与暂时/永久标注由医生维护；本表单只做记录。</p>`,
    `<button class="primary" data-action="save-voice">保存（留痕）</button><button data-action="close">取消</button>`);
}
function openCaForm() {
  openModal('抄一次血钙/PTH（3 字段）', `<div class="form-grid">
      <div><label class="form-label" for="f-d">日期</label><input id="f-d" type="date" value="${TODAY}"></div>
      <div><label class="form-label" for="f-ca">血钙（mmol/L）</label><input id="f-ca" inputmode="decimal" placeholder="如 2.26"></div>
      <div><label class="form-label" for="f-pth">PTH（pg/mL）</label><input id="f-pth" inputmode="decimal" placeholder="如 22.5"></div>
    </div><p class="small-note">参考区间照化验单自带原文并列；本台不计算"是否正常"。</p>`,
    `<button class="primary" data-action="save-ca">保存（照抄）</button><button data-action="close">取消</button>`);
}
function openNeckForm() {
  openModal('打卡（康复/疤痕）（2 字段）', `<div class="form-grid">
      <div><label class="form-label" for="f-d">日期</label><input id="f-d" type="date" value="${TODAY}"></div>
      <div><label class="form-label" for="f-t">内容</label><input id="f-t" placeholder="如：颈部锻炼 2 组 / 疤痕照片第 3 张（存本地）"></div>
    </div>`, `<button class="primary" data-action="save-neck">保存打卡</button><button data-action="close">取消</button>`);
}
function openRaiForm() {
  openModal('登记碘治疗事件（5 字段）', `<div class="form-grid">
      <div><label class="form-label" for="f-d">日期</label><input id="f-d" type="date" value="${TODAY}"></div>
      <div><label class="form-label" for="f-k">类型</label><select id="f-k"><option>清甲</option><option>辅助</option><option>清灶</option></select></div>
      <div><label class="form-label" for="f-v">剂量（mCi）</label><input id="f-v" inputmode="decimal" placeholder="照治疗单抄"></div>
      <div><label class="form-label" for="f-i">隔离天数</label><input id="f-i" inputmode="numeric" placeholder="照出院小结抄"></div>
      <div><label class="form-label" for="f-q">出院指导（原文摘录）</label><input id="f-q" placeholder="照抄，不缩写"></div>
    </div><p class="small-note">要不要做、剂量多大由医生决定；本表单只登记已发生的事件。</p>`,
    `<button class="primary" data-action="save-rai">保存</button><button data-action="close">取消</button>`);
}
function openDietForm() {
  openModal('记一条症状（口干等）（2 字段）', `<div class="form-grid">
      <div><label class="form-label" for="f-d">日期</label><input id="f-d" type="date" value="${TODAY}"></div>
      <div><label class="form-label" for="f-t">内容</label><input id="f-t" placeholder="如：口干夜间加重"></div>
    </div>`, `<button class="primary" data-action="save-diet">保存</button><button data-action="close">取消</button>`);
}
function openTgForm() {
  openModal('抄一次化验单（5 字段）', `<div class="form-grid">
      <div><label class="form-label" for="f-d">日期</label><input id="f-d" type="date" value="${TODAY}"></div>
      <div><label class="form-label" for="f-tg">Tg（ng/mL）</label><input id="f-tg" inputmode="decimal" placeholder="照化验单抄"></div>
      <div><label class="form-label" for="f-tgab">TgAb（IU/mL）</label><input id="f-tgab" inputmode="decimal" placeholder="留空=本单没有"></div>
      <div><label class="form-label" for="f-tsh">TSH（mIU/L）</label><input id="f-tsh" inputmode="decimal" placeholder="照化验单抄"></div>
      <div><label class="form-label" for="f-src">状态/来源</label><select id="f-src"><option>抑制状态 Tg</option><option>刺激状态 Tg</option><option>未标注（照化验单）</option></select></div>
    </div><p class="small-note">抑制/刺激状态口径必须标注（可比性口径卡）；TSH 数值照抄，目标原文并列在「TSH 目标与甲功」页签。</p>`,
    `<button class="primary" data-action="save-tg">保存（照抄）</button><button data-action="close">取消</button>`);
}
function openUsForm() {
  openModal('登记超声报告（4 字段）', `<div class="form-grid">
      <div><label class="form-label" for="f-d">日期</label><input id="f-d" type="date" value="${TODAY}"></div>
      <div><label class="form-label" for="f-ti">TI-RADS（原文，没有就留空）</label><input id="f-ti" placeholder="照报告分类原文抄，本台不自评"></div>
      <div><label class="form-label" for="f-m">淋巴结测量（原文）</label><input id="f-m" placeholder="照报告测量原文抄"></div>
      <div><label class="form-label" for="f-tgv">当时 Tg（ng/mL，可选）</label><input id="f-tgv" inputmode="decimal" placeholder="同窗化验值"></div>
    </div><p class="small-note">三列并列：TI-RADS 原文 / 测量原文 / 当时 Tg；结论原文可在「报告原文」页签补录。</p>`,
    `<button class="primary" data-action="save-us">保存（照抄）</button><button data-action="close">取消</button>`);
}
function openDoseForm() {
  openModal('登记剂量变更（医嘱原文，3 字段）', `<div class="form-grid">
      <div><label class="form-label" for="f-d">日期</label><input id="f-d" type="date" value="${TODAY}"></div>
      <div><label class="form-label" for="f-v">变更后剂量</label><input id="f-v" placeholder="如：优甲乐 125 μg 每日 1 次"></div>
      <div><label class="form-label" for="f-q">医嘱原文摘录</label><input id="f-q" placeholder="照抄，不缩写"></div>
    </div><p class="small-note">登记=新增版本，旧记录保留；本台零调药建议。变更理由请医生解释。</p>`,
    `<button class="primary" data-action="save-dose">保存（版本链）</button><button data-action="close">取消</button>`);
}
function openSymForm() {
  openModal('记一条症状（4 字段）', `<div class="form-grid">
      <div><label class="form-label" for="f-d">日期</label><input id="f-d" type="date" value="${TODAY}"></div>
      <div><label class="form-label" for="f-k">症状</label><select id="f-k"><option>心悸</option><option>怕热</option><option>乏力</option><option>便秘</option><option>其他</option></select></div>
      <div><label class="form-label" for="f-i">强度（轻1/中2/重3）</label><select id="f-i"><option value="1">轻（1）</option><option value="2">中（2）</option><option value="3">重（3）</option></select></div>
      <div><label class="form-label" for="f-n">备注</label><input id="f-n" placeholder="原话记下来"></div>
    </div><p class="small-note">强度轨道不画曲线不归因；症状持续或加重时联系医生。</p>`,
    `<button class="primary" data-action="save-sym">保存</button><button data-action="close">取消</button>`);
}
function openFeelForm() {
  openModal('记一条感受（3 字段）', `<div class="form-grid">
      <div><label class="form-label" for="f-t">内容</label><textarea id="f-t" placeholder="原话记下来；默认私密"></textarea></div>
      <div><label class="form-label" for="f-a">记录人</label><select id="f-a"><option value="PATIENT">本人</option><option value="CAREGIVER">照护者（${esc(profile().caregiverLabel)}）</option></select></div>
      <div><label class="form-label" for="f-v">可见性</label><select id="f-v"><option value="private">private（默认，不进导出/AI）</option><option value="shared">shared（进导出看法区）</option></select></div>
    </div><p class="small-note">配偶 FCR 双源：各自记录各自的感受，不代报、不合并。</p>`,
    `<button class="primary" data-action="save-feel">保存</button><button data-action="close">取消</button>`);
}
function openEventForm() {
  openModal('登记复发/转移事件（4 字段）', `<div class="form-grid">
      <div><label class="form-label" for="f-d">发现日期</label><input id="f-d" type="date" value="${TODAY}"></div>
      <div><label class="form-label" for="f-s">部位</label><input id="f-s" placeholder="如：右侧Ⅳ区淋巴结"></div>
      <div><label class="form-label" for="f-h">确认方式</label><input id="f-h" placeholder="如：穿刺病理（医生告知）"></div>
      <div><label class="form-label" for="f-n">备注</label><input id="f-n" placeholder="医生原话摘录"></div>
    </div><p class="small-note">只登记医生明确告知过的事件；应对路径只列选项由医生推荐，本台不荐。</p>`,
    `<button class="primary" data-action="save-event">保存</button><button data-action="close">取消</button>`);
}
function openDocForm() {
  openModal('导入文件（演示）', `<p class="small-note">原型不读写真实文件；真实版本走 MinerU 六部件管线（18 号）：导入→解析→候选→核对→入库。</p>
    <div class="form-grid"><div><label class="form-label" for="f-n">文件名（模拟）</label><input id="f-n" placeholder="如：超声报告 2027-01.pdf"></div></div>`,
    `<button class="primary" data-action="save-doc">加入解析队列（演示）</button><button data-action="close">取消</button>`);
}
function openQForm() {
  openModal('添加疑问（1 字段）', `<div class="form-grid"><div><label class="form-label" for="f-q">想问什么</label><input id="f-q" placeholder="原话记下来"></div></div>`,
    `<button class="primary" data-action="save-q">存入疑问清单</button><button data-action="close">取消</button>`);
}

const ACTIONS = {
  go(el) { navigate(el.dataset.page, el.dataset.sub || ''); },
  sub(el) { navigate(state.page, el.dataset.sub); },
  scene(el) {
    const s = SCENES.find((x) => x[0] === el.dataset.scene);
    if (s) navigate(s[2], s[3]);
  },
  range(el) { state.range = el.dataset.range; render(); },
  toggle(el) { state.toggles[el.dataset.key] = !state.toggles[el.dataset.key]; render(); },
  sel(el) {
    const arr = state.sel[state.profileId];
    const c = el.dataset.code;
    if (el.checked) {
      if (arr.length >= 4) { el.checked = false; toast('最多同时看 4 个指标；先取消一个再加。'); return; }
      arr.push(c);
    } else {
      if (arr.length === 1) { el.checked = true; toast('至少留一个指标。'); return; }
      state.sel[state.profileId] = arr.filter((x) => x !== c);
    }
    render();
  },
  pin(el) { state.pin = { code: el.dataset.code, date: el.dataset.date }; render(); },
  unpin() { state.pin = null; render(); },
  flip(el) {
    const c = el.dataset.code;
    if (state.flipped.has(c)) state.flipped.delete(c); else state.flipped.add(c);
    el.setAttribute('aria-pressed', state.flipped.has(c));
  },
  'agent-toggle'() { setAgent(!state.agent.open); },
  'agent-hide'() { setAgent(false); toast('已收起面板（会话保留，草稿不丢）'); },
  'ai-draft'(el) {
    const key = el.dataset.ai || state.page;
    const prompt = aiPromptWithCtx(key);                     // 提示词 + 本页病情上下文（0.2.1）
    state.agent.draft = AI_DEMOS[key] ? key : null;
    if (!state.agent.open) setAgent(true); else renderAgent();
    const input = $('.agent-foot input');
    if (AI_DEMOS[key] && input) input.value = prompt;
    try {
      parent.postMessage({ type: 'thy:agent-draft', prompt }, location.origin === 'null' ? '*' : location.origin);
    } catch { /* file:// 老内核 origin 为 null 时退化为页面内演示路径 */ }
    toast('已把提示词与本页病情信息填入 AI 会话输入框（待你发送，不会自动发出）');
  },
  'cand-ok'() { toast('演示：核对通过后进入事实层（原型仅示意）', { back: true }); },
  'cand-fix'() { toast('演示：进入逐项修改（每项都可以改）'); },
  'cand-reject'() { state.agent.draft = null; renderAgent(); toast('已拒收这条候选（无副作用）'); },
  profiles() { openProfiles(); },
  settings(el) { openSettings(el && el.dataset.tab); },
  'open-store'() { openSettings('ws'); },
  about() { openAbout(); },
  help() { openHelp(); },
  export() { openExport(); },
  close() { closeModal(); },
  src(el) { openModal('来源', `<p style="font-size:12.5px">${esc(el.dataset.src)}</p><p class="small-note">原型不打开真实文件；接入后这里会跳到该页并高亮。</p>`, '<button data-action="close">关闭</button>', '原文出处'); },
  'font-toggle'() { document.body.classList.toggle('large'); $('#font-toggle').setAttribute('aria-pressed', document.body.classList.contains('large')); },
  'pick-root'() {
    const bad = prompt('输入资料目录的绝对路径（演示：输入 /Users/demo 会被拒绝）', state.cfg.root);
    if (bad === null) return;
    if (['/', '/Users/demo', '/Users/demo/Desktop'].includes(bad.trim())) { toast('已拒绝：不能选主目录、根目录或桌面根'); return; }
    state.cfg.root = bad.trim(); toast('资料目录已更新（原型仅内存）'); openSettings('ws');
  },
  'token-config'() { toast('原型不接收真实 Token；真实实现只校验不回显（失败区分 401 / 429 / 网络）'); },
  'manual-edit'() { toast('演示：改这一条=登记新版本，旧记录保留（不出现"不可恢复"）'); },
  /* 记录动作（每页显式编辑入口 ≤1；其余为快捷动作） */
  'voice-add'() { openVoiceForm(); },
  'ca-add'() { openCaForm(); },
  'ca-sym'() { added('calsym').push({ d: TODAY, text: '麻木/抽搐打卡一次（本人记录）' }); toast('已打卡（演示仅内存）', { back: true }); render(); },
  'neck-add'() { openNeckForm(); },
  'rai-add'() { openRaiForm(); },
  'diet-add'() { openDietForm(); },
  'tg-add'() { openTgForm(); },
  'us-add'() { openUsForm(); },
  'dose-add'() { openDoseForm(); },
  'sym-add'() { openSymForm(); },
  'feel-add'() { openFeelForm(); },
  'event-add'() { openEventForm(); },
  'doc-add'() { openDocForm(); },
  'q-add'() { openQForm(); },
  'q-from-term'(el) {
    const term = el.dataset.term;
    questions().push({ id: uid('q'), text: `${term} 这个结果对我的情况意味着什么，请医生解释`, asked: false, src: `分子与基因 · ${TODAY} 生成` });
    toast('已加入疑问清单（fact 区）', { back: true }); render();
  },
  'q-asked'(el) {
    const q = questions().find((x) => x.id === el.dataset.id);
    if (q) { q.asked = el.checked; toast(q.asked ? '已标记"已问"' : '恢复为待问'); }
  },
  'mat-check'(el) {
    const id = el.dataset.id;
    const m = mem();
    const base = profile().materials.find((x) => x.id === id);
    const cur = m.materials[id] || base.state;
    const next = cur === 'ready' ? (el.dataset.partial ? 'partial' : 'todo') : 'ready';
    m.materials[id] = next;
    toast(next === 'ready' ? '已标记"备齐"（演示仅内存）' : next === 'partial' ? '恢复为"部分备齐"' : '恢复为"未备齐"');
    render();
  },
  'iso-check'(el) {
    const m = mem();
    const key = el.dataset.key;
    m.iso[key] = el.checked;
    toast(el.checked ? '已打卡（按出院指导原文执行）' : '已取消打卡');
  },
  'trial-save'(el) {
    const m = mem(); const k = el.dataset.key;
    m.savedTrials = m.savedTrials.includes(k) ? m.savedTrials.filter((x) => x !== k) : [...m.savedTrials, k];
    toast(m.savedTrials.includes(k) ? '已收藏（登记状态，未核实）' : '已取消收藏'); render();
  },
  'cand-accept'(el) {
    const c = profile().candidates.find((x) => x.id === el.dataset.id);
    if (c) c.state = '已入库';
    toast('已入库（演示仅内存）；接受=逐项确认完成', { back: true }); render();
  },
  'cand-reject2'(el) {
    const c = profile().candidates.find((x) => x.id === el.dataset.id);
    if (c) c.state = '已拒收';
    toast('已拒收（无副作用）；候选不进事实层'); render();
  },
  'wt-save'() {
    const v = parseFloat(($('#wt-quick') || {}).value);
    toast(Number.isFinite(v) && v > 0 ? `已记录体重 ${v} kg（演示仅内存）` : '先输入一个体重数字', { back: true });
  },
  'meal-log'(el) {
    mem().meals = mem().meals || [];
    mem().meals.push({ meal: el.dataset.meal, d: TODAY });
    toast(`已记：${el.dataset.meal}`); render();
  },
  'consent'(el) { state.cfg.consent = el.checked; toast(el.checked ? '已同意云端解析' : '已取消；不会上传文件'); }
};

/* ---------------- events ---------------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'pick-profile') {
    state.profileId = el.dataset.id;
    state.pin = null; state.flipped = new Set(); state.agent.draft = null;
    closeModal();
    toast(`已切换到 ${profile().name}（演示档案）；指标与并发症双线已换源`);
    render();
    return;
  }
  if (a === 'cfg-tab') {
    $$('.cfg-tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b === el)));
    $$('.cfg-block[data-tab]').forEach((b) => { b.hidden = b.dataset.tab !== el.dataset.tab; });
    return;
  }
  if (a === 'copy-md') {
    const md = exportMarkdown(profile());
    navigator.clipboard?.writeText(md).then(() => toast('已复制 Markdown（若浏览器拒绝则复制失败）')).catch(() => toast('复制失败：浏览器未授权剪贴板'));
    return;
  }
  const fn = ACTIONS[a];
  if (fn) fn(el);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'zoom') { state.zoom = Number(el.value); render(); }
  else if (a === 'sel') ACTIONS.sel(el);
  else if (a === 'q-asked') ACTIONS['q-asked'](el);
  else if (a === 'consent' || a === 'mat-check' || a === 'iso-check') ACTIONS[a](el);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#dialog').open) closeModal();
});

/* 保存类表单动作（各弹窗 save-*） */
const SAVE = {
  'save-voice'() {
    const d = $('#f-d')?.value, s = $('#f-s')?.value;
    if (!d || !s) { toast('日期与状态必填'); return; }
    added('voice').push({ d, state: s, label: VOICE_STATES[s], note: $('#f-n')?.value || '本人在原型中记录（演示）', src: '本人记录', author: 'PATIENT' });
    closeModal(); render(); toast('已记录声音日记（留痕；暂时/永久标注由医生维护）', { back: true });
  },
  'save-ca'() {
    const d = $('#f-d')?.value, ca = parseFloat($('#f-ca')?.value), pth = parseFloat($('#f-pth')?.value);
    if (!d || !Number.isFinite(ca) || !Number.isFinite(pth)) { toast('日期、血钙与 PTH 必填'); return; }
    added('calclab').push({ d, ca, pth, refCa: '以本次化验单自带区间为准', refPth: '以本次化验单自带区间为准', src: '本人在原型中登记（演示）' });
    closeModal(); render(); toast('已照抄登记（参考区间以化验单为准）', { back: true });
  },
  'save-neck'() {
    const d = $('#f-d')?.value, t = $('#f-t')?.value?.trim();
    if (!d || !t) { toast('日期与内容必填'); return; }
    added('rehab').push({ d, text: t, author: profile().primaryRole });
    closeModal(); render(); toast('已打卡（留痕）', { back: true });
  },
  'save-rai'() {
    const d = $('#f-d')?.value, v = $('#f-v')?.value?.trim(), i = $('#f-i')?.value?.trim(), q = $('#f-q')?.value?.trim();
    if (!d || !v || !i) { toast('日期、剂量与隔离天数必填'); return; }
    added('rai').push({ id: uid('rai'), d, kind: $('#f-k')?.value || '清甲', dose: `${v} mCi`, doseQuote: '本人在原型中登记（演示）；治疗单原件入资料库', hospital: '待核对（演示）', isolationDays: parseInt(i, 10) || 0, stay: `隔离 ${i} 天（本人登记）`, dischargeQuote: q || '待补录出院指导原文' });
    closeModal(); render(); toast('已登记碘治疗事件（独立轨道）', { back: true });
  },
  'save-diet'() {
    const d = $('#f-d')?.value, t = $('#f-t')?.value?.trim();
    if (!d || !t) { toast('日期与内容必填'); return; }
    added('diet').push({ d, text: t, author: profile().primaryRole });
    closeModal(); render(); toast('已记录（不归因）', { back: true });
  },
  'save-tg'() {
    const d = $('#f-d')?.value;
    const tg = parseFloat($('#f-tg')?.value), tsh = parseFloat($('#f-tsh')?.value), tgab = parseFloat($('#f-tgab')?.value);
    const src = $('#f-src')?.value || '未标注';
    if (!d || !Number.isFinite(tg)) { toast('日期与 Tg 必填'); return; }
    const p = profile();
    p.metrics.numeric.TG.push({ d, v: tg, src: `${src}（本人在原型中登记，演示）` });
    if (Number.isFinite(tsh)) p.metrics.numeric.TSH.push({ d, v: tsh, src: '本人在原型中登记（演示）' });
    if (Number.isFinite(tgab)) p.metrics.numeric.TGAB.push({ d, v: tgab, src: '本人在原型中登记（演示）' });
    closeModal(); render(); toast('已照抄登记；口径状态已标注', { back: true });
  },
  'save-us'() {
    const d = $('#f-d')?.value, ti = $('#f-ti')?.value?.trim(), mv = $('#f-m')?.value?.trim(), tgv = parseFloat($('#f-tgv')?.value);
    if (!d || !mv) { toast('日期与测量原文必填'); return; }
    added('us').push({ id: uid('us'), d, kind: '颈部超声（本人登记，演示）', tirads: ti || '本报告未给出 TI-RADS 分类（原文留空）', measure: mv, tgAtTime: Number.isFinite(tgv) ? tgv : null, tgSrc: '本人登记的同窗数值', excerpt: '结论原文待补录（报告原文页签）', next: '以医嘱为准' });
    closeModal(); render(); toast('已登记（三列并列，无判读列）', { back: true });
  },
  'save-dose'() {
    const d = $('#f-d')?.value, v = $('#f-v')?.value?.trim(), q = $('#f-q')?.value?.trim();
    if (!d || !v || !q) { toast('日期、变更后剂量与医嘱原文必填'); return; }
    added('dose').push({ d, item: v, quote: `${q}（本人在原型中登记，演示）`, version: `v${(profile().followup.doseTimeline || []).length + added('dose').length + 1}` });
    closeModal(); render(); toast('已登记新版本（旧记录保留）', { back: true });
  },
  'save-sym'() {
    const d = $('#f-d')?.value, k = $('#f-k')?.value, i = parseInt($('#f-i')?.value, 10);
    if (!d || !k || !i) { toast('日期、症状与强度必填'); return; }
    added('sym').push({ d, kind: k, intensity: i, note: $('#f-n')?.value || '本人在原型中记录（演示）', author: 'PATIENT' });
    closeModal(); render(); toast('已记入症状轨道（不归因）', { back: true });
  },
  'save-feel'() {
    const t = $('#f-t')?.value?.trim(), a = $('#f-a')?.value, v = $('#f-v')?.value;
    if (!t) { toast('内容必填'); return; }
    profile().viewpoints.push({ role: a, visibility: v, date: TODAY, topic: '感受记录', content: t });
    closeModal(); render(); toast(v === 'private' ? '已保存（private：三出口统一过滤）' : '已保存（shared：进导出看法区）', { back: true });
  },
  'save-event'() {
    const d = $('#f-d')?.value, s = $('#f-s')?.value?.trim(), h = $('#f-h')?.value?.trim();
    if (!d || !s || !h) { toast('日期、部位与确认方式必填'); return; }
    profile().recurrence.events.push({ d, site: s, how: h, note: $('#f-n')?.value || '' });
    closeModal(); render(); toast('已登记事件（医生告知；应对路径只列不荐）', { back: true });
  },
  'save-doc'() {
    const n = $('#f-n')?.value?.trim();
    if (!n) { toast('先填一个文件名'); return; }
    profile().documents.push({ id: uid('d'), name: n, kind: 'pdf', size: '0.9 MB', status: '待核对' });
    closeModal(); render(); toast('已加入解析队列（演示）：下一步到「整理草稿与核对」', { back: true });
  },
  'save-q'() {
    const q = $('#f-q')?.value?.trim();
    if (!q) { toast('先写想问什么'); return; }
    questions().push({ id: uid('q'), text: q, asked: false, src: `就诊准备 · ${TODAY} 手工添加` });
    closeModal(); render(); toast('已存入疑问清单', { back: true });
  }
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action^="save-"]');
  if (!el) return;
  const fn = SAVE[el.dataset.action];
  if (fn) fn(el);
});

/* 直达 hash：#page 或 #page/sub（sub 用 key） */
function applyHash() {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (!hash) return false;
  const [p, s] = hash.split('/');
  if (!RENDERERS[p]) return false;
  state.page = p;
  if (s && SUBPAGES[p] && SUBPAGES[p].some(([k]) => k === s)) state.sub[p] = s;
  return true;
}
(function boot() {
  $('#font-toggle').addEventListener('click', () => ACTIONS['font-toggle']());
  applyHash();
  render();
  document.body.setAttribute('data-booted', '1');
})();
window.addEventListener('hashchange', () => {
  if (!applyHash()) return;
  render();
  $('#main').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
});
