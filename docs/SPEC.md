# 项目规格 v0.1（SPEC）· 甲状腺癌患者工作台「小蝶宝 ThyPal」

状态：**草案，待 G1 签认**。双主体（术后患者+照护者，妊娠期配偶代记权重高）· 占位品牌「小蝶宝 ThyPal」· thyroid-workbench。

## 0. 需求审计
- 核心：甲状腺癌术后患者整理手术病理与风险分层（引用不判定）、甲功与 Tg/TgAb、TSH 抑制剂量、碘131 治疗、颈部超声年度随访、并发症双线，**长程终生随访视角**。
- 红线：T1 分层无判定列；T2 零调药建议；T4 超声零判读；T6 无"可以不查"暗示；证言/私密 visibility。
- G1 待拍板：6 个结构决策点（family-landscape §6.4）+ 品牌名 + 二期 S14–S17。

## 3. ADR
架构家族标准；client 链路 cervical 底本（GBM 踩 3 前置）；apiBase 定稿契约（踩 4）；移植样板 cervical + 基准 breast；MinerU 接入；模型路由 GLM-5.3+Flash。

## 4. 功能范围（10 线 30 页签，family-landscape §6）
F-DASH / F-TUMOR（我的瘤与分层）/ F-SURG（手术与并发症）/ **F-RAI（碘131 档案）** / F-FU（随访与调药）/ F-PREG（妊娠与生育）/ F-CHART / F-LIFE（营养与生活）/ F-CARE / F-FU2（复诊与资料）/ F-SET。

## 7. 验收
G1 四文档签认 → G2 四必查件+HVT X1–X4+窄宽 → G3 冻结 → V1 check → V2/V3 真机。完成度铁律 ✅🔧⏳。

## 8. 明确不做
诊断/判读/分层判定/调药建议/"可以不查"暗示；MTC/ATC 专属模块（一期）；多用户云同步。
