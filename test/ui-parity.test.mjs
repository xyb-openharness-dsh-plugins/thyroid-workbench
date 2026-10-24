/* 逐视图 parity：public/ 与 prototypes/v0.2/ 必须是「同一份渲染代码，只换数据来源」。
 *
 * 为什么要有这一条：原型签认（G2）签的是那套视图，开发版如果另写一套，
 * 后面每改一个卡片就要改两处，且原型再也不能当"验收基准"。所以这里钉四件事：
 * 1. 原型里的每个函数在开发版里都存在（不许删视图/删交互）；
 * 2. 开发版新增的函数只能是数据层与启动那一组（白名单），不许偷偷加视图；
 * 3. 导航常量与样式表逐字节一致；
 * 4. index.html 只差 title / 版本号 / favicon / noindex。
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const proto = read('prototypes/v0.2/app.js');
const shipped = read('public/app.js');

/** 从源码里抠出一个 `const X = ...` 形式的常量块（原型与开发版同形，够用）。 */
function block(src, name) {
  const i = src.indexOf(`const ${name} = `);
  assert.notEqual(i, -1, `找不到常量 ${name}`);
  return src.slice(i, src.indexOf('\n};', i) + 3 || src.length);
}

const fnNames = (src) => [...src.matchAll(/function ([A-Za-z_$][\w$]*)/g)].map((m) => m[1]).sort();

test('① 视图函数：原型里的每个函数开发版都有（一个都不许丢）', () => {
  const shippedSet = new Set(fnNames(shipped));
  const missing = fnNames(proto).filter((n) => !shippedSet.has(n));
  assert.deepEqual(missing, [], `开发版缺少这些函数：${missing.join(', ')}`);
});

test('② 新增函数只能是数据层与启动组（防止偷偷另写一套视图）', () => {
  const ALLOWED = new Set([
    'deriveApiBase', 'apiBaseProblems', 'apiBase', 'applyData', 'loadBootstrap',
    'showBootBanner', 'boot', 'loadAgentW', 'saveAgentW', 'agentLabelFor',
  ]);
  const protoSet = new Set(fnNames(proto));
  const extra = fnNames(shipped).filter((n) => !protoSet.has(n) && !ALLOWED.has(n));
  assert.deepEqual(extra, [], `开发版多出未登记的函数：${extra.join(', ')}（要加就先想清楚是不是在另写视图）`);
});

test('③ 10 个一级页与 30 个子页签：两边完全一致', () => {
  for (const name of ['PAGES', 'SUBPAGES', 'SUBTITLES', 'SCENES']) {
    assert.equal(block(shipped, name), block(proto, name), `${name} 与原型不一致`);
  }
  const pages = [...proto.matchAll(/\['([a-z0-9]+)', '[^']+', '[a-z0-9]+'\]/g)].map((m) => m[1]);
  assert.equal(new Set(pages).size, 10, '一级页 10 条（family-landscape §6.1）');
});

test('④ 指标目录与分类口径常量两边一致（分级口径不能只改一边）', () => {
  for (const name of ['CATALOG', 'CAT_ORDER']) {
    assert.equal(block(shipped, name), block(proto, name), `${name} 与原型不一致`);
  }
});

test('⑤ 样式表与原型逐字节一致（改视觉先改原型，再同步过来）', () => {
  assert.equal(read('public/style.css'), read('prototypes/v0.2/style.css'));
});

test('⑥ index.html 只差 <title>、版本号、favicon、noindex：不允许开发版自己造一套骨架', () => {
  const strip = (html) => html
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/<meta name="robots"[^>]*>\n?/g, '')
    .replace(/<meta name="description"[^>]*>\n?/g, '')   // 开发版的 description 措辞与原型不同（title 类元信息）
    .replace(/<!-- 内联 favicon[\s\S]*?-->\n?<link rel="icon"[^>]*>\n?/g, '')
    .replace(/v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g, 'vX.Y.Z')
    .trim();
  assert.equal(strip(read('public/index.html')), strip(read('prototypes/v0.2/index.html')),
    'index.html 与原型不一致；若确需改骨架，先同步改原型');
});

test('⑦ 接口基址与 bootstrap 路径写死成前端唯一来源（改前缀要改这里）', () => {
  assert.match(shipped, /\/api\/thyroid\/bootstrap/, 'Bootstrap 路径必须显式写出来');
  assert.match(shipped, /function apiBase\(\)/, '必须从 location.pathname 反推基址，dev 与 Desktop 共用一份');
  assert.match(shipped, /function deriveApiBase\(/, '双形态回归测试要能抠出纯函数');
  assert.ok(shipped.includes('${apiBase()}/api\/thyroid/'), '页面统一拼 ${API_BASE}/api\/thyroid/...（不出现第二套拼接）');
});

test('⑧ 数据层替换点：异步启动 + 横幅 + AI 五态 + 宽度记忆都在（五处定点替换齐）', () => {
  assert.match(shipped, /async function boot\(\)/, '启动必须异步化（先取数据再 render）');
  assert.match(shipped, /function showBootBanner\(/, '启动期校验失败渲染错误横幅（禁裸 throw 白屏）');
  assert.match(shipped, /function agentLabelFor\(/, 'AI 五态按钮要有纯函数');
  assert.match(shipped, /AI 对话暂不可用/, '五态第五态文案在');
  assert.match(shipped, /function loadAgentW\(\)/, '宽度读回要过 clampAgentW');
  assert.match(shipped, /loadBootstrap\(\)/, '数据从 bootstrap 来');
});
