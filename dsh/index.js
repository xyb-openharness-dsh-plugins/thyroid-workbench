/**
 * 包的入口：DSH 插件的服务端侧。宿主加载的就是这个文件，需要
 * `name` / `inject` / `Config` / `apply` 四样（workbench-standard §3.4）。
 *
 * 这一层只做四件事：
 * 1. 打开数据（配了 `root` 就用那个资料目录；没配就退到内存演示库，保证装上去能看见东西）；
 * 2. 过宿主鉴权（`connection.requestRejection`），不自己造登录；
 * 3. 把请求交给 `dsh/routes.js` 那张**两条链路共用**的路由表（dev-server 用的是同一份，
 *    否则本地能开、装进 Desktop 就 404）；
 * 4. 卸载时按序关库。
 *
 * 为什么 UI 走 iframe：业务界面（public/，10 个视图）是一份独立的前端，宿主只负责
 * 把它放进面板的业务区。面板本身是 **customFrame=true**（见 lib/layout.js 顶部注释：
 * 标准分栏下宿主不提供 AI 按钮位与拖宽接口），由 lib/client.js 自绘 header + 会话分栏，
 * iframe 只是业务区那半边的容器。iframe 指向 `/api/thyroid/ui/`，页面里的接口基址
 * 按自身路径推出来（见 public/app.js 的 apiBase()），所以「本地 dev-server 打开」与
 * 「装进 Desktop」用的是同一份前端，不需要两套构建。
 */
import Schema from '@deepseek-ai/schemastery'
import { mkdirSync } from 'node:fs'
import { openDatabase, migrate, close } from './store.js'
import { seedDemo, hasDemoData } from './demo.js'
import { bootstrap, getProfile } from './readmodels.js'
import { servePublic } from './server.js'
import { createApiHandler, API_PREFIX, UI_PREFIX } from './routes.js'
import { version, build } from '../lib/version.js'

export const name = 'thyroid-main'
export const inject = ['webServer', 'connection']

/** 接口前缀与 UI 前缀：真身在 routes.js；这里再导出一次是为了给包检查与前端文档一个稳定入口。 */
export { API_PREFIX, UI_PREFIX }

/** Config 必须是 Schemastery schema；root 可选——不给就用内存演示库。 */
export const Config = Schema.object({
  root: Schema.string(),
})

function sendJson(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body), 'utf8')
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': buf.length, 'cache-control': 'no-store' })
  res.end(buf)
}

/** 打开数据源。返回 { db, bootstrap(), profile(), close() }。 */
function openDataSource(root) {
  // 没配资料目录：内存库 + 演示数据。只读演示，不落盘，不会在用户机器上留文件。
  const file = root ? `${root.replace(/\/+$/, '')}/xyb-thyroid.sqlite` : ':memory:'
  /* 宿主的 dshHomePath 只**拼路径**，不会建目录：`harness/thyroid-workbench/` 在全新机器上
     并不存在，SQLite 在不存在的目录里建不了文件，界面会报「打不开数据库」
     （小甲宝 0.2.3 装机原样踩过，2026-10-24）。开库前 recursive 建一次。 */
  if (root) {
    try {
      mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true })
    } catch (error) {
      throw new Error(`建不了资料目录：${file}（${error.code || error.message}）`)
    }
  }
  const db = openDatabase(file)
  migrate(db)
  if (!hasDemoData(db)) seedDemo(db)
  return {
    db,
    bootstrap: () => bootstrap(db, { version, build }),
    profile: (key) => getProfile(db, key),
    close: () => close(db),
  }
}

export function apply(ctx, config = {}) {
  if (!ctx.webServer?.register) throw new Error('Desktop webServer.register is unavailable')

  let source = null
  let failure = null
  let lastTry = Number.NEGATIVE_INFINITY

  /* 开库失败**不锁死到进程生命周期**（小甲宝 0.3.0 真机踩过：宿主进程是装包之前启动的，
     只在加载时试一次的话，用户装好新包、重开工作台看到的永远是同一句「打不开数据库」）。
     这里改成懒重试：每次请求前若还没有数据源就再试一次，1s 防抖避免坏盘时空转。 */
  function ensureSource() {
    if (source) return source
    const now = Date.now()
    if (now - lastTry < 1000) return null
    lastTry = now
    try {
      source = openDataSource(config.root)
      failure = null
    } catch (error) {
      source = null
      failure = error.message
    }
    return source
  }

  // 启动时仍先试一次：绝大多数情况目录/库都正常，热路径上不要再进防抖分支
  ensureSource()

  /* 路由层拿到的是一个**代理**：方法每次调用时才去要数据源，`db` 用 getter。
     这样数据源自愈后不用重建 handler，也就没有"重试了但路由还拿着旧的空壳"这种半死状态。 */
  const api = createApiHandler({
    source: {
      get db() {
        const current = ensureSource()
        if (!current) throw new Error(failure || '数据源尚未就绪')
        return current.db
      },
      bootstrap: () => {
        const current = ensureSource()
        if (!current) throw new Error(failure || '数据源尚未就绪')
        return current.bootstrap()
      },
      profile: (key, opts) => {
        const current = ensureSource()
        return current ? current.profile(key, opts) : null
      },
    },
    version,
    build,
    serveUi: (req, res, urlPath) => servePublic(req, res, urlPath),
    // 传函数而不是字符串：/health 与 503 分支每次请求重新取值（见 routes.js 的 failureOf）
    failure: () => failure,
  })

  const handler = (req, res) => {
    // 鉴权：宿主不给结论就不放行，不自建登录态
    if (typeof ctx.connection?.requestRejection !== 'function') {
      return sendJson(res, 503, { error: 'connection authentication capability unavailable' })
    }
    const rejection = ctx.connection.requestRejection(req)
    if (rejection !== undefined) return sendJson(res, rejection, { error: 'Authentication required' })

    /* 数据源打不开时只有 /health 能回（带错误原因），其余走各自分支的 503。 */
    return api(req, res)
  }

  ctx.effect(() => {
    const dispose = ctx.webServer.register({ kind: 'prefix', path: API_PREFIX, handler })
    return () => {
      try { dispose && dispose() } catch { /* 宿主卸载时的清理失败不该盖住原错误 */ }
      if (source) { try { source.close() } catch { /* 同上 */ } }
    }
  }, 'thyroid ui + api')
}
