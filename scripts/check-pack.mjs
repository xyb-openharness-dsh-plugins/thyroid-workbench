#!/usr/bin/env node
/**
 * 打包后自检：**装进别人的机器能不能跑**，不是"本地能不能跑"。
 *
 * 为什么单独有这一步（2026-10-21 实测踩坑）：
 *   `dsh/demo.js` import 了 `../demo/build-demo-data.mjs`，而 `package.json` 的 files 里没有 `demo/`。
 *   本地一切正常；装到 Desktop profile 后 `Workbench.open()` 直接
 *   `ERR_MODULE_NOT_FOUND`，整个工作台起不来——`npm run check` 全绿也发现不了，
 *   因为它只跑仓库里的源码，不跑 tarball。
 *
 * 做法：npm pack → 解到临时目录 → **只从解出来的包** import 服务 → 起 port 0 → 打 health/bootstrap/UI。
 * 另加宿主接线四要素（06 号）的 tgz 面断言：
 *   - lib/client.js 里**不得残留** src/ 的占位标记（`__X__` 与"接入骨架"字样 = 0）；
 *   - package.json 的 dsh 块（bundle.patch + client.platform/inject）与 repository 在；
 *   - cordis.patch.yml 的 insert 条目带 config.root（dshHomePath('thyroid-workbench')）；
 *   - files 清单覆盖运行入口（dsh / lib / public / demo 生成器 / schema / assets / patch）。
 *
 * 用法：node scripts/check-pack.mjs [--keep]
 * 退出码：0 = 包可独立启动；1 = 有缺失或有接口不通。
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keep = process.argv.includes('--keep');

/* 临时目录放家目录下：工作台的 workspace 校验会拒绝 /tmp 与 os.tmpdir()。 */
const tmp = mkdtempSync(join(homedir(), '.xyb-thy-pack-'));
const failures = [];
const notes = [];

function step(label, fn) {
  try {
    const r = fn();
    notes.push(`✓ ${label}${r ? ` · ${r}` : ''}`);
    return r;
  } catch (error) {
    failures.push(`${label}：${error.message.split('\n')[0]}`);
    notes.push(`✗ ${label}`);
    return null;
  }
}

