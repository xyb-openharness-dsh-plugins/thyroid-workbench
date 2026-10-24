/* HTTP 层：健康检查 / bootstrap / 静态文件 / 未知接口 / 路径穿越 / 资料目录校验 /
 * 设置三态（文件 > env）/ 导入失败不产候选。
 *
 * 起真实服务（port:0 由系统分配），只用内置 fetch。测完必须关 server 与 db，
 * 否则 node --test 进程不会退出。
 */

import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { createServer } from 'node:http';
import { Workbench, validateWorkspacePath } from '../dsh/workbench.js';
import { startWorkbenchServer } from '../dsh/server.js';
import { API_PREFIX, UI_PREFIX, createApiHandler } from '../dsh/routes.js';
import { DB_FILE } from '../dsh/workbench.js';

const tmp = mkdtempSync(join(homedir(), '.xyb-thy-server-'));
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 清理失败不影响结果 */ } });

async function withServer(fn) {
  const workbench = await Workbench.open(join(tmp, 'workspace'));
  const { server, port, url } = await startWorkbenchServer({ port: 0, host: '127.0.0.1', workbench });
  try {
    await fn({ url, port, workbench });
  } finally {
    await new Promise((r) => server.close(r));
    workbench.close();
  }
}

test('① 前缀契约：API_PREFIX=/api/thyroid，库文件=xyb-thyroid.sqlite', () => {
  assert.equal(API_PREFIX, '/api/thyroid');
  assert.equal(UI_PREFIX, '/api/thyroid/ui');
  assert.equal(DB_FILE, 'xyb-thyroid.sqlite');
});

test('② /api/thyroid/health 返回 ok 与版本', async () => {
  await withServer(async ({ url }) => {
    const r = await fetch(`${url}api/thyroid/health`);
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.ok, true);
    assert.match(j.version, /^\d+\.\d+\.\d+/);
    assert.equal(j.ui, '/api/thyroid/ui');
    assert.ok(j.capabilities.includes('mineru-settings'), '能力清单要能看出设置接口在');
  });
});

test('③ /api/thyroid/bootstrap 返回两档案且与 demo-data.js 同形（meta + profiles 数组）', async () => {
  await withServer(async ({ url }) => {
    const r = await fetch(`${url}api/thyroid/bootstrap`);
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.deepEqual(j.profiles.map((p) => p.id), ['demo1', 'demo2']);
    assert.ok(j.profiles[0].metrics.numeric.TSH.length >= 5);
    assert.equal(j.meta.today, '2026-10-24');
    assert.equal(j.agent.available, true, '开发版自带挂载位演示');
    assert.ok(j.layout.agentPane, '布局常量要随 bootstrap 下发给前端');
  });
});

test('④ 单档案接口：存在返回档案，不存在 404', async () => {
  await withServer(async ({ url }) => {
    const one = await (await fetch(`${url}api/thyroid/profile/demo1`)).json();
    assert.equal(one.profile.id, 'demo1');
    const miss = await fetch(`${url}api/thyroid/profile/nope`);
    assert.equal(miss.status, 404);
  });
});

test('⑤ 静态文件：UI 前缀能取到 index.html，路径穿越被拦', async () => {
  await withServer(async ({ url }) => {
    const r = await fetch(`${url}api/thyroid/ui/index.html`);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /小蝶宝/);

    const evil = await fetch(`${url}api/thyroid/ui/..%2f..%2fpackage.json`);
    const body = await evil.text();
    assert.equal(body.includes('"private": true'), false, '不许把仓库文件读出去');
  });
});

test('⑥ 未知接口回 JSON 404（不能回 HTML，前端按 JSON 解析）', async () => {
  await withServer(async ({ url }) => {
    const r = await fetch(`${url}api/thyroid/nope`);
    assert.equal(r.status, 404);
    assert.match(r.headers.get('content-type'), /application\/json/);
    assert.equal((await r.json()).error, 'not_found');
  });
});

