/* 数据层：迁移幂等 / 播种幂等 / 与 demo-data.js 的 parity / 读模型形状 / THY 专属断言（T1–T7）。
 *
 * parity 是这一层最重要的断言：开发版 `/api/bootstrap` 的 profiles 必须与定稿原型
 * prototypes/v0.2/demo-data.js 逐字段一致。前端是照着原型的形状写的，
 * 差一个字段就是"某个卡片空白"这种很难定位的 bug。
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { openDatabase, migrate, close } from '../dsh/store.js';
import { seedDemo, hasDemoData } from '../dsh/demo.js';
import { bootstrap, listSubjects, getProfile } from '../dsh/readmodels.js';

const ROOT = new URL('..', import.meta.url).pathname;
const demoSrc = readFileSync(join(ROOT, 'prototypes/v0.2/demo-data.js'), 'utf8');
const DEMO = JSON.parse(demoSrc.slice(demoSrc.indexOf('=') + 1, demoSrc.lastIndexOf('};') + 1));

const tmp = mkdtempSync(join(homedir(), '.xyb-thy-test-'));
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 清理失败不影响结果 */ } });

test('① migrate 幂等：第二次执行不重跑已应用的迁移（0001 冻结 30 表 + 0002 增量 5 新表）', () => {
  const db = openDatabase(':memory:');
  const first = migrate(db);
  const second = migrate(db);
  assert.deepEqual(first.executed, ['0001_initial.sql', '0002_thy_dev_columns.sql'], '首次应执行 0001 + 0002');
  assert.deepEqual(second.executed, [], '第二次不应重跑');
  assert.equal(second.applied.length, 2);
  const tables = db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> 'schema_migrations'").get().n;
  assert.equal(tables, 35, `30 + 5 = 35 张表（不计迁移台账），实际 ${tables}`);
  close(db);
});

test('② seedDemo 幂等：调两次只写一份档案', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  const a = seedDemo(db);
  const b = seedDemo(db);
  assert.equal(a.skipped, false);
  assert.equal(a.subjects, 2);
  assert.equal(b.skipped, true, '第二次应整批跳过');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profile').get().n, 2);
  close(db);
});

test('③ parity：库里读出的 profiles 与 demo-data.js 逐字段一致（两档案全量 deepStrictEqual）', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  for (const key of ['demo1', 'demo2']) {
    const expect = DEMO.profiles.find((p) => p.id === key);
    assert.ok(expect, `demo-data.js 里要有档案 ${key}`);
    assert.deepStrictEqual(getProfile(db, key), expect, `profiles.${key} 与 demo-data.js 不一致`);
  }
  const payload = bootstrap(db, { version: '0.2.0', build: 'test' });
  assert.equal(payload.profiles.length, 2);
  assert.equal(payload.meta.today, DEMO.meta.today);
  assert.equal(payload.meta.materialNote.includes('职业病线'), true, 'meta 要带"无职业病线"声明（THY 材料红线）');
  assert.equal(payload.version, '0.2.0');
  close(db);
});

test('④ 读模型形状：指标点按 rowid（插入序）、数值是数字、分类序列走 metric_point（is_numeric=0）', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p = getProfile(db, 'demo1');
  const tg = p.metrics.numeric.TG;
  assert.equal(tg.length, 3, `demo1 Tg 应 3 点，实际 ${tg.length}`);
  assert.equal(typeof tg[0].v, 'number', '数值指标读出来必须是数字');
  assert.deepEqual(tg.map((x) => x.v), [0.2, 0.4, 0.9], 'Tg 0.2→0.4→0.9 原样还原（数值照抄，不判读）');
  const dates = p.metrics.numeric.TSH.map((pt) => pt.d);
  assert.deepEqual(dates, [...dates].sort(), '指标点必须按采样日期升序（rowid=插入序）');
  /* 分类序列：RISK（ATA 动态分层，医生维护标签）与 TIRADS 走 metric_point，只节点不连线 */
  assert.equal(p.metrics.qual.RISK.length, 2);
  assert.equal(p.metrics.qual.RISK[0].label, '极佳应答');
  assert.equal(p.metrics.qual.TIRADS[0].label, '3 类');
  const bad = db.prepare('SELECT COUNT(*) AS n FROM metric_point p JOIN metric_def d ON d.code = p.code WHERE d.is_numeric = 0 AND (p.value_num IS NULL OR p.value_text IS NULL)').get().n;
  assert.equal(bad, 0, '分类点必须 code+label 同时在（value_num=code、value_text=label）');
  close(db);
});