let server;
try {
  execFileSync('npm', ['pack', '--pack-destination', tmp, '--silent'], { cwd: root, stdio: 'pipe' });
  const tgz = readdirSync(tmp).find((f) => f.endsWith('.tgz'));
  if (!tgz) throw new Error('npm pack 没产出 tgz');

  const unpacked = join(tmp, 'unpacked');
  mkdirSync(unpacked);
  execFileSync('tar', ['xzf', join(tmp, tgz), '-C', unpacked]);
  const pkgDir = join(unpacked, 'package');
  const pkg = JSON.parse(execFileSync('node', ['-e', `process.stdout.write(JSON.stringify(require(${JSON.stringify(join(pkgDir, 'package.json'))})))`], { encoding: 'utf8' }));
  notes.push(`包：${pkg.name}@${pkg.version} · ${tgz}`);

  /* ---- 宿主接线四要素（H1–H4）在 tgz 面的断言 ---- */
  const clientSrc = await (async () => {
    const { readFile } = await import('node:fs/promises');
    return readFile(join(pkgDir, 'lib', 'client.js'), 'utf8');
  })();
  const placeholders = [...new Set([...clientSrc.matchAll(/__[A-Z_]+__/g)].map((m) => m[0]))];
  if (placeholders.length) throw new Error(`lib/client.js 残留占位标记：${placeholders.join(', ')}`);
  if (clientSrc.includes('接入骨架')) throw new Error('lib/client.js 还是 init 的占位骨架（"接入骨架…"），不是真客户端');
  notes.push(`✓ H3 真客户端 · 占位标记 0 · ${clientSrc.split('\n').length} 行`);
  if (!pkg.dsh?.bundle?.patch || pkg.dsh?.client?.platform !== 'web') throw new Error('package.json 的 dsh 块不完整');
  if (!pkg.repository) throw new Error('package.json 缺 repository（H1）');
  const patch = await (async () => {
    const { readFile } = await import('node:fs/promises');
    return readFile(join(pkgDir, 'cordis.patch.yml'), 'utf8');
  })();
  if (!patch.includes("dshHomePath('thyroid-workbench')")) throw new Error('cordis.patch.yml 缺 config.root: dshHomePath (H2)');
  notes.push('✓ H1 dsh 块 + repository · H2 patch config.root');

  const serverMod = await import(pathToFileURL(join(pkgDir, 'dsh/server.js')).href);
  const wbMod = await import(pathToFileURL(join(pkgDir, 'dsh/workbench.js')).href);

  const ws = join(tmp, 'workspace');
  mkdirSync(ws);
  const wb = await wbMod.Workbench.open(ws);
  const started = await serverMod.startWorkbenchServer({ port: 0, workbench: wb });
  server = started.server;
  const base = `http://127.0.0.1:${started.port}`;

  const health = await (await fetch(`${base}/api/thyroid/health`)).json();
  if (!health.ok) throw new Error(`health 不 ok：${JSON.stringify(health)}`);
  notes.push(`✓ health · ${health.version} · ${health.capabilities.join('/')}`);

  const boot = await (await fetch(`${base}/api/thyroid/bootstrap`)).json();
  const profiles = (boot.profiles || []).map((p) => p.id);
  if (!profiles.length) throw new Error('bootstrap 里没有档案（演示数据没播进去）');
  notes.push(`✓ bootstrap · 档案 ${profiles.join('/')} · layout ${boot.layout ? '有' : '无'} · meta ${boot.meta?.today ?? '缺'}`);

  for (const p of ['index.html', 'app.js', 'style.css', 'demo-data.js']) {
    const r = await fetch(`${base}/api/thyroid/ui/${p}`);
    if (r.status !== 200) throw new Error(`静态文件 ${p}：HTTP ${r.status}`);
  }
  notes.push('✓ 静态四件 · 200');

  /* 设置页的 Token 读写：这是唯一会**写用户磁盘**的接口，必须从 tarball 里验，
     而且要指到临时文件——绝不能碰用户真实的 ~/.thypal/secrets。 */
  const secret = join(tmp, 'mineru-secret.json');
  process.env.THYPAL_MINERU_SECRET = secret;
  process.env.MINERU_TOKEN = ''; // 别让环境变量兜底，掩盖"文件没写进去"
  const before = await (await fetch(`${base}/api/thyroid/settings/mineru`)).json();
  if (before.configured) throw new Error('临时密钥文件还没写就报已配置（环境变量没清干净？）');

  const bad = await fetch(`${base}/api/thyroid/settings/mineru`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: 'sk-bad token' }),
  });
  if (bad.status !== 400) throw new Error(`非法 Token 应给 400，实际 ${bad.status}`);

  const saved = await (await fetch(`${base}/api/thyroid/settings/mineru`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: 'sk-pack-test-123456' }),
  })).json();
  if (!saved.configured || saved.source !== 'file') throw new Error(`保存后状态不对：${JSON.stringify(saved)}`);
  if (!saved.masked.includes('****')) throw new Error('掩码没有打码');
  if (saved.masked.includes('pack-test')) throw new Error('掩码泄漏了 Token 中段');
  const mode = (statSync(secret).mode & 0o777).toString(8);
  if (mode !== '600') throw new Error(`密钥文件权限应为 600，实际 ${mode}`);

  const cleared = await (await fetch(`${base}/api/thyroid/settings/mineru`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'clear' }),
  })).json();
  if (cleared.configured) throw new Error('清除后仍报已配置');
  if (existsSync(secret)) throw new Error('清除后文件还在（应只剩空文件才删）');
  notes.push(`✓ 设置 · 保存→${saved.masked} · 权限 ${mode} · 清除生效 · 非法输入 400`);

  /* 导入接口：失败语义（无 Token 时明确报错，不许假装成功、不许产候选）。 */
  const imp = await fetch(`${base}/api/thyroid/import?name=test.pdf`, {
    method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: Buffer.from('%PDF-1.4 fake'),
  });
  const impBody = await imp.json();
  if (![200, 502, 503].includes(imp.status)) throw new Error(`导入失败态状态码不对：${imp.status}`);
  if (imp.status !== 200 && Array.isArray(impBody.candidates)) throw new Error('解析失败不许返回候选');
  notes.push(`✓ 导入失败语义 · ${impBody.error ?? 'ok'}`);
} catch (error) {
  failures.push(`准备阶段：${error.message.split('\n')[0]}`);
} finally {
  if (server) server.close();
  if (!keep) rmSync(tmp, { recursive: true, force: true });
  else notes.push(`保留临时目录：${tmp}`);
}

console.log(notes.join('\n'));
if (failures.length) {
  console.error('\n✗ 打包自检失败：');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\n✓ 这个 tarball 能在干净目录里独立启动并出接口');
