/* 宿主侧入口（lib/client.js）的离线自检 + apiBase 双形态回归（踩 4 教训，v0.1.3 契约）。
 *
 * 为什么值得单独测：这个文件**不经过任何打包/编译**，直接丢给宿主 renderer 的
 * `window.__ModuleLoader__.load({id, factory})`。家族里踩过三次：
 *   - 写成原生 ESM（`export default`）→ renderer 报 `Unexpected token 'export'`，
 *     还会触发 plugin-recovery 把整个包移出 profile；
 *   - register 少传 `businessSide/businessWidth` → 面板宽度按宿主默认，页面被挤成一条；
 *   - customFrame=false 时宿主自己画会话区：顶栏没有 AI 按钮、分栏拖不动（实机反馈）。
 * 这类错误在仓库里 `npm run check` 不会红（没人执行这个文件），装到 Desktop 才发现。
 *
 * apiBase 双形态（DEV-REQUIREMENTS 定稿契约）：
 *   API_BASE = 挂载前缀（独立启动空串，宿主 /api/thyroid-workbench）；
 *   守卫 /(^|\/)api$/ 只禁交界重复 /api/api —— 宿主前缀含 /api 是正常的。
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const SRC = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');

/** 极简 React 替身：createElement 记录 tag/props/children；hooks 用一次性桩。 */
const React = {
  createElement(tag, props, ...children) {
    return { tag, props: props || {}, children };
  },
  useState(initial) { return [typeof initial === 'function' ? initial() : initial, () => {}]; },
  useRef(value) { return { current: value }; },
  useEffect() {},
  useCallback(fn) { return fn; },
};

/** 假 localStorage：client.js 顶层会读一次宽度与草稿队列。 */
function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function loadClient() {
  let captured = null;
  const sandbox = {
    window: {
      __ModuleLoader__: { load(spec) { captured = spec; } },
      location: { origin: 'http://localhost' },
      addEventListener() {},
      removeEventListener() {},
    },
    localStorage: fakeStorage(),
  };
  const require = (name) => {
    if (name === 'react') return React;
    throw new Error(`client.js 不该 require(${name})——宿主只保证 react 可用`);
  };
  /* eslint-disable no-new-func */
  new Function('window', 'localStorage', 'require', `${SRC}\n`)(sandbox.window, sandbox.localStorage, require);
  return captured;
}

test('① 必须是 ModuleLoader.load({id, factory}) 包装的普通脚本，不能是 ESM；无占位残留', () => {
  assert.equal(/^\s*export\s/m.test(SRC), false, '出现 export 会被 renderer 拒绝');
  assert.equal(/^\s*import\s/m.test(SRC), false, '不能被当成 ESM 解析');
  assert.equal(/__[A-Z_]+__/.test(SRC), false, '构建 token 不许残留在生成物里（装机占位=0）');
  assert.equal(SRC.includes('接入骨架'), false, '不许还是 init 的占位骨架');
  const spec = loadClient();
  assert.ok(spec, '没有调用 window.__ModuleLoader__.load');
  assert.equal(spec.id, '@xyb-community/thyroid-workbench');
  assert.equal(typeof spec.factory, 'function');
});

test('② factory 只依赖 react，返回 {apply, inject}，inject 必须带 sessions（会话桥接要用）', () => {
  const spec = loadClient();
  const mod = spec.factory((name) => {
    if (name === 'react') return React;
    throw new Error(`factory 里 require(${name}) 会炸`);
  });
  assert.equal(typeof mod.apply, 'function');
  assert.deepEqual(mod.inject, ['desktopWorkbenches', 'sessions']);
});

test('③ register 参数：标题、仓库、customFrame（left / 0.65 / true）、品牌是「小蝶宝」', () => {
  const spec = loadClient();
  const mod = spec.factory(() => React);
  let registered = null;
  const ctx = {
    effect(fn) { return fn(); },
    desktopWorkbenches: {
      register(meta, Panel) { registered = { meta, Panel }; },
    },
  };
  mod.apply(ctx);
  assert.ok(registered, 'apply 里没有 register');
  assert.match(registered.meta.title, /小蝶宝/);
  assert.equal(registered.meta.repository, 'https://github.com/xyb-openharness-dsh-plugins/thyroid-workbench');
  assert.equal(registered.meta.layout.businessSide, 'left');
  assert.equal(registered.meta.layout.businessWidth, 0.65);
  assert.equal(registered.meta.customFrame, true,
    'customFrame=false 时宿主自己画会话区：顶栏没有 AI 按钮、分栏拖不动（2026-10-21 实机反馈）');
  assert.equal(registered.meta.embedded, true);
  assert.match(registered.meta.audience, /甲状腺癌（THY）患者与照护者/u);
});

