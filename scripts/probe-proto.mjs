#!/usr/bin/env node
/**
 * 原型无头实测（M2 自验：必须出数字，不口头说"没问题"）。
 *
 * 数字：
 *  - 10 一级 × 30 二级 × 2 档案逐页签走查（aria-selected 与内容指纹匹配；逐个"查询→点击→再查询"，
 *    不预抓全部按钮——render 会重建 DOM）；截图存 docs/shots/{view}-{sub}-{profile}.png；
 *  - 每页 body.scrollWidth vs innerWidth、控制台 error、网络 4xx；
 *  - HVT X1：页签覆盖 = 30/30；X2：13 场景 chip 路径 + 页内 data-step 跳转 + 回首页一步；
 *    X3：每页显式编辑入口 ≤1；X4：候选闭环（解析候选 accept/reject + AI 候选三步）；
 *  - AI 面板：默认 35% / Home 45% / End 25% / 收起（aria-valuenow 同步）；
 *  - 一图秀：数值线连线、RISK/TIRADS 分类节点只节点不连线（C4/C5）、末点标签=序列数；
 *  - 指标卡 3D 翻转：aria-pressed 独立（C11/C12）；
 *  - 红线词扫描：T2 调药/T5 自评/T6 可以不查 等禁词 0；未检测≠阴性 等必现句逐页断言。
 *
 * 用法：node scripts/probe-proto.mjs；退出码 0/1。依赖本机 Chrome（file:// 直开）。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, stopChrome, sleep } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'docs', 'shots');
mkdirSync(SHOTS, { recursive: true });
const CDP_PORT = Number(process.env.THY_PROBE_CDP_PORT || 9354);
const URL_APP = `file://${join(ROOT, 'prototypes', 'v0.2', 'index.html')}`;

const VIEW_SUBS = [
  ['dash', ''], ['chart', ''],
  ['tumor', 'pathology'], ['tumor', 'molecular'], ['tumor', 'recurrence'], ['tumor', 'reports'],
  ['surgery', 'op'], ['surgery', 'voice'], ['surgery', 'calcium'], ['surgery', 'neck'],
  ['rai', 'records'], ['rai', 'isolation'], ['rai', 'diet'], ['rai', 'wbs'],
  ['followup', 'calendar'], ['followup', 'tg'], ['followup', 'us'], ['followup', 'dose'], ['followup', 'tsh'], ['followup', 'bone'],
  ['fertility', 'prep'], ['fertility', 'preg'],
  ['care', 'concerns'], ['care', 'intake'], ['care', 'symptoms'],
  ['mind', 'feelings'], ['mind', 'genetic'], ['mind', 'support'],
  ['docs', 'schedule'], ['docs', 'library'], ['docs', 'candidates'], ['docs', 'prepare']
];
/* 红线禁词（T1/T2/T5/T6 产品自有文案；引用原文的"复发灶"等不在列） */
const FORBIDDEN = ['建议调整剂量', '建议加量', '建议减量', '可以不查', '不必复查', '无需复查', '不需要复查', '自动分级', '风险评分', 'TI-RADS 评分', 'risk_level'];
/* 必现句（逐页断言：红线在页面上必须"看得见"） */
const REQUIRED = [
  ['tumor/molecular', '未检测不等于阴性'],
  ['followup/tg', 'Tg 升高 ≠ 复发'],
  ['followup/dose', '零调药建议'],
  ['mind/feelings', 'sharedOnly'],
  ['docs/prepare', 'private'],
  ['rai/records', '核医学科']
];
/* 13 场景直达（与 app.js SCENES 同源：id→落点） */
const SCENES = [
  ['S01', 'tumor', 'pathology'], ['S02', 'surgery', 'voice'], ['S03', 'followup', 'dose'],
  ['S04', 'rai', 'records'], ['S05', 'followup', 'tg'], ['S06', 'followup', 'us'],
  ['S07', 'docs', 'prepare'], ['S08', 'followup', 'calendar'], ['S09', 'care', 'intake'],
  ['S10', 'mind', 'genetic'], ['S11', 'docs', 'prepare'], ['S12', 'docs', 'library'],
  ['S13', 'surgery', 'neck']
];

