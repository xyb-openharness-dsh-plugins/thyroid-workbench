/* 路由表：独立启动（dev-server）与 DSH 宿主两条链路共用这一份。
 *
 * 为什么要抽出来：不抽的话 `/api/thyroid/bootstrap` 会有两个实现，本地能开、装进 Desktop
 * 就 404（食管癌那轮踩过）。这里只依赖 node 内置模块，**不许 import Schemastery**
 * —— 独立启动时那个 peer 依赖并不存在。
 *
 * 鉴权不在这里：宿主链路由 dsh/index.js 先过 `connection.requestRejection`，
 * 独立启动本来就只有本机访问，不需要登录态。
 */

export const API_PREFIX = '/api/thyroid'
export const UI_PREFIX = `${API_PREFIX}/ui`

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024

function sendJson(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body), 'utf8')
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': buf.length, 'cache-control': 'no-store' })
  res.end(buf)
}

/** 错误 → {status, body}。MinerU 的错因直接透传，但不带 token。 */
function errorBody(error) {
  const code = error?.code
  if (code && typeof code === 'string' && /^[A-Z_]+$/.test(code)) {
    const status = code === 'NO_TOKEN' || code === 'UNAUTHORIZED' ? 503 : 502
    return { status, body: { error: code, message: error.message } }
  }
  if (error?.status === 413) return { status: 413, body: { error: 'too_large', message: error.message } }
  return { status: 500, body: { error: 'internal_error', message: error.message } }
}

function readBody(req, limit = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(Object.assign(new Error('文件超过 30 MB'), { status: 413 })); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/**
 * @param {object} opts
 * @param {{bootstrap():object, profile(key:string, opts?:object):object|null, db:object}} opts.source
 * @param {string} opts.version
 * @param {string} opts.build
 * @param {(req:object,res:object,path:string)=>boolean} opts.serveUi 静态文件出口（两条链路的 public/ 定位不同）
 * @param {string|null|(()=>string|null)} [opts.failure] 数据源打不开的原因；非空时除 /health 外一律 503。
 *   **允许传函数**：宿主进程常在装包之前就启动了，插件若把"打不开"定死成构造时的一个字符串，
 *   用户装好新包、只重开工作台时看到的永远是同一句错（小甲宝 0.3.0 真机踩过）。传函数则每次
 *   请求重新取值，数据源自愈后错误自然消失。
 */
export function createApiHandler({ source, version, build, serveUi, failure = null }) {
  /* 一次取值，按请求求值：failure 可以是字符串（老调用方式）或函数（懒重试）。 */
  const failureOf = () => (typeof failure === 'function' ? failure() : failure)
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://127.0.0.1')
    const path = url.pathname
    const why = failureOf()

    if (path === `${API_PREFIX}/health`) {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' })
      return sendJson(res, 200, {
        ok: !why, version, build, apiVersion: 'v1', ui: UI_PREFIX,
        capabilities: ['bootstrap', 'profile', 'import', 'candidate', 'mineru-settings'],
        error: why || undefined,
      })
    }

    /* 数据源打不开：/health 已经报了原因，其它接口统一 503，不假装返回空数据。 */
    const unavailable = (res2) => sendJson(res2, 503, { error: 'bootstrap_unavailable', message: why })
    if (why && path !== `${API_PREFIX}/health` && !(path === UI_PREFIX || path.startsWith(`${UI_PREFIX}/`))) return unavailable(res)

    if (path === `${API_PREFIX}/bootstrap`) {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' })
      try {
        return sendJson(res, 200, source.bootstrap())
      } catch (error) {
        const { status, body } = errorBody(error)
        return sendJson(res, status, body)
      }
    }

    /* 单档案（导入落库后的即时核对用）；私密过滤在前端 sharedOnly 一处做（MPM 口径）。 */
    const profileMatch = path.match(new RegExp(`^${API_PREFIX}/profile/([^/]+)$`))
    if (profileMatch) {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' })
      const key = decodeURIComponent(profileMatch[1])
      const profile = source.profile(key)
      if (!profile) return sendJson(res, 404, { error: 'profile_not_found', key })
      return sendJson(res, 200, { profile })
    }

    /* 导入：原始字节 + 查询串，走 MinerU；只写候选不写记录（A2）。 */
    if (path === `${API_PREFIX}/import`) {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
      const filename = url.searchParams.get('name') || 'document.pdf'
      const profileKey = url.searchParams.get('profile') || 'demo1'
      const persist = url.searchParams.get('persist') === '1'
      try {
        const { createImportService } = await import('./parse.js')
        const bytes = await readBody(req)
        const service = createImportService(source.db)
        const result = await service.parse(bytes, { filename, profileKey })
        if (persist) result.record = service.record({ profileKey, document: result.document, candidates: result.candidates })
        /* markdown 全文可能很大：默认不回，需要时加 ?full=1。 */
        return sendJson(res, 200, { ...result, markdown: url.searchParams.get('full') === '1' ? result.markdown : undefined })
      } catch (error) {
        const { status, body } = errorBody(error)
        return sendJson(res, status, body)
      }
    }

    /* 接受候选：只改状态，不写记录（接受 ≠ 医学审核）。 */
    const acceptMatch = path.match(new RegExp(`^${API_PREFIX}/candidate/([^/]+)/accept$`))
    if (acceptMatch) {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
      try {
        const { createImportService } = await import('./parse.js')
        const service = createImportService(source.db)
        return sendJson(res, 200, service.accept(decodeURIComponent(acceptMatch[1])))
      } catch (error) {
        const { status, body } = errorBody(error)
        return sendJson(res, status, body)
      }
    }

    /* 文档解析设置：Token 的读取（只给掩码与路径）与手工保存/清除。
       两条链路共用这一份，所以设置页在本地 dev-server 与 Desktop 里行为一致。
       原文永不出现在响应里——界面只需要知道「有没有配、存在哪个文件、哪把 key 生效」。 */
    if (path === `${API_PREFIX}/settings/mineru`) {
      const settings = await import('./settings.js')
      if (req.method === 'GET') {
        try {
          return sendJson(res, 200, settings.mineruSettingsStatus())
        } catch (error) {
          return sendJson(res, 500, { error: 'settings_unavailable', message: error.message })
        }
      }
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
      let body = {}
      try {
        const raw = await readBody(req, 64 * 1024)
        body = raw.length ? JSON.parse(raw.toString('utf8')) : {}
      } catch {
        return sendJson(res, 400, { error: 'bad_json', message: '请求体不是合法 JSON' })
      }
      try {
        const status = body?.action === 'clear'
          ? settings.clearMineruToken()
          : settings.saveMineruToken(body?.token)
        return sendJson(res, 200, status)
      } catch (error) {
        /* 校验失败是用户输入问题（400）；文件坏、写不进去是环境问题（500） */
        const status = /请先填写|太短|过长|不能有空格|意外字符|不合法 JSON/.test(error.message) ? 400 : 500
        return sendJson(res, status, { error: status === 400 ? 'invalid_token' : 'settings_write_failed', message: error.message })
      }
    }

    if (path === UI_PREFIX || path.startsWith(`${UI_PREFIX}/`)) {
      return void serveUi(req, res, path.slice(UI_PREFIX.length) || '/')
    }
    return sendJson(res, 404, { error: 'not_found', path })
  }
}
