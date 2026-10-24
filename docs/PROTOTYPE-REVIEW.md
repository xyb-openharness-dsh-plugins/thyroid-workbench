# HTML 交互原型确认记录（PROTOTYPE-REVIEW）· v0.2 · THY

状态：**已制作、已自验、独立评审通过（P0=0；P1×3 已修订 c3dcdc1/3d3cdc1）、G1+G2 已签（2026-10-24，samqin123）**。签认前版本冻结 de27ba4；允许实施全部 30 页签。
独立评审：DESIGN-REVIEW.md（PASS 8 / WARN 5 / FAIL 0 + fork 残留专项 FAIL→已清零；对象 a5ca5ef）。
修订：P1-1 fork 残留清零（style.css 29 处 + RESPONSIVE 示例词，grep 复扫=0，探针复跑 fatal=null）；P1-2 证据方向勘误（患者 65.8%>配偶 59.6%，Bian 2024——三处文档同步，教训：引用方向必须原文核对）；P1-3 孤儿页 7 个全入路径（SCENES+文档同步，孤儿=0）；P2-1 T 编号统一（DEV-REQ 为权威表）。

- 路径/版本：prototypes/v0.2/，git HEAD（见下），app.js sha256 前缀 0587a8281e4d3b3（132,640 字节）
- 对应版本：SPEC v0.1 + SCENARIOS S01–S17 + INTERACTION-DESIGN v1（13 路径+16 实体 CRUD）+ schema/draft（未冻结）
- 预览：file:// 直开；两档案（陈志强·乳头状癌术后 2 年自记 / 林晚秋·滤泡癌备孕丈夫代记）
- 视图：10 一级 / 30 二级 × 2 档案 + 设置/档案弹窗

## 自验数字（构建方）
截图 65 张；页签 64/64（aria+指纹）；溢出 0/error 0/网络失败 0；禁词 0（risk_level·自动分级·建议调整剂量·可以不查）；必现句 6/6；HVT X1–X4（覆盖 64/64、场景 13/13、编辑 ≤1、候选闭环）；窄宽 80 组合 0 问题；红线 T1–T7 全落位（分层全文引用/剂量版本链+目标原文/RAI 独立轨道 30mCi·隔离 3 天/超声三列零判读/并发症不并入趋势/年度语境/妊娠冷却期倒计时+MTC-ATC 标注）。

## 独立视觉抽查（主线）
- rai-records-demo1：**通过**——"只记已发生的事实与原文"常驻（T3 红线）、湖蓝青换肤、独立线导航。

## 遗留
支持资源并入 mind/support 页签（方案 B 同 MPM）；M5 客户端接线/schema 对账/市场件不在 M2 范围。

## 真机缺陷修复（2026-10-24，用户发现）

| 项 | 内容 |
| --- | --- |
| 症状 | 一图秀出现巨大黑色填充块（用户截图），分类标签错位 |
| 根因 | **SVG 根缺 `class="chart"`**（M2 手写偏差）——`.chart .line{fill:none}` 等全部图表规则选择器不匹配，path 回退默认黑填充 |
| 定位 | CDP computed fill  rgb(0,0,0) → 与 MPM 仓逐行 diff（path 代码相同）→ svg 根标签对比抓到 |
| 修复 | svg 根补 `class="chart"`（一行）；修复后三细线/网格/末点标签全部恢复（截图复验） |
| **评审盲区教训** | 探针 chart 断言只数 `paths=3` 不断言视觉样式——**数量对 ≠ 颜色对**；检查器待实施第⑥项：probe 加 computed fill 断言（`.chart .line` fill=none、stroke 非黑）；P1-1 的 CSS 清理曾以"逐行 token 删"造成次生损伤（已回滚改块级+括号平衡+活规则断言）——**CSS 清理禁逐行删，必须引用验证+渲染验证双保险** |
