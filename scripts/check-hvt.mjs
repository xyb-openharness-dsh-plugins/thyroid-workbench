#!/usr/bin/env node
/**
 * HVT 交互路径一致性 X1–X4（15-HVT-REVIEW §X；基准=docs/INTERACTION-DESIGN.md v1.1）。
 *
 * X1 页面覆盖：SCENES（13 场景路径 = 看板入口 + 落地页 + 步骤表）∪ 页面上真实存在的
 *   data-step 锚点（含 rai/records 页的 to-wbs——DOM 锚点比 SCENES 常量多这一条）
 *   的并集必须盖满 10 线 30 页签（孤儿=0）。dash 为路径枢纽不占页签名；chart 由 S05 步骤覆盖。
 * X2 路径逐字走通：从看板逐 key 点「场景直达」chip → 落地页（须有 data-product 锚）→
 *   逐个"查询→点击→再查询"页内 data-step → 每站必须有 data-product 锚 →
 *   点「回到看板」一步回首页。两档案各走一遍（13 × 2 = 26）。
 * X3 编辑入口 ≤1：每 (view,sub) 打开表单/弹窗的显式编辑入口 ≤1（FORM_ACTIONS，含 ⋯ 菜单的 manual-edit）。
 * X4 AI 产出候选闭环：ai-draft → 候选卡 → 确认入事实层 / 不对改一下 / 不用这条 三步；
 *   且每条一级线至少 1 个 AI 协助示例按钮。
 *
 * 用法：node scripts/check-hvt.mjs；退出码 0/1。依赖本机 Chrome。
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, stopChrome, sleep } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CDP_PORT = Number(process.env.THY_HVT_CDP_PORT || 9360);
const URL_APP = `file://${join(ROOT, 'prototypes', 'v0.2', 'index.html')}`;

/* 与 app.js SCENES 同源的静态表（检查器单持一份，避免读页面内变量做判定）。
   步骤表=INTERACTION-DESIGN §一 的"关键步骤"列；X2 只点 DOM 里真实存在的 data-step。 */
const SCENES = [
  ['S01', 'tumor', 'pathology', ['to-molecular', 'to-recurrence', 'to-reports']],
  ['S02', 'surgery', 'voice', ['to-calcium', 'to-op', 'to-symptoms']],
  ['S03', 'followup', 'dose', ['to-tsh']],
  ['S04', 'rai', 'records', ['to-isolation', 'to-diet', 'to-prep']],
  ['S05', 'followup', 'tg', ['to-tsh', 'to-chart']],
  ['S06', 'followup', 'us', ['to-tg', 'to-questions']],
  ['S07', 'docs', 'prepare', ['to-schedule']],
  ['S08', 'followup', 'calendar', ['to-tg', 'to-us', 'to-bone', 'to-preg']],
  ['S09', 'care', 'intake', ['to-concerns']],
  ['S10', 'mind', 'genetic', ['to-feelings', 'to-support']],
  ['S11', 'docs', 'prepare', []],
  ['S12', 'docs', 'library', ['to-candidates']],
  ['S13', 'surgery', 'neck', ['to-op']]
];
/* data-step → (page,sub) 落点（与 app.js 的 go() 目标一一对应） */
const STEP_TARGET = {
  'to-molecular': ['tumor', 'molecular'],
  'to-recurrence': ['tumor', 'recurrence'], 'to-reports': ['tumor', 'reports'],
  'to-calcium': ['surgery', 'calcium'], 'to-op': ['surgery', 'op'], 'to-symptoms': ['care', 'symptoms'],
  'to-tsh': ['followup', 'tsh'], 'to-isolation': ['rai', 'isolation'], 'to-diet': ['rai', 'diet'],
  'to-prep': ['fertility', 'prep'], 'to-chart': ['chart', ''], 'to-tg': ['followup', 'tg'],
  'to-questions': ['docs', 'prepare'], 'to-schedule': ['docs', 'schedule'], 'to-us': ['followup', 'us'],
  'to-bone': ['followup', 'bone'], 'to-preg': ['fertility', 'preg'], 'to-concerns': ['care', 'concerns'],
  'to-feelings': ['mind', 'feelings'], 'to-support': ['mind', 'support'],
  'to-library': ['docs', 'library'], 'to-candidates': ['docs', 'candidates'], 'to-wbs': ['rai', 'wbs'],
};
const ALL_SUBS = [
  ['tumor', 'pathology'], ['tumor', 'molecular'], ['tumor', 'recurrence'], ['tumor', 'reports'],
  ['surgery', 'op'], ['surgery', 'voice'], ['surgery', 'calcium'], ['surgery', 'neck'],
  ['rai', 'records'], ['rai', 'isolation'], ['rai', 'diet'], ['rai', 'wbs'],
  ['followup', 'calendar'], ['followup', 'tg'], ['followup', 'us'], ['followup', 'dose'], ['followup', 'tsh'], ['followup', 'bone'],
  ['fertility', 'prep'], ['fertility', 'preg'],
  ['care', 'concerns'], ['care', 'intake'], ['care', 'symptoms'],
  ['mind', 'feelings'], ['mind', 'genetic'], ['mind', 'support'],
  ['docs', 'schedule'], ['docs', 'library'], ['docs', 'candidates'], ['docs', 'prepare']
];
const FORM_ACTIONS = ['tg-add', 'us-add', 'dose-add', 'rai-add', 'diet-add', 'voice-add', 'ca-add',
  'neck-add', 'sym-add', 'feel-add', 'event-add', 'doc-add', 'q-add', 'manual-edit'];

