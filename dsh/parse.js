/* 文档导入编排（THY）：读原件 → MinerU → thyparse 抽取 → 事务写候选。18 号 v2 六部件之四。
 *
 * 链路：POST /api/thyroid/import（原始文件字节 + ?name=）→ MinerU v4 解析 → full.md
 *      → thyparse 抽指标 → 事务写 document + import_file + parse_job(succeeded) + candidate
 *      → 前端逐条核对（"接受"只改 confirmed，不做医学审核）。
 *
 * 失败语义（18 号 §9，不可让步）：
 * - **失败不产候选**：任一步失败 → 同一事务回滚 → document=parse_failed + parse_job=failed（候选 0 条）；
 * - **不静默降级**：云端失败不做"本地正则凑一份"；
 * - **重试不重置历史**：重复导入按（档案, 文件哈希）去重不新建文档；重试新增一条 parse_job，旧的失败记录留着；
 * - `解析中` 不写进 document.status：库里只有 pending / parsed / parse_failed 三个终态（GIST 教训）。
 * - 本地格式（.txt/.md/.csv）不发云端；.html 白名单拒收（v4 -10002）。
 */

import { createHash } from 'node:crypto';
import { MineruError, createMineruClient } from './mineru.js';
import { extractLabCandidates, guessReportDate } from './thyparse.js';

export { MineruError };

/** 云端解析白名单（18 号 §3：.html 拒收——v4 会给 -10002；.txt/.md/.csv 本地可读，不走云端）。 */
export const CLOUD_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
export const LOCAL_EXTENSIONS = ['.txt', '.md', '.csv'];

export function extensionOf(filename) {
  const i = String(filename ?? '').lastIndexOf('.');
  return i === -1 ? '' : String(filename).slice(i).toLowerCase();
}

/** 文件类型判定：'cloud' 可上云 / 'local' 本地直读 / 'reject' 拒收（.html 与未知扩展名）。 */
export function kindOfFile(filename) {
  const ext = extensionOf(filename);
  if (ext === '.html' || ext === '.htm') return 'reject';
  if (CLOUD_EXTENSIONS.includes(ext)) return 'cloud';
  if (LOCAL_EXTENSIONS.includes(ext)) return 'local';
  return 'reject';
}

/**
 * 导入服务：把「文件 → MinerU → 候选」串起来，并负责落库。
 * db 必须是已 migrate 的库；不传 client 时不联网（单测注入解析函数即可）。
 */
export class ImportService {
  constructor(db, { client = null, clientOptions = null, extract = extractLabCandidates } = {}) {
    this.db = db;
    this.client = client;
    this.clientOptions = clientOptions;
    this.extract = extract;
  }