test('⑤ 文件库：真实落盘 + 重开后资料仍在（播种只发生一次）', () => {
  mkdirSync(join(tmp, 'nested'), { recursive: true });
  const file = join(tmp, 'nested', 'xyb-thyroid.sqlite');
  const db1 = openDatabase(file);
  migrate(db1);
  seedDemo(db1);
  close(db1);
  const db2 = openDatabase(file);
  migrate(db2);
  assert.equal(hasDemoData(db2), true, '重开后档案还在');
  assert.equal(seedDemo(db2).skipped, true, '重开后不应再播种一遍');
  close(db2);
});

test('⑥ T1+分子三态：ATA 分层只引用原文（无 risk_level 列）；未检测 ≠ 阴性', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  /* T1 红线：schema 无 risk_level / 自动分级列 */
  const cols = db.prepare("SELECT name FROM pragma_table_info('pathology_type')").all().map((c) => c.name);
  assert.equal(cols.some((c) => /risk_level|auto_grade/i.test(c)), false, 'pathology_type 不许有 risk_level 计算列');
  for (const key of ['demo1', 'demo2']) {
    const p = getProfile(db, key);
    assert.match(p.pathology.ataInitialQuote, /危险度分层/, `${key} ATA 初始分层必须是原文引用`);
    assert.ok(p.pathology.dynamicHistory.length >= 1, `${key} 动态分层变更史要有（医生维护标签）`);
    const states = new Set(p.molecular.map((m) => m.status));
    assert.ok(states.has('not_tested'), `${key} 必须有「未检测」项（未检测不等于阴性）`);
    for (const m of p.molecular) {
      assert.ok(['detected', 'not_detected', 'not_tested'].includes(m.status), `非法三态：${m.status}`);
      if (m.status === 'not_tested') {
        assert.equal(m.value, null, `未检测项不该有结果值：${m.marker}`);
        assert.match(m.explain, /未检测/, `未检测项要带常驻解释：${m.marker}`);
      }
    }
  }
  close(db);
});

test('⑦ T3 碘131 独立档案：剂量/隔离天数/出院指导原文按次还原，隔离 checklist 有 done 状态', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p1 = getProfile(db, 'demo1');
  assert.equal(p1.rai.courses.length, 1);
  const c = p1.rai.courses[0];
  assert.equal(c.kind, '清甲');
  assert.equal(c.dose, '30 mCi（1.11 GBq）');
  assert.equal(c.isolationDays, 3);
  assert.match(c.dischargeQuote, /隔离|餐具/, '出院指导原文要在列');
  assert.ok(p1.rai.isolation.length >= 3 && p1.rai.isolation.every((i) => typeof i.done === 'boolean'), '隔离 checklist 状态化');
  const p2 = getProfile(db, 'demo2');
  assert.equal(p2.rai.courses[0].dose, '80 mCi（2.96 GBq）');
  assert.equal(p2.rai.courses[0].isolationDays, 5);
  close(db);
});

test('⑧ T2 剂量版本链 + TSH 目标原文并列：医生调整留痕、零调药建议字段', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p = getProfile(db, 'demo1');
  assert.deepEqual(p.followup.doseTimeline.map((d) => d.version), ['v1', 'v2'], '剂量时间线是版本链');
  assert.deepEqual(p.followup.doseTimeline.map((d) => d.item.match(/(\d+) μg/)[1]), ['100', '125']);
  assert.equal(p.followup.tshTarget.range, '0.1–0.5 mIU/L');
  assert.match(p.followup.tshTarget.quote, /医嘱原文/, '目标区间必须带医生原文出处');
  const cols = db.prepare("SELECT name FROM pragma_table_info('lt4_dose')").all().map((c) => c.name);
  assert.equal(cols.some((c) => /advice|suggest/i.test(c)), false, '剂量表不许有建议字段（T2 红线）');
  close(db);
});