test('⑦ 导入接口：失败要明确报错，不许假装成功、不许产候选', async () => {
  await withServer(async ({ url }) => {
    /* 喂伪造 PDF（预期失败）。断言的是"失败要说清是哪一类"，不依赖网络是否通。 */
    const r = await fetch(`${url}api/thyroid/import?name=test.pdf`, {
      method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: Buffer.from('%PDF-1.4 fake'),
    });
    const j = await r.json();
    assert.ok([200, 502, 503].includes(r.status), `状态码不该是 ${r.status}`);
    if (r.status !== 200) {
      assert.ok(['NO_TOKEN', 'UNAUTHORIZED', 'NETWORK', 'TIMEOUT', 'API_ERROR', 'BAD_INPUT', 'TASK_FAILED', 'NO_MARKDOWN', 'BAD_ZIP']
        .includes(j.error), `失败原因不在已知枚举里：${j.error}`);
      assert.equal(Array.isArray(j.candidates), false, '解析失败不许返回候选');
    } else {
      assert.ok(Array.isArray(j.candidates), '成功时必须有 candidates 数组（哪怕是空的）');
    }
    /* .html 白名单拒收（18 号 v2）：本地不发请求就拒绝，错误码 BAD_INPUT */
    const html = await fetch(`${url}api/thyroid/import?name=report.html`, {
      method: 'POST', headers: { 'content-type': 'text/html' }, body: '<table><tr><td>x</td></tr></table>',
    });
    assert.equal(html.status, 502);
    assert.equal((await html.json()).error, 'BAD_INPUT');
  });
});

test('⑧ 资料目录校验：主目录 / 桌面 / /tmp 一律拒绝', () => {
  assert.ok(validateWorkspacePath(homedir()).length > 0);
  assert.ok(validateWorkspacePath(join(homedir(), 'Desktop')).length > 0);
  assert.ok(validateWorkspacePath('/tmp/x').length > 0);
  assert.deepEqual(validateWorkspacePath(join(tmp, 'ok')), [], '自己新建的目录应当可用');
});

/* ---------------- 文档解析设置：Token 手工填写与文件同步（三态） ---------------- */

