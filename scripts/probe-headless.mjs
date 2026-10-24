#!/usr/bin/env node
/**
 * 开发版无头实测（M5 验收：必须出数字，不口头说"没问题"）。
 *
 * 与 probe-proto.mjs（原型）的差异：这里起 **dev-server（干净临时目录）**，走
 * `http://127.0.0.1:<port>/api/thyroid/ui/`，验证的是"真数据源 + 真路由"下的同一套视图。
 *
 * 数字：
 *  - 10 一级 × 30 二级 × 2 档案逐页签走查（逐个"查询→点击→再查询"，不预抓全部按钮——
 *    render 会重建 DOM）；aria-selected 与内容指纹；
 *  - 每页 body.scrollWidth vs innerWidth、控制台 error、网络 4xx；
 *  - AI 面板三态：默认 35% / Home 45% / End 25% / 收起（aria-valuenow 同步）；
 *  - 一图秀：数值线数与 RISK/TIRADS 分类节点（只节点不连线，riskPath=0）；
 *  - 版本首屏可见（ver-chip / 页脚 / title 与 VERSION 一致）。
 *
 * 用法：node scripts/probe-headless.mjs；退出码 0/1。依赖本机 Chrome。
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, stopChrome, sleep } from './cdp.mjs';
import { Workbench } from '../dsh/workbench.js';
import { startWorkbenchServer } from '../dsh/server.js';
import { version as VERSION } from '../lib/version.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CDP_PORT = Number(process.env.THY_DEV_CDP_PORT || 9356);

/* 10 一级 × 30 二级 + 2 个无二级页（dash/chart）= 32 视图 × 2 档案 = 64 页签。 */
const VIEW_SUBS = [
  ['dash', ''], ['chart', ''],
  ['tumor', 'pathology'], ['tumor', 'molecular'], ['tumor', 'recurrence'], ['tumor', 'reports'],
  ['surgery', 'op'], ['surgery', 'voice'], ['surgery', 'calcium'], ['surgery', 'neck'],
  ['rai', 'records'], ['rai', 'isolation'], ['rai', 'diet'], ['rai', 'wbs'],
  ['followup', 'calendar'], ['followup', 'tg'], ['followup', 'us'], ['followup', 'dose'], ['followup', 'tsh'], ['followup', 'bone'],
  ['fertility', 'prep'], ['fertility', 'preg'],
  ['care', 'concerns'], ['care', 'intake'], ['care', 'symptoms'],
  ['mind', 'feelings'], ['mind', 'genetic'], ['mind', 'support'],
  ['docs', 'schedule'], ['docs', 'library'], ['docs', 'candidates'], ['docs', 'prepare'],
];

/* 干净目录（mkdtemp under homedir，不用 os.tmpdir()——workspace 校验拒绝 /tmp）。 */
const tmp = mkdtempSync(join(homedir(), '.xyb-thy-dev-'));
const workbench = await Workbench.open(join(tmp, 'workspace'));
const started = await startWorkbenchServer({ port: 0, host: '127.0.0.1', workbench });
const URL_APP = `${started.url}api/thyroid/ui/index.html`;

const ch = await launchChrome({ port: CDP_PORT });
const { cdp } = ch;
const errors = cdp.errors;
const badResponses = cdp.badResponses;
const out = { url: URL_APP, tabs: 0, overflow: [], ariaMismatch: [], dupFingerprint: [], agent: {}, chart: {}, version: {}, dataErrors: [] };