test('⑨ T5 并发症双轨：声音线独立轨道 + 血钙/PTH 化验带参考区间原文；都不进一图秀数值序列', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p = getProfile(db, 'demo1');
  assert.ok(p.surgery.voice.entries.length >= 3, '声音线要有时间线');
  assert.equal(p.surgery.voice.entries[0].state, 'moderate');
  assert.match(p.surgery.voice.laryngoscopy[0].quote, /声带/, '喉镜原文要在列');
  assert.ok(p.surgery.calcium.labs.length >= 3, '钙/PTH 序列要在');
  assert.match(p.surgery.calcium.labs[0].refCa, /2\.11–2\.52/, '参考区间照化验单原文并列');
  assert.equal('CA' in p.metrics.numeric, false, '钙/PTH 不进一图秀数值序列（T5：并发症不并入趋势）');
  assert.equal('PTH' in p.metrics.numeric, false, 'PTH 同上');
  close(db);
});

test('⑩ M5 双主体：viewpoints 与 family 分流回两组、visibility 原样、witnessed 徽章数据在', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p = getProfile(db, 'demo2');
  assert.ok(p.viewpoints.length >= 3 && p.family.length >= 3, 'demo2 的感受与家事都要还原');
  assert.ok(p.viewpoints.every((v) => ['PATIENT', 'CAREGIVER'].includes(v.role)));
  assert.ok(p.viewpoints.some((v) => v.visibility === 'private'), '私密看法要还原（过滤在前端 sharedOnly 一处做）');
  assert.ok(p.family.every((f) => typeof f.witnessed === 'boolean'), 'witnessed 必须是布尔（代记徽章）');
  const sharedOnly = (pp) => pp.viewpoints.filter((v) => v.visibility !== 'private');
  assert.ok(sharedOnly(p).length < p.viewpoints.length, 'sharedOnly 过滤要真的滤掉 private');
  close(db);
});

test('⑪ T7 妊娠按记录不判定：冷却期说明卡原样、fertility_plan 结构化轨道在列', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p1 = getProfile(db, 'demo1');
  assert.equal(p1.fertility, null, 'demo1 无妊娠语境');
  const p2 = getProfile(db, 'demo2');
  assert.equal(p2.fertility.state, '备孕 · RAI 冷却期');
  assert.match(p2.fertility.cooldown.quote, /6–12 个月/, '冷却期区间必须带医生答复原文');
  assert.ok(p2.fertility.pregCards.length >= 2, '孕期说明卡（记录不判定）要在');
  const row = db.prepare("SELECT cooling_until, status_text FROM fertility_plan WHERE profile_id = 'demo2'").get();
  assert.equal(row.cooling_until, '2027-04-10');
  assert.equal(row.status_text, '备孕 · RAI 冷却期');
  close(db);
});

test('⑫ 18 号 v2 候选语义：候选挂合成导入文档（demo-import）下，资料库列表排除它', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p = getProfile(db, 'demo1');
  assert.equal(p.candidates.length, 3, '演示候选 3 条');
  assert.ok(p.candidates.every((c) => c.state === '待核对'), '候选默认待核对（导入不产"已核对"）');
  assert.equal(p.documents.some((d) => d.name.includes('演示候选')), false, '资料库列表不许出现合成导入行');
  assert.equal(p.documents.length, 5);
  const docs = db.prepare("SELECT COUNT(*) AS n FROM document WHERE ext_id = 'demo-import'").get().n;
  assert.equal(docs, 2, '两档案各一条合成导入文档');
  close(db);
});