/** 每个用例用独立密钥文件；同时清掉 MINERU_TOKEN，避免开发机上的环境变量把结果带偏。 */
async function withTokenEnv(fn) {
  const file = join(tmp, `mineru-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  const before = { secret: process.env.THYPAL_MINERU_SECRET, token: process.env.MINERU_TOKEN };
  process.env.THYPAL_MINERU_SECRET = file;
  delete process.env.MINERU_TOKEN;
  try {
    await fn({ file });
  } finally {
    if (before.secret === undefined) delete process.env.THYPAL_MINERU_SECRET; else process.env.THYPAL_MINERU_SECRET = before.secret;
    if (before.token === undefined) delete process.env.MINERU_TOKEN; else process.env.MINERU_TOKEN = before.token;
  }
}

const postToken = (url, body) => fetch(`${url}api/thyroid/settings/mineru`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

test('⑨ 设置页三态可区分：未配置 / 文件生效 / env 生效，未配置不编"已配置"', async () => {
  await withTokenEnv(async () => {
    await withServer(async ({ url }) => {
      const empty = await (await fetch(`${url}api/thyroid/settings/mineru`)).json();
      assert.equal(empty.configured, false);
      assert.equal(empty.source, 'none');
      assert.equal(empty.masked, '');
      assert.match(empty.tokenUrl, /apiManage\/token/u, '没有 Token 时也要给申请入口');
    });
    process.env.MINERU_TOKEN = 'sk-env-only-token-1234';
    await withServer(async ({ url }) => {
      const j = await (await fetch(`${url}api/thyroid/settings/mineru`)).json();
      assert.equal(j.configured, true);
      assert.equal(j.source, 'env', '只有环境变量时来源要写明，不能说得像已保存');
      assert.match(j.sourceLabel, /环境变量/u);
      assert.match(j.masked, /^sk-e\*\*\*\*34$/u, '掩码只露首尾');
    });
  });
});

test('⑩ 手工保存 Token：写进密钥文件、权限 600、接口不回传原文；文件优先于 env（18 号 v2）', async () => {
  await withTokenEnv(async ({ file }) => {
    await withServer(async ({ url }) => {
      const token = 'sk-manual-input-abcdef123456';
      const r = await postToken(url, { token });
      assert.equal(r.status, 200);
      const saved = await r.json();
      assert.equal(saved.configured, true);
      assert.equal(saved.source, 'file');
      assert.equal(JSON.stringify(saved).includes(token), false, '响应里不能出现 Token 原文');
      assert.equal(saved.masked, 'sk-m****56');

      assert.equal(existsSync(file), true, '保存后文件必须真的存在（与界面显示同步）');
      assert.equal(JSON.parse(readFileSync(file, 'utf8')).token, token);
      assert.equal((statSync(file).mode & 0o777).toString(8), '600', '密钥文件必须 600');

      const again = await (await fetch(`${url}api/thyroid/settings/mineru`)).json();
      assert.equal(again.masked, saved.masked, '重新读取要与保存后的状态一致');
      assert.equal(again.source, 'file');

      /* 文件 > env（2026-10-22 统一口径）：env 里遗留的过期 Key 不能盖住文件 */
      const previous = process.env.MINERU_TOKEN;
      process.env.MINERU_TOKEN = 'sk-stale-env-000000';
      try {
        const { resolveToken } = await import('../dsh/mineru.js');
        const resolved = resolveToken();
        assert.equal(resolved.source, 'secret-file', '文件必须排在环境变量前面');
        assert.equal(resolved.token, token);
      } finally {
        if (previous === undefined) delete process.env.MINERU_TOKEN; else process.env.MINERU_TOKEN = previous;
      }
    });
  });
});

test('⑪ 无效输入不写文件；清除只删 token 键并保留其它键', async () => {
  await withTokenEnv(async ({ file }) => {
    await withServer(async ({ url }) => {
      const bad = await postToken(url, { token: 'short' });
      assert.equal(bad.status, 400);
      assert.equal(existsSync(file), false, '校验失败不该留下文件');

      const spaced = await postToken(url, { token: 'sk-has space in token' });
      assert.equal(spaced.status, 400);

      assert.equal((await postToken(url, { token: 'sk-good-token-123456' })).status, 200);
      writeFileSync(file, JSON.stringify({ token: 'sk-good-token-123456', note: 'keep-me' }));
      const cleared = await (await postToken(url, { action: 'clear' })).json();
      assert.equal(cleared.configured, false);
      assert.equal(cleared.source, 'none');
      const left = JSON.parse(readFileSync(file, 'utf8'));
      assert.equal(left.token, undefined);
      assert.equal(left.note, 'keep-me', '清除只该动 token 键');
    });
  });
});

test('⑫ 密钥文件坏了要报出来，不当作"未配置"静默覆盖', async () => {
  await withTokenEnv(async ({ file }) => {
    writeFileSync(file, '{ broken json');
    await withServer(async ({ url }) => {
      const j = await (await fetch(`${url}api/thyroid/settings/mineru`)).json();
      assert.match(j.error || '', /不是合法 JSON/u, '坏文件要在状态里说清楚');
      assert.equal(j.configured, false);
      const r = await postToken(url, { token: 'sk-other-token-777777' });
      assert.equal(r.status, 500);
      assert.match((await r.json()).message, /不是合法 JSON/u);
      assert.equal(readFileSync(file, 'utf8'), '{ broken json', '坏文件不能被静默覆盖');
    });
  });
});

test('⑬ failure 传函数：数据源自愈后 /health 与 503 立即跟着变（不锁死到进程生命周期）', async () => {
  /* 这个用例盯 0.1.4 的改法：宿主进程常在装包之前启动，插件若把"打不开"定死成构造时的
     一个字符串，用户装好新包、只重开工作台时看到的永远是同一句错。传函数才能按请求求值。 */
  let reason = '打不开数据库：/tmp/nowhere/xyb.sqlite';
  const source = {
    db: null,
    bootstrap: () => ({ ok: true, profiles: [] }),
    profile: () => null,
  };
  const handler = createApiHandler({
    source,
    version: 'test',
    build: 'test',
    serveUi: () => false,
    failure: () => reason,
  });

  const server = createServer((req, res) => { handler(req, res).catch(() => { res.writeHead(500); res.end(); }); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const bad = await (await fetch(`${base}${API_PREFIX}/health`)).json();
    assert.equal(bad.ok, false, '数据源不可用时应如实报');
    assert.match(bad.error, /打不开数据库/);

    const blocked = await fetch(`${base}${API_PREFIX}/bootstrap`);
    assert.equal(blocked.status, 503, '不可用时业务接口统一 503，不假装返回空数据');
    assert.match((await blocked.json()).message, /打不开数据库/);

    reason = null; // 排障完成：数据源恢复
    const good = await (await fetch(`${base}${API_PREFIX}/health`)).json();
    assert.equal(good.ok, true, '/health 必须按请求重新取值，不能停在构造时的那一句');
    assert.equal(good.error, undefined);

    const passed = await fetch(`${base}${API_PREFIX}/bootstrap`);
    assert.equal(passed.status, 200, '自愈后业务接口应恢复，不必重启宿主');
  } finally {
    await new Promise((r) => server.close(r));
  }
});