test('④ Panel 自绘 header + 业务 iframe + 会话 aside + splitter（不是裸 iframe）', () => {
  const spec = loadClient();
  const mod = spec.factory(() => React);
  let Panel = null;
  mod.apply({
    effect(fn) { return fn(); },
    desktopWorkbenches: { register(meta, P) { Panel = P; } },
  });

  /* 无会话态：也能渲染，且首个子元素必须是 <header>（宿主为 macOS 窗口按钮留了避让变量） */
  const tree = Panel({});
  assert.equal(tree.tag, 'div');
  assert.equal(tree.children[0]?.tag, 'header', '根节点首个子元素必须是语义 <header>');
  assert.match(tree.children[0].props.style.paddingInlineStart, /--dsh-frame-leading-clearance/);

  /* 顶栏右侧必须有 AI 对话按钮（五态的初态文案） */
  const actions = tree.children[0].children.find((c) => c?.props?.style?.marginLeft === 'auto');
  assert.ok(actions, '顶栏缺少右侧按钮组（margin-left:auto）');
  const labels = actions.children.map((c) => (typeof c === 'string' ? c : c?.children?.join?.('') ?? ''));
  assert.ok(labels.some((t) => /AI 对话/.test(t)), `顶栏没有 AI 对话按钮：${labels.join(' | ')}`);

  /* 业务区是 iframe 指到本包 UI 前缀，不维护第二套 UI */
  const body = tree.children[1];
  const iframe = body.children[0].children[0];
  assert.equal(iframe.tag, 'iframe');
  assert.equal(iframe.props.src, '/api\/thyroid/ui/');

  /* 会话区：无会话时给引导文案，且节点始终在树里（隐藏靠 display，不卸载） */
  const aside = body.children.find((c) => c && c.tag === 'aside');
  assert.equal(aside.tag, 'aside');
  assert.equal(aside.props.style.display, 'none');
  assert.match(JSON.stringify(aside.children), /AI 对话还没开始/);

  /* 有会话时：aside 显示，并出现可拖 splitter（role=separator + aria-valuenow） */
  const live = Panel({ conversation: { tag: 'div', props: {}, children: ['native'] } });
  const liveBody = live.children[1];
  const liveAside = liveBody.children.find((c) => c && c.tag === 'aside');
  assert.equal(liveAside.tag, 'aside', 'aside 必须排在分隔线之后');
  assert.equal(liveAside.props.style.display, 'flex');
  assert.equal(liveAside.props.style.width, '35%', '默认会话宽度应取 AGENT_PANE.def=0.35');
  const splitter = liveBody.children.find((c) => c && c.props && c.props.role === 'separator');
  assert.ok(liveBody.children.indexOf(splitter) < liveBody.children.indexOf(liveAside), '分隔线必须夹在业务区与会话之间');
  assert.equal(splitter?.props?.role, 'separator');
  assert.equal(splitter.props['aria-valuemin'], 25);
  assert.equal(splitter.props['aria-valuemax'], 45);
  assert.equal(splitter.props['aria-valuenow'], 35);
  assert.equal(splitter.props.tabIndex, 0, 'splitter 必须可聚焦，键盘才调得了');
});

/* ---------------- apiBase 双形态回归（deriveApiBase 纯函数，从 public/app.js 抠出） ---------------- */

const APP = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const deriveSrc = APP.slice(APP.indexOf('function deriveApiBase'), APP.indexOf('function apiBaseProblems'));
const apiBaseProblemsSrc = APP.slice(APP.indexOf('function apiBaseProblems'), APP.indexOf('/** 当前页面用的基址'));
/** 在沙箱里跑抠出来的两个纯函数（不加载整个 app.js——它要 DOM）。 */
function loadApiBaseFns() {
  const sandbox = {};
  new Function('exports', `${deriveSrc}\n${apiBaseProblemsSrc}\nexports.deriveApiBase = deriveApiBase; exports.apiBaseProblems = apiBaseProblems;`)(sandbox);
  return sandbox;
}