  /** 客户端懒加载：Token 的解析（可能抛 NO_TOKEN）推迟到真正要上云的那一刻——
   *  这样 .html 拒收、本地直读与"文件为空"的报错不会被 Token 问题抢在前面。 */
  #ensureClient() {
    if (!this.client) this.client = createMineruClient(this.clientOptions ?? {});
    return this.client;
  }

  /** 纯解析：不落库，返回 {markdown, candidates, skipped, document}。 */
  async parse(buffer, { filename = 'document.pdf', profileKey = 'demo1', reportDate = null } = {}) {
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new MineruError('BAD_INPUT', '文件是空的');
    const kind = kindOfFile(filename);
    if (kind === 'reject') throw new MineruError('BAD_INPUT', `暂不支持解析 ${extensionOf(filename) || '无扩展名'} 文件（.html 一律拒收；PDF / 图片 / docx 走云端，txt / md / csv 本地可读）`);

    let markdown = '';
    if (kind === 'local') {
      /* 本地直读：不上云、不消耗额度（18 号 §3 白名单口径）。 */
      markdown = buffer.toString('utf8');
    } else {
      if (!this.#ensureClient()) throw new MineruError('NO_TOKEN', '没有可用的 MinerU 客户端（缺 token？）');
      const parsed = await this.client.parse({ bytes: buffer, filename });
      markdown = parsed.markdown ?? '';
    }
    const { candidates, skipped } = this.extract(markdown);
    const date = guessReportDate(filename) ?? guessReportDate(markdown) ?? reportDate ?? null;
    return {
      markdown,
      candidates,
      skipped,
      document: { profileKey, name: filename, date, type: '检验报告', status: '已解析', pages: null },
    };
  }

  /**
   * 落库（同一事务）：document（有就复用，按档案+哈希去重）+ import_file + parse_job(succeeded)
   * + candidate 逐条。**成功不碰任何事实表**；候选只是候选。
   */
  record({ profileKey, document, candidates = [], bytes = null }) {
    const sha256 = this.#sha256(document, bytes);
    const existing = this.db.prepare('SELECT id FROM document WHERE profile_id = ? AND sha256 = ?').get(profileKey, sha256);
    const ord = this.#nextOrd('document', profileKey);
    this.db.exec('BEGIN');
    try {
      let documentId;
      if (existing) {
        documentId = existing.id; /* 重复导入：不重置已解析状态，只新增任务记录 */
      } else {
        const r = this.db.prepare(`INSERT INTO document
            (profile_id, file_name, sha256, status, imported_at, ord) VALUES (?,?,?,?,?,?)`)
          .run(profileKey, document.name, sha256, 'parsed', document.date ?? new Date().toISOString().slice(0, 10), ord);
        documentId = Number(r.lastInsertRowid);
        if (bytes) {
          this.db.prepare('INSERT INTO import_file (document_id, byte_size, mime, in_use) VALUES (?,?,?,1)')
            .run(documentId, bytes.length, null);
        }
      }
      const job = this.db.prepare('INSERT INTO parse_job (document_id, requested_at, state, error_code, error_message) VALUES (?,?,?,?,?)')
        .run(documentId, new Date().toISOString(), 'succeeded', null, null);
      const ins = this.db.prepare(`INSERT INTO candidate
          (parse_job_id, field_name, value_text, value_num, unit, confirmed, confirmed_at, target_table, target_id)
          VALUES (?,?,?,?,?,0,NULL,NULL,NULL)`);
      candidates.forEach((c) => {
        ins.run(Number(job.lastInsertRowid), c.name, c.value === null ? null : String(c.value),
          typeof c.value === 'number' ? c.value : null, c.unit ?? null);
      });
      this.db.exec('COMMIT');
      return { documentId, jobId: Number(job.lastInsertRowid), candidates: candidates.length };
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch { /* 原始错误优先 */ }
      throw error;
    }
  }

  /** 失败落库：document=parse_failed（新建时）+ parse_job=failed；不产候选，原件保留可重试。 */
  fail({ profileKey, document, bytes = null, error }) {
    const sha256 = this.#sha256(document, bytes);
    try {
      const existing = this.db.prepare('SELECT id FROM document WHERE profile_id = ? AND sha256 = ?').get(profileKey, sha256);
      let documentId;
      if (existing) {
        documentId = existing.id;
      } else {
        const r = this.db.prepare(`INSERT INTO document
            (profile_id, file_name, sha256, status, imported_at, ord) VALUES (?,?,?,?,?,?)`)
          .run(profileKey, document?.name ?? '未知文件', sha256, 'parse_failed',
            new Date().toISOString().slice(0, 10), this.#nextOrd('document', profileKey));
        documentId = Number(r.lastInsertRowid);
        if (bytes) {
          this.db.prepare('INSERT INTO import_file (document_id, byte_size, mime, in_use) VALUES (?,?,?,1)')
            .run(documentId, bytes.length, null);
        }
      }
      this.db.prepare('INSERT INTO parse_job (document_id, requested_at, state, error_code, error_message) VALUES (?,?,?,?,?)')
        .run(documentId, new Date().toISOString(), 'failed', error?.code ?? 'UNKNOWN', String(error?.message ?? error).slice(0, 2000));
      return { documentId };
    } catch (inner) {
      /* 失败落库本身失败只打日志级别的错误——不能再向用户抛第二个错把原始错因盖住 */
      return { documentId: null, secondaryError: inner.message };
    }
  }

  /** 接受一条候选：只改 confirmed 与时间，不写事实表（记录由用户另外确认；接受 ≠ 医学审核）。 */
  accept(candidateId, confirmedAt = new Date().toISOString()) {
    const r = this.db.prepare('UPDATE candidate SET confirmed = 1, confirmed_at = ? WHERE id = ?')
      .run(confirmedAt, Number(candidateId) || candidateId);
    return { changed: r.changes };
  }

  #sha256(document, bytes) {
    return createHash('sha256').update(bytes ?? String(document?.name ?? '')).digest('hex');
  }

  #nextOrd(table, profileKey) {
    const r = this.db.prepare(`SELECT COALESCE(MAX(ord), -1) AS m FROM ${table} WHERE profile_id = ?`).get(profileKey);
    return (r?.m ?? -1) + 1;
  }
}

/** 默认服务：MinerU 客户端从 PLEURAPAL_MINERU_SECRET 文件 / MINERU_TOKEN 取 token（dsh/settings.js 一份实现）。
 *  客户端懒加载：Token 不在构造时解析，白名单/空文件类错误优先于 Token 错误报出。 */
export function createImportService(db, options = {}) {
  const { client, ...rest } = options;
  return new ImportService(db, { client, clientOptions: rest });
}