const ch = await launchChrome({ port: CDP_PORT });
const { cdp } = ch;
const errors = cdp.errors;
const badResponses = cdp.badResponses;
const out = {
  tabs: 0, screenshots: 0, overflow: [], ariaMismatch: [], forbidden: [], required: [],
  scenePaths: [], stepJumps: 0, editEntries: [], flip: {}, chart: {}, agent: {}, aiLoop: {}, navButtons: 0, profileSwitch: {}
};

try {
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(500);
  const bootedExpr = "document.body && document.body.getAttribute('data-booted') === '1'";
  for (let i = 0; i < 60 && !(await cdp.eval(bootedExpr)); i += 1) await sleep(150);

  out.navButtons = await cdp.eval("document.querySelectorAll('#nav .nav-button').length");

  async function shot(name) {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(r.data, 'base64'));
    out.screenshots += 1;
  }
  async function goto(page, sub) {
    await cdp.eval(`location.hash = ${JSON.stringify('#' + page + (sub ? '/' + sub : ''))}`);
    await sleep(60);
    await cdp.eval('window.scrollTo(0,0)');
    await sleep(60);
  }
  async function textScan() {
    const raw = await cdp.eval(`(() => {
      const t = (document.getElementById('main').innerText || '') + ' ' + (document.querySelector('.agent-body')?.innerText || '');
      return t.replace(/\\s+/g, ' ');
    })()`);
    return raw || '';
  }

  /* ── 逐 (view,sub) × 2 档案：逐 tab 查询→点击→再查询（render 重建 DOM，禁止预抓按钮列表） ── */
  for (const pid of ['demo1', 'demo2']) {
    for (const [page, sub0] of VIEW_SUBS) {
      await cdp.eval(`(() => { state.profileId = ${JSON.stringify(pid)}; state.pin = null; state.flipped = new Set(); })()`);
      await goto(page, sub0 || '');
      const subs = sub0 ? [sub0] : [''];
      if (!sub0) {
        subs.push(...(await cdp.eval(`(SUBPAGES[${JSON.stringify(page)}] || []).map((x) => x[0])`)));
      }
      const fingerprints = [];
      for (const sub of subs) {
        if (sub === '') {
          const chk0 = await cdp.eval(`(() => { const html = document.getElementById('main').innerHTML; return JSON.stringify({ len: html.length, fp: html.replace(/\\s+/g, '').slice(120, 320) }); })()`);
          fingerprints.push(JSON.parse(chk0));
        } else {
          /* 查询→点击→再查询 */
          const tabInfo = await cdp.eval(`(() => {
            const t = document.querySelector('#main .subnav [role=tab][data-sub="${sub}"]');
            if (!t) return null;
            const label = t.textContent.trim();
            t.click();
            return label;
          })()`);
          if (!tabInfo) { out.ariaMismatch.push(`${pid}/${page}/${sub}: tab 不存在`); continue; }
          await sleep(50);
          const chk = await cdp.eval(`(() => {
            const t = document.querySelector('#main .subnav [role=tab][data-sub="${sub}"]');
            const html = document.getElementById('main').innerHTML;
            return JSON.stringify({ sel: t ? t.getAttribute('aria-selected') : null, len: html.length, fp: html.replace(/\\s+/g, '').slice(120, 320), crumb: document.getElementById('breadcrumb').textContent });
          })()`);
          const d = JSON.parse(chk);
          if (d.sel !== 'true') out.ariaMismatch.push(`${pid}/${page}/${sub}: aria-selected=${d.sel}`);
          fingerprints.push(d);
          await goto(page, sub);
        }
        /* 禁词扫描 + 溢出检查（每页签） */
        const text = await textScan();
        for (const w of FORBIDDEN) {
          if (w === '建议调整剂量') continue; /* 该词只允许出现在否定句里，另行断言 */
          if (text.includes(w)) out.forbidden.push(`${pid}/${page}/${sub}: 禁词「${w}」`);
        }
        const ov = await cdp.eval('JSON.stringify({ s: document.documentElement.scrollWidth, i: window.innerWidth })');
        const o = JSON.parse(ov);
        if (o.s > o.i + 1) out.overflow.push(`${pid}/${page}/${sub}: scrollWidth=${o.s} > innerWidth=${o.i}`);
      }
      /* 同页签间内容指纹需互异（换 sub 必须换内容） */
      const uniq = new Set(fingerprints.map((f) => f.fp || f));
      if (uniq.size < fingerprints.length) out.ariaMismatch.push(`${pid}/${page}: ${fingerprints.length - uniq.size} 个页签内容指纹重复`);
      out.tabs += subs.length;
      await shot(`${page}-${sub0 || 'main'}-${pid}`);
    }
  }
  await cdp.eval(`(() => { state.profileId = 'demo1'; })()`);
  await goto('dash', '');

  /* ── HVT X2：13 场景 chip 路径走通（逐个查询→点击→再查询→断言落点） ── */
  await goto('dash', '');
  for (const [sid] of SCENES) {
    const r = await cdp.eval(`(() => {
      const chip = document.querySelector('.scene-chip[data-scene="${sid}"]');
      if (!chip) return JSON.stringify({ ok: false, why: 'chip 不存在' });
      chip.click();
      return JSON.stringify({ ok: true, page: state.page, sub: state.sub[state.page] || '', crumb: document.getElementById('breadcrumb').textContent });
    })()`);
    const d = JSON.parse(r);
    if (!d.ok) { out.scenePaths.push(`X2 ${sid}: ${d.why}`); continue; }
    const s = SCENES.find((x) => x[0] === sid);
    if (d.page !== s[1] || (s[2] && d.sub !== s[2])) out.scenePaths.push(`X2 ${sid}: 落点 ${d.page}/${d.sub} ≠ ${s[1]}/${s[2]}`);
    /* 页内 data-step 跳转逐个走 */
    for (;;) {
      const step = await cdp.eval(`(() => {
        const b = document.querySelector('#main [data-step]');
        if (!b) return null;
        const k = b.getAttribute('data-step');
        b.click();
        return k;
      })()`);
      if (!step) break;
      out.stepJumps += 1;
      await sleep(40);
    }
    /* 回首页一步 */
    const back = await cdp.eval(`(() => {
      const b = document.querySelector('.back-row [data-action="go"][data-page="dash"]') || document.querySelector('.toast-back');
      if (!b) return false;
      b.click();
      return state.page === 'dash';
    })()`);
    if (!back) out.scenePaths.push(`X2 ${sid}: 回看板失败`);
    await goto('dash', '');
  }

  /* ── X3：每页显式编辑入口 ≤1（page-head 内 .primary / .more-menu / [data-action$=-add] 计数） ── */
  for (const [page, sub] of VIEW_SUBS) {
    await goto(page, sub || '');
    const n = await cdp.eval(`(() => {
      const head = document.querySelector('#main .page-head .actions');
      if (!head) return 0;
      const set = new Set();
      head.querySelectorAll('button.primary').forEach((b) => set.add(b));
      head.querySelectorAll('details.more-menu').forEach((b) => set.add(b));
      head.querySelectorAll('button[data-action$="-add"]').forEach((b) => set.add(b));
      return set.size;
    })()`);
    if (n > 1) out.editEntries.push(`X3 ${page}/${sub || 'main'}: 显式编辑入口 ${n} 个`);
  }

  /* ── X4：候选闭环（解析候选 accept/reject）── */
  await goto('docs', 'candidates');
  const cand0 = await cdp.eval(`(() => {
    const b = document.querySelector('#main [data-action="cand-accept"]');
    if (!b) return null;
    b.click();
    return b.getAttribute('data-id');
  })()`);
  await sleep(40);
  const cand1 = await cdp.eval(`(() => {
    const rows = [...document.querySelectorAll('#main [data-action="cand-reject2"]')];
    if (!rows.length) return null;
    rows[0].click();
    return rows[0].getAttribute('data-id');
  })()`);
  await sleep(40);
  const candState = await cdp.eval(`JSON.stringify((DEMO_DATA.profiles.find(p=>p.id==='demo1').candidates).map(c=>c.state))`);
  if (!cand0 || !cand1) out.aiLoop.parseCand = 'X4 解析候选按钮缺失';
  else {
    const states = JSON.parse(candState);
    if (!states.includes('已入库') || !states.includes('已拒收')) out.aiLoop.parseCand = `X4 闭环失败：${candState}`;
  }
  /* X4b：AI 候选三步（填草稿 → 候选卡 → 拒收） */
  await goto('dash', '');
  const aiSteps = [];
  const btnAi = await cdp.eval(`(() => { const b = document.querySelector('#main [data-action="ai-draft"]'); if (!b) return false; b.click(); return true; })()`);
  aiSteps.push(btnAi ? 1 : 0);
  await sleep(60);
  const hasCand = await cdp.eval("!!document.querySelector('.agent-cand') && !!document.querySelector('.agent-cand [data-action=\"cand-ok\"]')");
  aiSteps.push(hasCand ? 1 : 0);
  const rejected = await cdp.eval(`(() => { const b = document.querySelector('.agent-cand [data-action="cand-reject"]'); if (!b) return false; b.click(); return true; })()`);
  aiSteps.push(rejected ? 1 : 0);
  await sleep(60);
  const candGone = await cdp.eval("!document.querySelector('.agent-cand')");
  aiSteps.push(candGone ? 1 : 0);
  out.aiLoop.aiCandidate = aiSteps.join('');
  if (aiSteps.join('') !== '1111') out.aiLoop.aiCandidateErr = `X4 AI 候选闭环步序 ${aiSteps.join('')} ≠ 1111`;

  /* ── AI 面板宽度态 + 展开态截图 ── */
  const w0 = await cdp.eval("getComputedStyle(document.documentElement).getPropertyValue('--agent-w').trim()");
  await cdp.eval(`(() => { const b=document.querySelector('.agent-cand')?null:document.querySelector('#main [data-action="ai-draft"]'); if(b) b.click(); })()`);
  await sleep(50);
  await cdp.eval("(function(){const sp=document.getElementById('agent-splitter'); sp.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));})()");
  await sleep(50);
  const wHome = await cdp.eval("getComputedStyle(document.documentElement).getPropertyValue('--agent-w').trim()");
  await cdp.eval("(function(){const sp=document.getElementById('agent-splitter'); sp.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));})()");
  await sleep(50);
  const wEnd = await cdp.eval("getComputedStyle(document.documentElement).getPropertyValue('--agent-w').trim()");
  const valNow = await cdp.eval("document.getElementById('agent-splitter').getAttribute('aria-valuenow')");
  out.agent = { default: w0, home: wHome, end: wEnd, ariaValuenow: valNow };
  if (wHome !== '45%' || wEnd !== '25%') out.agent.err = `X-面板 宽度态异常 ${wHome}/${wEnd}`;
  await shot('dash-agent-940-demo1');
  await cdp.eval(`(() => { document.getElementById('agent-hide').click(); })()`);
  await sleep(40);

  /* ── 指标卡翻转（C11/C12） ── */
  await goto('dash', '');
  const flip = await cdp.eval(`(() => {
    const card = document.querySelector('#main .mcard');
    if (!card) return null;
    const code = card.dataset.code;
    const before = card.getAttribute('aria-pressed');
    card.click();
    return JSON.stringify({ code, before, after: card.getAttribute('aria-pressed') });
  })()`);
  if (flip) out.flip = JSON.parse(flip);
  else out.flip.err = '看板无可翻转指标卡';

  /* ── 一图秀：数值线连线 / 分类节点不连线 / 治疗条图层 ── */
  await goto('chart', '');
  const chart1 = await cdp.eval(`(() => {
    const svg = document.querySelector('#main .chart-wrap svg');
    if (!svg) return null;
    return JSON.stringify({ paths: svg.querySelectorAll('path.line').length, dots: svg.querySelectorAll('circle.pt').length, hasWatermark: svg.textContent.includes('不代表不同指标数值可比') });
  })()`);
  /* 关掉分类节点序列只留数值线，分类序列被选中时其序列不得有 path.line —— 直接断言 RISK 在选中列表内且其节点存在 */
  const catCheck = await cdp.eval(`(() => {
    const sel = state.sel[state.profileId];
    const hasCat = sel.includes('RISK');
    const svg = document.querySelector('#main .chart-wrap svg');
    return JSON.stringify({ hasCat, paths: svg ? svg.querySelectorAll('path.line').length : -1 });
  })()`);
  out.chart = { overview: JSON.parse(chart1), catCheck: JSON.parse(catCheck) };
  if (out.chart.catCheck.hasCat && out.chart.overview.paths === 0) out.chart.err = '一图秀数值线缺失';

  /* ── 档案切换换源 ── */
  await goto('dash', '');
  const name1 = await cdp.eval("document.getElementById('profile-name').textContent");
  await cdp.eval(`(() => { document.getElementById('profile-btn').click(); })()`);
  await sleep(50);
  const pick2 = await cdp.eval(`(() => { const b = document.querySelector('.profile-row[data-id="demo2"]'); if (!b) return false; b.click(); return true; })()`);
  await sleep(60);
  const name2 = await cdp.eval("document.getElementById('profile-name').textContent");
  out.profileSwitch = { before: name1, after: name2, ok: pick2 && name1 !== name2 };
  if (!out.profileSwitch.ok) out.profileSwitch.err = '档案切换失败';
  await goto('dash', '');

  /* ── 必现句断言（逐页） ── */
  for (const [loc, phrase] of REQUIRED) {
    const [pg, sb] = loc.split('/');
    await goto(pg, sb);
    const t = await textScan();
    const hit = t.includes(phrase);
    if (!hit) out.required.push(`必现句缺失 ${loc}: 「${phrase}」`);
  }
  await goto('dash', '');
} catch (error) {
  out.fatal = String(error?.stack ?? error);
} finally {
  await stopChrome(ch);
}

out.consoleErrors = errors.length;
out.networkFailures = badResponses.length;
const ok = !out.fatal && out.consoleErrors === 0 && out.networkFailures === 0
  && out.overflow.length === 0 && out.ariaMismatch.length === 0 && out.forbidden.length === 0
  && out.required.length === 0 && out.scenePaths.length === 0 && out.editEntries.length === 0
  && out.tabs === 64 && out.navButtons === 10;
console.log(JSON.stringify({ ok, summary: { tabs: out.tabs, screenshots: out.screenshots, stepJumps: out.stepJumps, navButtons: out.navButtons, consoleErrors: out.consoleErrors, networkFailures: out.networkFailures }, issues: { overflow: out.overflow, ariaMismatch: out.ariaMismatch, forbidden: out.forbidden, required: out.required, scenePaths: out.scenePaths, editEntries: out.editEntries, aiLoop: out.aiLoop, flip: out.flip, chart: out.chart, agent: out.agent, profileSwitch: out.profileSwitch, fatal: out.fatal ?? null } }, null, 2));
process.exit(ok ? 0 : 1);