test('⑤ apiBase 双形态：独立启动（/api/thyroid/ui）→ 空串；宿主（/api/thyroid-workbench 前缀）→ 挂载前缀', () => {
  const { deriveApiBase } = loadApiBaseFns();
  assert.equal(deriveApiBase('/api\/thyroid/ui/index.html'), '', '独立启动：剥掉自己的 API 前缀后应为空串');
  assert.equal(deriveApiBase('/api\/thyroid/ui/'), '');
  assert.equal(deriveApiBase('/api\/thyroid-workbench/api\/thyroid/ui/index.html'),
    '/api/thyroid-workbench', '宿主挂载前缀要原样保留（含 /api 是正常的）');
  assert.equal(deriveApiBase('/api\/thyroid-workbench/api\/thyroid/ui/'), '/api\/thyroid-workbench');
  assert.equal(deriveApiBase('/some/other/mount/api\/thyroid/ui/x'), '/some/other/mount');
  assert.equal(deriveApiBase('/ui/'), '');
  assert.equal(deriveApiBase('/'), '');
});

test('⑥ 守卫只禁交界重复 /api/api，不许 includes("/api") 一刀切；非法基址有清单', () => {
  const { deriveApiBase, apiBaseProblems } = loadApiBaseFns();
  /* 交界重复：挂载前缀本身以 /api 结尾（如误配 /api）→ 剥掉，不产生 /api/api/... */
  assert.equal(deriveApiBase('/api/api\/thyroid/ui/index.html'), '', '前缀 /api + 自身前缀 → 剥成空串');
  assert.equal(deriveApiBase('/api/ui/x'), '', '裸 /api 挂载 → 剥成空串');
  /* 宿主前缀中段的 /api 不许被碰 */
  const host = deriveApiBase('/api/thyroid-workbench/api/thyroid/ui/index.html');
  assert.ok(host.includes('/api\/thyroid-workbench'));
  assert.deepEqual(apiBaseProblems(host), [], '宿主形态的基址合法（含 /api 不是问题）');
  assert.deepEqual(apiBaseProblems(''), [], '空串合法');
  assert.ok(apiBaseProblems('http://x').length > 0, '非绝对路径要报');
  assert.ok(apiBaseProblems('/api').length > 0, '以 /api 结尾要报（会拼出 /api/api）');
  assert.ok(apiBaseProblems('/a/api/api').length > 0, '重复 /api/api 要报');
});

test('⑦ 生成物注入一致性：VERSION / 前缀 / 面板参数在 lib/client.js 里与各自来源一致', () => {
  const version = readFileSync(new URL('../lib/version.js', import.meta.url), 'utf8').match(/export const version = '([^']+)'/)?.[1];
  assert.match(SRC, new RegExp(`const VERSION = '${version}'`), '客户端版本必须来自 lib/version.js');
  assert.match(SRC, /const UI_ENTRY = '\/api\/thyroid\/ui\//, 'UI 入口必须来自 dsh/routes.js 的 UI_PREFIX');
  assert.match(SRC, /const API_PREFIX = '\/api\/thyroid'/, 'API 前缀必须来自 dsh/routes.js');
  assert.match(SRC, /'thyp\.pal\.thyroid\.agent-pane\.v1'/, 'localStorage 键是 THY 品牌前缀');
  assert.match(SRC, /thy:agent-draft/, 'postMessage 消息类型两端同改（业务侧同源）');
  assert.equal(/cervipal|pleura\.pal|小莲宝|小胸宝/i.test(SRC), false, '不许残留 cervical 品牌痕迹');
  const app = APP;
  assert.equal(/cervipal:|pleura:|小莲宝|CerviPal|小胸宝|PleuraPal/i.test(app), false, 'public/app.js 不许残留 cervical 品牌痕迹');
  assert.match(app, /api\/thyroid\/bootstrap/, 'bootstrap 路径必须显式写出（前端唯一来源）');
});
