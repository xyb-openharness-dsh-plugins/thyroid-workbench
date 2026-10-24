/* demo/demo-data.sqlite 的播种器：由 demo/build-demo-data.mjs 以**子进程**方式调用。
 *
 * 为什么是子进程：本脚本不被任何模块 import，dsh/demo.js → build-demo-data.mjs 的
 * 静态链在本脚本进程里一次走完，无环；build-demo-data.mjs 直接运行时带顶层 await，
 * 若再 import dsh/demo.js 会形成 TLA 循环等待，Node 直接判死锁。
 *
 * 播种路径与开发版启动完全同一条：migrate 等价（schema/00*.sql 全部顺序执行）+ seedDemo
 * ——这里不另写一份 INSERT（"数据只有一个来源"）。
 */
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedDemo } from '../dsh/demo.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const dbPath = process.argv[2] || join(ROOT, 'demo', 'demo-data.sqlite');

const db = new DatabaseSync(dbPath);
try {
  const files = readdirSync(join(ROOT, 'schema')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) db.exec(readFileSync(join(ROOT, 'schema', f), 'utf8'));
  const counts = seedDemo(db);
  console.log(`seed-demo-sqlite: 迁移 ${files.join(' + ')} · subjects=${counts.subjects} · points=${counts.points} · trials=${counts.trials}${counts.skipped ? ' · 已存在跳过' : ''}`);
} finally {
  db.close();
}
