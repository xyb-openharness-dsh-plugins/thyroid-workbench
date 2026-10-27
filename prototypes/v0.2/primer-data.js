/* 36 号 · 疾病概要数据（小蝶宝 ThyPal · 甲状腺癌）
 * 只写解释层：定义、文件、指南列出的手段、已经发生的版本与登记事实。
 * 规范：docs/36-DISEASE-PRIMER.md；本项目实例清单：docs/DISEASE-PRIMER.md
 */
window.DISEASE_PRIMER = {
  brand: '小蝶宝 ThyPal',
  name: '甲状腺癌',
  en: 'Thyroid Carcinoma',
  updated: '2026-10-25',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: '甲状腺癌是起源于甲状腺的恶性肿瘤，按病理分成四类：乳头状癌、滤泡状癌（两者合称分化型，DTC）、髓样癌（MTC，起源于滤泡旁 C 细胞）、未分化癌（ATC）。'
        + '卫健委《甲状腺癌诊疗指南（2022 年版）》记载，患者最先接触的往往是一份超声报告的结节分类，而不是「癌」这个字。',
      points: [
        '结节分类有两套体系并存：卫健委指南的 TI-RADS（0/1/2/3/4a/4b/4c/5/6）与中华医学会 7 学会的 C-TIRADS（1～6 类）；2022 版原文写「目前 TI-RADS 分类并未统一，可参考表 1 标准」，即不强制某一体系。',
        '穿刺结果按 Bethesda（TBSRTC）6 级报告，每一级对应一段恶性风险区间；区间是统计口径，不是对某一颗结节的判定。',
        '分期按 AJCC 第 8 版：分化型（乳头状 / 滤泡状）以 55 岁划线，小于 55 岁只有 Ⅰ 期（无远处转移）与 Ⅱ 期（有远处转移）；55 岁及以上才按 T/N/M 细分 Ⅰ～ⅣB。',
        '髓样癌与未分化癌不按年龄分层，卫健委 2022 版把两者分列在表 5 / 表 6（p25–p28）。两者各用自己的分期表，与分化型不是同一套逻辑：不能拿分化型的 Ⅰ～ⅣB 去套，也不能把「55 岁划线」搬到它们身上；期别一律记医生原文。',
        '微小乳头状癌不等于「低风险」：指南原文写 ≤1cm 微小癌「通常为体检发现，致死率几乎为 0，复发风险也很低。但微小癌并不都是复发风险低的肿瘤」，约 20% 多灶性微小癌出现颈淋巴结转移。',
        '本台不判断结节良恶性，也不替任何人决定是否手术；判读归超声科、病理科与外科。'
      ],
      sources: [
        { org: '国家卫生健康委员会', doc: '甲状腺癌诊疗指南（2022 年版）', version: '2022-04-11', original: true, url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml', page: 'p9、p14–p15、p25–p29' },
        { org: '中华医学会内分泌学分会等 7 学会', doc: '甲状腺结节和分化型甲状腺癌诊治指南（第二版）', version: '2023', original: false, secondaryUrl: 'https://rs.yiigle.com/cmaid/1451011', page: '页码待核', note: 'C-TIRADS 出处；原件 PDF 未存档，二次来源为中华医学期刊网条目页' },
        { org: 'AJCC', doc: 'AJCC Cancer Staging Manual', version: '第 8 版（2017）', original: false, secondaryUrl: 'https://www.facs.org/quality-programs/cancer-programs/american-joint-committee-on-cancer/cancer-staging-systems/', page: '页码待核', note: '本项目经指南二次引用；链接为 AJCC 官方分期体系页' }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '一台一表，不合并。未取得原件的只记「存在、大致讲什么」，不引用其具体条文与页码；中文规范与国际指南的口径差异并排列出，本表不做换算。',
      table: {
        head: ['机构', '文件', '版本 / 日期', '原件', '本台的用途'],
        rows: [
          ['国家卫生健康委员会', '甲状腺癌诊疗指南（2022 年版）', '2022-04-11', { text: '已取得全文（PDF）', url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml' }, 'TI-RADS、Bethesda、手术范围、风险分层、TSH 目标、碘-131 适应证、复发路径'],
          ['中华医学会内分泌学分会等 7 学会', '甲状腺结节和分化型甲状腺癌诊治指南（第二版）', '2023', { text: '未取得原件，据中华医学期刊网条目页', url: 'https://rs.yiigle.com/cmaid/1451011' }, 'C-TIRADS 的出处，各类恶性风险数字待核验'],
          ['CSCO', '分化型甲状腺癌诊疗指南（2021）／2025 指南会更新要点', '2021／2025-04', { text: '未取得全文', nolink: true, note: 'CSCO 指南以纸质书与订购渠道发行，官网无公开全文；未取得可核验链接' }, '仅记存在；TSH 抑制「双风险模型」的更新要点来自会议报道，待核验'],
          ['中国抗癌协会（CACA）', '中国肿瘤整合诊治指南—甲状腺癌 V2.0', '2025-07', { text: '未取得全文（仅见官方目录页）', url: 'https://cacaguidelines.cacakp.com/pdflist?guide_id=1007' }, '仅记存在'],
          ['美国甲状腺协会（ATA）', '2025 Management Guidelines for Adult Patients with Differentiated Thyroid Cancer', '2025（PMID 40844370）', { text: '未取得全文（摘要级）', url: 'https://www.thyroid.org/professionals/ata-professional-guidelines/' }, '动态反应分层类别名'],
          ['NCCN', 'NCCN Guidelines: Thyroid Carcinoma', 'v1.2025（2025-03）', { text: '未取得（登录墙）', url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1470' }, '髓样癌与嗜酸细胞癌的范围参照'],
          ['国家卫生健康委员会', '新型抗肿瘤药物临床应用指导原则（2024 年版）', '2025-01', { text: '已见关键原文（PDF）', url: 'https://www.nhc.gov.cn/yzygj/c100068/202501/4b86cb63eb03400eb789f371316ecea1.shtml' }, '判断「中国获批 / 未获批」的边界（如达拉非尼+曲美替尼的 ATC 适应症）']
        ]
      },
      points: [
        '中国口径以卫健委 2022 版为基线，页码逐条可查；凡 2023 年以后的新说法（C-TIRADS 数字、ATA 2025 分层细则、CSCO 2025 更新）本台一律标「待核验」，不写「按最新指南」。',
        'ATA 2025 只有摘要级，动态反应分层的四个类别名可核，判定细则与阈值不可核。',
        'NCCN v1.2025 全文未取得，本台只把它当范围参照，不引条文。'
      ],
      sources: [
        { org: '国家卫生健康委员会', doc: '甲状腺癌诊疗指南（2022 年版）', version: '2022-04-11', original: true, url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml', page: '全文（本地 PDF）' },
        { org: '美国甲状腺协会（ATA）', doc: '2025 ATA DTC Guidelines（Ringel MD 等，Thyroid）', version: '2025', original: false, secondaryUrl: 'https://www.thyroid.org/professionals/ata-professional-guidelines/', page: '页码待核', note: '摘要级，PMID 40844370；二次来源为 ATA 官方指南列表页' },
        { org: 'NCCN', doc: 'NCCN Guidelines: Thyroid Carcinoma', version: 'v1.2025', original: false, secondaryUrl: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1470', page: '页码待核', note: '登录墙，全文未取得；二次来源为 NCCN 指南详情页' },
        { org: '国家卫生健康委员会', doc: '新型抗肿瘤药物临床应用指导原则（2024 年版）', version: '2025-01', original: true, url: 'https://www.nhc.gov.cn/yzygj/c100068/202501/4b86cb63eb03400eb789f371316ecea1.shtml', page: '页码待核' }
      ]
    },
    {
      id: 'landscape',
      title: '目前治疗全景概要',
      intro: '只列指南与说明书里出现过的手段类别，按病期与线序分组，不排序、不比优劣。风险分层与适应证判定归医生，本台只负责把「有过哪些路径」写清楚。',
      groups: [
        {
          label: '早期 · 分化型（DTC）',
          points: [
            '主动监测：低危微小乳头状癌可以不开刀、每 6 个月重新评估（卫健委 2022 版 p32–p33 明确列出这条路径）。',
            '手术：腺叶切除或全切，选择取决于肿瘤大小、对侧叶情况、淋巴结与患者意愿（2022 版 p32–p33）；颈部淋巴结清扫按治疗性或预防性分别记录。',
            '术后风险分层：ATA 初始复发风险分低、中、危三层（2022 版 p40–p42 转述 2015 ATA 定义），分层结果决定后面用不用碘、TSH 压到多少。'
          ]
        },
        {
          label: '术后 · 辅助与抑制',
          points: [
            '碘-131：分三种用途——清甲（清除术后残留的正常甲状腺组织）、辅助（处理镜下残留或高危因素）、清灶（治疗摄碘的转移灶）。适应证口径：高危列入推荐、中危可考虑、低危不推荐（2022 版 p42）。',
            '碘-131 的禁忌：妊娠或哺乳期、计划 6 个月内妊娠者（2022 版 p42 原文）。',
            'TSH 抑制：用左甲状腺素把 TSH 压到目标区间，目标随风险与治疗反应变化（高危初始低于 0.1、中危 0.1～0.5、低危 0.5～2.0；2022 版 p43–p44）。目标值一律由医生给出，本台不按公式生成。'
          ]
        },
        {
          label: '复发与远处转移',
          points: [
            '卫健委 2022 版 p63 列出的路径顺序：手术（可能治愈者）、¹³¹I（病灶摄碘者）、外放疗、TSH 抑制下观察（无进展或进展慢、无症状）、化疗与靶向药物及临床试验。',
            '「Tg 阳性、扫描阴性」：全清后 Tg 持续高于 10 ng/ml 而影像未见病灶，可经验性碘治疗后复评；扫描仍阴性则归入碘难治性 DTC，终止碘治疗（2022 版 p45、p64）。',
            '碘难治性 DTC 的靶向药（只列存在该获批路径）：索拉非尼（2017-03 NMPA 批准）、仑伐替尼（2020 年，批件号待核验）、安罗替尼（2021-01 与 2022-04 两处记录有出入，待核验）、多纳非尼（2022-08-12，待核验）。',
            '塞普替尼：2022-09-30 NMPA 附条件批准，含 RET 融合阳性的甲状腺癌与 RET 突变型甲状腺髓样癌。'
          ]
        },
        {
          label: '髓样癌（MTC）',
          points: [
            '髓样癌（MTC）：手术范围比分化型更广（全切加颈清）；术后不需要 TSH 抑制，随访以降钙素、CEA 与超声为主（2022 版 p64）。部分 MTC 为遗传性，需查 RET 胚系突变。'
          ]
        },
        {
          label: '未分化癌（ATC）',
          points: [
            '未分化癌（ATC）：就诊时多已局部晚期，治疗以综合治疗为主——放疗（单纯放疗可用高剂量，指南提到 60Gy 语境）± 手术 ± 化疗或靶向（2022 版 p32、p47）。',
            'BRAF V600E 突变的 ATC：达拉非尼联合曲美替尼获 FDA 批准（2018-05），尚未在中国获批该适应症（卫健委 2024 年版指导原则原文）。本台按「检测存在、境外获批、境内未获批」三层呈现。'
          ]
        }
      ],
      points: [
        '以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。'
      ],
      sources: [
        { org: '国家卫生健康委员会', doc: '甲状腺癌诊疗指南（2022 年版）', version: '2022-04-11', original: true, url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml', page: 'p28–p47、p61–p64' },
        { org: '国家卫生健康委员会', doc: '新型抗肿瘤药物临床应用指导原则（2024 年版）', version: '2025-01', original: true, url: 'https://www.nhc.gov.cn/yzygj/c100068/202501/4b86cb63eb03400eb789f371316ecea1.shtml', page: '页码待核' },
        { org: '国家医疗保障局', doc: '碘难治型分化型甲状腺癌谈判资料（PPT）', version: '2022', original: true, nolink: true, page: '不适用', note: '本台自存的谈判资料 PPT，无公开可核验 URL（仅内部资料，未上网）' },
        { org: '行业媒体与公司公告', doc: '仑伐替尼 / 安罗替尼 / 多纳非尼 / 塞普替尼获批时间报道', version: '2020–2022', original: false, nolink: true, page: '页码待核', note: '未核到 NMPA 官方批件页；媒体报道链接需登录或不稳定，未取得可核验链接' }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '只写已经发生的事实，每条带日期或版本号。不写展望、预测、推荐与优劣比较。',
      points: [
        '指南版本：ATA 于 2025 年发表成人分化型甲状腺癌新指南（Ringel MD 等，Thyroid，PMID 40844370），此前的初始风险分层口径出自 2015 版；NCCN 甲状腺癌指南为 v1.2025（2025-03）。',
        '监管批件：索拉非尼 2017-03 获 NMPA 批准用于碘难治性 DTC；塞普替尼 2022-09-30 获 NMPA 附条件批准（RET 融合甲状腺癌、RET 突变型 MTC）；达拉非尼联合曲美替尼治疗 BRAF V600E 突变 ATC 于 2018-05 获 FDA 批准，中国尚未获批该适应症。',
        '在研登记：2026-10-24 快照，去重后 202 条（CTV 129 条、中国药物临床试验登记与信息公示平台 73 条），登记状态未核实；阶段分布在本次采集中未取得。',
        '分类体系：结节分类目前 TI-RADS（0–6）与 C-TIRADS（1–6）两套并存，卫健委 2022 版原文写「目前 TI-RADS 分类并未统一」；C-TIRADS 的出处为中华医学会 7 学会指南第二版（2023），其恶性风险数字本项目未核到原文。',
        '指南结构：卫健委 2022 版把超声结节分类、穿刺 Bethesda 分级、手术范围、碘-131 适应证与 TSH 目标分别设章列表；髓样癌与未分化癌在同一份指南内单列，不另立通用路径。'
      ],
      sources: [
        { org: '美国甲状腺协会（ATA）', doc: '2025 ATA DTC Guidelines（Thyroid）', version: '2025', original: false, secondaryUrl: 'https://www.thyroid.org/professionals/ata-professional-guidelines/', page: '页码待核', note: '摘要级，PMID 40844370' },
        { org: 'NCCN', doc: 'NCCN Guidelines: Thyroid Carcinoma', version: 'v1.2025', original: false, secondaryUrl: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1470', page: '页码待核', note: '全文未取得；二次来源为 NCCN 指南详情页' },
        { org: '国家卫生健康委员会', doc: '新型抗肿瘤药物临床应用指导原则（2024 年版）', version: '2025-01', original: true, url: 'https://www.nhc.gov.cn/yzygj/c100068/202501/4b86cb63eb03400eb789f371316ecea1.shtml', page: '页码待核' },
        { org: '国家卫生健康委员会', doc: '甲状腺癌诊疗指南（2022 年版）', version: '2022-04-11', original: true, url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml', page: '表 1（TI-RADS）、p28–p47' },
        { org: '本项目登记快照', doc: 'research/thyroid-cancer/manifest.json（unified-trial-mcp）', version: '2026-10-24', original: true, nolink: true, page: '不适用', note: '自采快照；快照文件在仓内 research/thyroid-cancer/manifest.json，无公开 URL（202 条去重，阶段字段未采集）' }
      ]
    }
  ]
}