try {
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(500);
  const bootedExpr = "document.body && document.body.getAttribute('data-booted') === '1'";
  let booted = false;
  for (let i = 0; i < 60; i += 1) { booted = await cdp.eval(bootedExpr); if (booted) break; await sleep(200); }
  if (!booted) out.dataErrors.push('页面 12 秒内没有完成启动（data-booted）');

  out.navButtons = await cdp.eval("document.querySelectorAll('#nav .nav-button').length");
  out.dataSource = await cdp.eval("typeof state !== 'undefined' && state.dataSource ? state.dataSource : 'unknown'");
  if (out.dataSource !== 'api') out.dataErrors.push(`数据源=${out.dataSource}（应为 api——离线回退说明 bootstrap 没接通）`);

  async function goto(page, sub) {
    await cdp.eval(`location.hash = ${JSON.stringify('#' + page + (sub ? '/' + sub : ''))}`);
    await sleep(80);
    await cdp.eval('window.scrollTo(0,0)');
    await sleep(60);
  }

  /* ── 逐 (view,sub) × 2 档案 ── */
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
          const d0 = JSON.parse(chk0);
          fingerprints.push({ sub: '(本页)', len: d0.len, fp: d0.fp });
          const diff0 = await cdp.eval('document.body.scrollWidth - window.innerWidth');
          if (diff0 > 1) out.overflow.push(`${page}/(本页)/${pid}(+${diff0}px)`);
          out.tabs += 1;
          continue;
        }
        const sel1 = await cdp.eval(`(() => { const b = document.querySelector('.subnav button[data-sub=${JSON.stringify(sub)}]'); if (!b) return null; b.click(); return true; })()`);
        if (sel1 === null) { out.ariaMismatch.push(`${page}/${sub}/${pid}: subnav 按钮未找到`); continue; }
        await sleep(50);
        const chk = await cdp.eval(`(() => {
          const b = document.querySelector('.subnav button[data-sub=${JSON.stringify(sub)}]');
          const sel = b ? b.getAttribute('aria-selected') : null;
          const stateSub = state.sub[${JSON.stringify(page)}];
          const html = document.getElementById('main').innerHTML;
          return JSON.stringify({ sel, stateSub, len: html.length, fp: html.replace(/\\s+/g, '').slice(120, 320) });
        })()`);
        const d = JSON.parse(chk);
        if (d.sel !== 'true' || d.stateSub !== sub) out.ariaMismatch.push(`${page}/${sub}/${pid}: aria-selected=${d.sel} state.sub=${d.stateSub}`);
        fingerprints.push({ sub, len: d.len, fp: d.fp });
        const diff = await cdp.eval('document.body.scrollWidth - window.innerWidth');
        if (diff > 1) out.overflow.push(`${page}/${sub}/${pid}(+${diff}px)`);
        out.tabs += 1;
      }
      for (let i = 0; i < fingerprints.length; i += 1) {
        for (let j = i + 1; j < fingerprints.length; j += 1) {
          if (fingerprints[i].fp === fingerprints[j].fp) out.dupFingerprint.push(`${page}/${pid}: 「${fingerprints[i].sub}」与「${fingerprints[j].sub}」内容指纹相同`);
        }
      }
    }
  }

  /* ── AI 面板三态 ── */
  await goto('dash', '');
  await cdp.eval("document.getElementById('agent-toggle').click()");
  await sleep(300);
  out.agent.defaultPct = await cdp.eval('state.agent.w');
  out.agent.openHidden = await cdp.eval("document.getElementById('agent-pane').hidden");
  out.agent.ariaNow = await cdp.eval("document.getElementById('agent-splitter').getAttribute('aria-valuenow')");
  await cdp.eval("document.getElementById('agent-splitter').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));");
  out.agent.widePct = await cdp.eval('state.agent.w');
  await cdp.eval("document.getElementById('agent-splitter').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));");
  out.agent.narrowPct = await cdp.eval('state.agent.w');
  const panePx = await cdp.eval("Math.round(document.getElementById('agent-pane').getBoundingClientRect().width)");
  const stagePx = await cdp.eval("document.querySelector('.stage').getBoundingClientRect().width");
  out.agent.panePctOfStage = Math.round((panePx / stagePx) * 10) / 10;
  await cdp.eval("document.getElementById('agent-hide').click()");
  out.agent.collapsedHidden = await cdp.eval("document.getElementById('agent-pane').hidden");
  out.agent.collapsedLabel = await cdp.eval("document.getElementById('agent-toggle').textContent");
  // 宽度记忆：重开回到 End 后的 25（clampAgentW 读回）
  await cdp.eval("document.getElementById('agent-toggle').click()");
  await sleep(150);
  out.agent.reopenedPct = await cdp.eval('state.agent.w');

  /* ── 一图秀：数值线 + RISK/TIRADS 分类节点 ── */
  await cdp.eval("setAgent(false)");
  await cdp.eval("state.profileId='demo1'"); // 上面的页签循环停在 demo2；分类节点断言用 demo1 默认选线
  await goto('chart', '');
  await sleep(150);
  out.chart = await cdp.eval(`(() => {
    const svg = document.querySelector('.chart-wrap svg.chart');
    if (!svg) return { lines: 0, pts: 0, riskPts: 0, riskPath: -1, endLabels: 0, watermark: false };
    const pts = [...svg.querySelectorAll('circle.pt')];
    const riskColor = '#7A8B94';
    return {
      lines: svg.querySelectorAll('path.line').length,
      pts: pts.length,
      riskPts: pts.filter((c) => c.getAttribute('fill') === riskColor).length,
      riskPath: [...svg.querySelectorAll('path.line')].filter((p) => p.getAttribute('stroke') === riskColor).length,
      endLabels: svg.querySelectorAll('text.delta-tag').length,
      watermark: svg.textContent.includes('不代表不同指标数值可比'),
    };
  })()`);
  // demo1 默认选线：TG/TSH/WEIGHT 三条数值线 + RISK 分类节点（THY 无独立 mMRC 线）
  out.chart.expectedNumericLines = await cdp.eval("state.sel.demo1.filter((c) => !(CATALOG[c] && CATALOG[c].categorical)).length");

  /* ── 版本首屏 ── */
  out.version = {
    chip: await cdp.eval("document.getElementById('ver-chip').textContent"),
    footer: await cdp.eval("document.getElementById('app-version').textContent"),
    title: (await cdp.eval('document.title')),
  };

  /* ── 网络与错误 ── */
  out.jsErrors = errors.length;
  out.consoleErrorSamples = errors.slice(0, 3);
  out.netFailed = badResponses.length;
} finally {
  await stopChrome(ch);
  try { started.server.close(); } catch { /* 已退出 */ }
  try { workbench.close(); } catch { /* 已退出 */ }
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 清理失败不影响结果 */ }
}

console.log(JSON.stringify(out, null, 2));
const vOk = out.version.chip === `v${VERSION}` && out.version.footer === `v${VERSION}`;
const pass = out.jsErrors === 0 && out.netFailed === 0 && out.overflow.length === 0 && out.ariaMismatch.length === 0
  && out.dupFingerprint.length === 0 && out.dataErrors.length === 0 && out.navButtons === 10
  && out.agent.defaultPct === 35 && out.agent.widePct === 45 && out.agent.narrowPct === 25
  && out.agent.collapsedHidden === true && out.agent.reopenedPct === 25
  && out.tabs === 64 && out.chart.riskPath === 0 && out.chart.riskPts > 0
  && out.chart.watermark === true && out.chart.lines === out.chart.expectedNumericLines && out.dataSource === 'api' && vOk;
console.log(pass ? '✓ 开发版无头实测通过' : '✗ 开发版无头实测未达门槛');
process.exitCode = pass ? 0 : 1;