/* 从原型源码扫出页面上真实存在的 data-step 锚点（X1 的并集来源之一：
   rai/records 页有 to-wbs 锚点而 SCENES 常量步骤表没有——以"并集"口径覆盖）。 */
const DOM_ANCHORS = new Set();
for (const m of readFileSync(join(ROOT, 'prototypes', 'v0.2', 'app.js'), 'utf8').matchAll(/data-step="([a-z-]+)"/g)) {
  if (STEP_TARGET[m[1]]) DOM_ANCHORS.add(m[1]);
}

const ch = await launchChrome({ port: CDP_PORT });
const { cdp } = ch;
const errorsBefore = cdp.errors.length;
const out = {
  X1: {}, X2: { failures: [], walked: 0 }, X3: { over: [], max: 0, perPage: {} }, X4: {}
};

try {
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(500);
  for (let i = 0; i < 60 && !(await cdp.eval("document.body && document.body.getAttribute('data-booted') === '1'")); i += 1) await sleep(150);

  /* ── X1：路径并集 vs 30 页签 ── */
  const covered = new Set();
  const coverBy = {};
  const cover = (k, by) => { covered.add(k); (coverBy[k] = coverBy[k] || []).push(by); };
  for (const [key, landing, landingSub, steps] of SCENES) {
    cover(`${landing}/${landingSub}`, key);
    for (const st of steps) cover(STEP_TARGET[st].join('/'), `${key}:${st}`);
  }
  for (const st of DOM_ANCHORS) cover(STEP_TARGET[st].join('/'), `dom:${st}`);
  const orphans = ALL_SUBS.map(([pg, sb]) => `${pg}/${sb}`).filter((k) => !covered.has(k));
  out.X1 = {
    totalSubs: ALL_SUBS.length,
    covered: ALL_SUBS.map(([pg, sb]) => `${pg}/${sb}`).filter((k) => covered.has(k)).length,
    domAnchors: [...DOM_ANCHORS].sort(),
    orphans: orphans.length,
    orphanList: orphans,
    multiCovered: Object.keys(coverBy).filter((k) => coverBy[k].length > 1).length
  };

  /* ── X2：从看板逐 key 走通（两档案各一遍） ── */
  async function walkScenes(pid) {
    let ok = 0;
    for (const [key, landing, landingSub] of SCENES) {
      await cdp.eval(`(() => { state.profileId=${JSON.stringify(pid)}; state.page='dash'; state.sub={}; render(); })()`);
      await sleep(60);
      const chip = await cdp.eval(`(() => { const b = document.querySelector('#main .scene-chip[data-scene=${JSON.stringify(key)}]'); if (!b) return null; b.click(); return true; })()`);
      if (chip === null) { out.X2.failures.push(`${pid}/${key}: 看板无场景 chip`); continue; }
      await sleep(60);
      let cur = await cdp.eval(`state.page + '/' + (state.sub[state.page] || '')`);
      if (cur !== `${landing}/${landingSub}`) { out.X2.failures.push(`${pid}/${key}: 落地页=${cur} 期望=${landing}/${landingSub}`); continue; }
      let products = await cdp.eval(`[...document.querySelectorAll('#main [data-product]')].map((e) => e.dataset.product)`);
      if (!products.length) { out.X2.failures.push(`${pid}/${key}: 落地页无 data-product 锚`); continue; }
      let allOk = true;
      /* 页内 data-step 逐站走（迭代式：每站必须真的导航且有产品锚；走不动即止） */
      for (;;) {
        const step = await cdp.eval(`(() => {
          const b = document.querySelector('#main [data-step]');
          if (!b) return null;
          const k = b.getAttribute('data-step');
          b.click();
          return k;
        })()`);
        if (!step) break;
        await sleep(60);
        const [pg, sb] = STEP_TARGET[step];
        cur = await cdp.eval(`state.page + '/' + (state.sub[state.page] || '')`);
        const prods = await cdp.eval(`[...document.querySelectorAll('#main [data-product]')].map((e) => e.dataset.product)`);
        if (cur !== `${pg}/${sb}` || !prods.length) {
          out.X2.failures.push(`${pid}/${key}: 步骤 ${step} 失败（落点=${cur} 期望=${pg}/${sb} 产品锚=${prods.length}）`);
          allOk = false; break;
        }
        products = products.concat(prods);
      }
      // 回首页一步
      await cdp.eval(`(() => { const b = document.querySelector('#main .back-row [data-action="go"][data-page="dash"]') || document.querySelector('#main [data-action="go"][data-page="dash"]'); if (b) b.click(); })()`);
      await sleep(60);
      const back = await cdp.eval("state.page === 'dash'");
      if (!back) { out.X2.failures.push(`${pid}/${key}: 无法一步回看板`); allOk = false; }
      if (allOk) ok += 1;
    }
    return ok;
  }
  out.X2.demo1 = await walkScenes('demo1');
  out.X2.demo2 = await walkScenes('demo2');
  out.X2.walked = out.X2.demo1 + out.X2.demo2;

  /* ── X3：编辑入口 ≤1（30 页签 × 2 档案逐页数） ── */
  /* dash 也是一级页；chart 无二级不进 ALL_SUBS，但 AI 示例按钮覆盖检查要含它 → X4 用 10 线全集 */
  const VIEWS = ['dash', 'chart', ...new Set(ALL_SUBS.map(([pg]) => pg))];
  let maxEntries = 0;
  for (const pid of ['demo1', 'demo2']) {
    for (const [pg, sb] of ALL_SUBS) {
      await cdp.eval(`(() => { state.profileId=${JSON.stringify(pid)}; state.page=${JSON.stringify(pg)}; state.sub[${JSON.stringify(pg)}]=${JSON.stringify(sb)}; render(); })()`);
      await sleep(40);
      const n = await cdp.eval(`document.querySelectorAll('#main [data-action]').length ? [...document.querySelectorAll('#main [data-action]')].filter((b) => ${JSON.stringify(FORM_ACTIONS)}.includes(b.dataset.action)).length : 0`);
      const key = `${pg}/${sb}`;
      out.X3.perPage[`${key}/${pid}`] = n;
      if (n > maxEntries) maxEntries = n;
      if (n > 1) out.X3.over.push(`${key}/${pid}: ${n} 个编辑入口`);
    }
  }
  out.X3.max = maxEntries;
  out.X3.pagesChecked = ALL_SUBS.length * 2;

  /* ── X4：AI 产出候选闭环 ── */
  await cdp.eval("(() => { state.page='dash'; state.sub={}; state.profileId='demo1'; render(); })()");
  await sleep(80);
  await cdp.eval("ACTIONS['ai-draft']({ dataset: { ai: 'dash' } })");
  await sleep(200);
  out.X4.candShown = await cdp.eval("!!document.querySelector('[data-testid=agent-cand]')");
  out.X4.draftButtons = await cdp.eval("document.querySelectorAll('[data-testid=agent-cand] .actions button').length");
  out.X4.privateNote = await cdp.eval("document.querySelector('.agent-body').textContent.includes('默认不进入 AI 上下文')");
  await cdp.eval("document.querySelector('[data-testid=agent-cand] [data-action=cand-ok]').click()");
  out.X4.confirmToast = await cdp.eval("document.getElementById('toast').classList.contains('visible')");
  await cdp.eval("document.querySelector('[data-testid=agent-cand] [data-action=cand-fix]').click()");
  out.X4.fixToast = await cdp.eval("document.getElementById('toast').classList.contains('visible')");
  await cdp.eval("document.querySelector('[data-testid=agent-cand] [data-action=cand-reject]').click()");
  await sleep(100);
  out.X4.rejectClears = await cdp.eval("state.agent.draft === null && !document.querySelector('[data-testid=agent-cand]')");
  // AI 示例按钮每条一级线至少 1 个（每级页 AI 协助示例按钮）
  const aiPages = [];
  for (const pg of VIEWS) {
    await cdp.eval(`(() => { state.page=${JSON.stringify(pg)}; state.sub={}; render(); })()`);
    await sleep(40);
    const has = await cdp.eval("!!document.querySelector('#main [data-action=ai-draft]')");
    if (has) aiPages.push(pg);
  }
  out.X4.aiBtnPages = aiPages.length;
  out.X4.aiBtnMissing = VIEWS.filter((v) => !aiPages.includes(v));

  out.jsErrors = cdp.errors.length - errorsBefore;
  const pass = out.X1.orphans === 0 && out.X2.failures.length === 0 && out.X2.walked === 26
    && out.X3.over.length === 0 && out.X3.max <= 1
    && out.X4.candShown && out.X4.draftButtons === 3 && out.X4.rejectClears && out.X4.aiBtnPages === 10 && out.jsErrors === 0;
  console.log(JSON.stringify(out, null, 2));
  console.log(pass ? '✓ HVT X1–X4 通过' : '✗ HVT X1–X4 未达门槛');
  process.exitCode = pass ? 0 : 1;
} finally {
  await stopChrome(ch);
}
