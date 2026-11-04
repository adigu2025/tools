/* 健保用藥給付規定摘要：降血脂與 B 肝兩個判定頁的「給付規定」按鈕顯示這份內容。
   effective＝規定生效日（健保署公告），checked＝最後一次查核「有沒有新修訂」的日期。
   aria 每週週報會查健保署新公告；有新修訂時，改判讀邏輯（calc/app.js）並同步改這裡，
   只確認沒有新修訂時，把 checked 改成查核當天即可。
   內容是本工具採用的條文重點，不是條文全文，正式內容以健保署公告為準。 */
const RX_RULES = {
  lipidrx: {
    title: '降血脂藥物給付規定',
    code: '藥品給付規定 第 2 節 2.6.1',
    effective: '115 年 9 月 1 日（2026-09-01）',
    checked: '2026-11-04',
    change: '依「2025 台灣血脂管理臨床路徑共識」改以 ASCVD 風險分級訂 LDL-C 起始值與目標（表一）；舊制分級改列表二，兩表並存。PCSK9 起始值已於 114 年 9 月 1 日由 135 下修為 100 mg/dL。',
    source: { label: '健保署：藥品給付規定修訂對照表 第 2 節（115/9/1 生效）', url: 'https://www.nhi.gov.tw/ch/dl-100842-f34d34af17374f04ae02e87f1ea8ac56-1.pdf' },
    sections: [
      { h: '表一（新制品項）：依 ASCVD 風險分級',
        html:
          '<table><thead><tr><th>風險等級</th><th>條件（舉例）</th><th>LDL-C 起始</th><th>目標</th><th>生活型態</th></tr></thead><tbody>' +
          '<tr><td>極高風險</td><td>冠心病合併一年內 MI、≥2 次 MI、多支阻塞、ACS 合併糖尿病、周邊動脈疾病或頸動脈狹窄；周邊動脈疾病合併冠心病或頸動脈狹窄</td><td>≥ 55</td><td>&lt; 55（non-HDL &lt; 85）</td><td rowspan="3">與藥物並行</td></tr>' +
          '<tr><td>非常高風險</td><td>ACS 病史、血管再通術、缺血性中風／TIA、有症狀周邊動脈疾病、影像 ≥50% 狹窄</td><td>≥ 70</td><td>&lt; 70（non-HDL &lt; 100）</td></tr>' +
          '<tr><td>高風險</td><td>糖尿病、慢性腎臟病、LDL-C ≥190、CAC ≥400</td><td>≥ 100</td><td>&lt; 100（non-HDL &lt; 130）</td></tr>' +
          '<tr><td>中風險</td><td>風險因子 ≥2 項</td><td>≥ 115</td><td>&lt; 115（non-HDL &lt; 145）</td><td rowspan="3">先 3 至 6 個月</td></tr>' +
          '<tr><td>低風險</td><td>風險因子 1 項</td><td>≥ 130</td><td>&lt; 130（non-HDL &lt; 160）</td></tr>' +
          '<tr><td>0 項風險因子</td><td>無</td><td>≥ 160</td><td>&lt; 160</td></tr>' +
          '</tbody></table>' +
          '<p>風險因子：高血壓、年齡（男 ≥45、女 ≥55）、早發冠心病家族史、HDL-C 偏低（男 &lt;40、女 &lt;50）、吸菸、代謝症候群。</p>' +
          '<p>追蹤：起始治療 6 至 8 週驗血脂，達標後每 6 個月；需先生活型態調整者，調整 3 至 6 個月後驗血脂。</p>' },
      { h: '表二（舊制品項）',
        html:
          '<table><thead><tr><th>分級</th><th>起始值</th><th>目標</th><th>非藥物治療</th></tr></thead><tbody>' +
          '<tr><td>ACS 病史或曾 PCI／CABG</td><td>LDL-C ≥ 70</td><td>LDL-C &lt; 70</td><td rowspan="2">與藥物並行</td></tr>' +
          '<tr><td>心血管疾病或糖尿病</td><td>TC ≥ 160 或 LDL-C ≥ 100</td><td>TC &lt; 160 或 LDL-C &lt; 100</td></tr>' +
          '<tr><td>危險因子 ≥2 項</td><td>TC ≥ 200 或 LDL-C ≥ 130</td><td>TC &lt; 200 或 LDL-C &lt; 130</td><td rowspan="3">先 3 至 6 個月</td></tr>' +
          '<tr><td>危險因子 1 項</td><td>TC ≥ 240 或 LDL-C ≥ 160</td><td>TC &lt; 240 或 LDL-C &lt; 160</td></tr>' +
          '<tr><td>危險因子 0 項</td><td>LDL-C ≥ 190</td><td>LDL-C &lt; 190</td></tr>' +
          '</tbody></table>' +
          '<p>危險因子：高血壓、男 ≥45 歲或女 ≥55 歲或停經、家族史、HDL-C &lt;40、吸菸（因吸菸而符合者，未戒菸應自費）。第一年每 3 至 6 個月抽血，第二年起至少每 6 至 12 個月。</p>' +
          '<p>表一、表二品項以健保代碼為準，不是只看商品名。</p>' },
      { h: 'Ezetimibe 與複方',
        html:
          '<ul><li>statin 單一治療 6 至 8 週未達標，可合併 ezetimibe 或改用複方；部分品項（如 Ezetity、Ezzicad、Ezta 10、Ezetimibe Sandoz 與數個複方）仍需滿 3 個月。</li>' +
          '<li>statin 無法耐受：可單用 ezetimibe（限原發性高膽固醇血症、HoFH、植物脂醇血症）。</li>' +
          '<li>複方不得與 gemfibrozil 併用。</li></ul>' },
      { h: 'PCSK9 抑制劑（evolocumab、alirocumab）',
        html:
          '<ul><li>一年內重大心血管事件（MI、血管再通術、動脈硬化缺血性中風）。</li>' +
          '<li>已用高強度（如 rosuvastatin 20 mg、atorvastatin 40 mg 以上）或最大耐受 statin ≥3 個月，再合併 ezetimibe 10 mg ≥3 個月。</li>' +
          '<li>LDL-C 仍 &gt; 100 mg/dL。需事前審查，每次核准 12 個月。</li></ul>' },
      { h: '降三酸甘油酯藥物（本次未修訂）',
        html:
          '<ul><li>心血管疾病或糖尿病：TG ≥200 且（TC/HDL-C &gt;5 或 HDL-C &lt;40），可與非藥物治療並行。</li>' +
          '<li>無心血管疾病：TG ≥500 可並行；TG ≥200 且（TC/HDL-C &gt;5 或 HDL-C &lt;40）需先 3 至 6 個月非藥物治療。</li>' +
          '<li>目標 TG &lt;200（以 ≥500 條款給藥者 &lt;500）。gemfibrozil 避免與 statin 併用。</li></ul>' }
    ]
  },

  hbvrx: {
    title: 'B 型肝炎抗病毒藥物給付規定',
    code: '藥品給付規定 第 10 節 10.7.3',
    effective: '114 年 6 月 1 日（2025-06-01）',
    checked: '2026-11-04',
    change: '114 年 6 月 1 日修訂 tenofovir alafenamide（Vemlidy）相關條文；本工具的品項限制（部分 entecavir、TDF 列名品項）依此版。',
    source: null,
    sections: [
      { h: '共同條件',
        html:
          '<ul><li>HBsAg（＋）超過 6 個月（或 IgM anti-HBc 陰性）。</li>' +
          '<li>基層院所須有消化系內科專任專科醫師開立。</li>' +
          '<li>藥物：lamivudine、entecavir、telbivudine、tenofovir disoproxil（TDF）、tenofovir alafenamide（TAF）。</li></ul>' },
      { h: '代償不全與肝硬化',
        html:
          '<ul><li>代償不全（第 1 項）：總膽紅素 ≥2.0 mg/dL 或 PT 延長 ≥3 秒；entecavir 用 1.0 mg。</li>' +
          '<li>肝硬化（第 2(5) 項）：可檢驗到 HBV DNA，且符合切片 F4、Fibroscan ≥12 kPa、ARFI ≥1.98，或超音波肝硬化合併靜脈曲張、脾腫大、血小板 &lt;120,000/µL，或 CT／MRI 肝硬化；可長期使用。</li></ul>' },
      { h: 'HBeAg 陽性（第 3 項）',
        html:
          '<table><thead><tr><th>條款</th><th>ALT</th><th>HBV DNA</th><th>其他</th></tr></thead><tbody>' +
          '<tr><td>3(1)</td><td>≥ 5X ULN</td><td>不限</td><td></td></tr>' +
          '<tr><td>3(2)</td><td>2X 至 &lt;5X</td><td>≥ 20,000 IU/mL</td><td></td></tr>' +
          '<tr><td>3(3)</td><td>半年內兩次 &gt;ULN，間隔滿 3 個月</td><td>≥ 20,000 IU/mL</td><td>纖維化 ≥F3</td></tr>' +
          '</tbody></table>' +
          '<p>療程：治療至 e 抗原轉陰，再給付最多 12 個月。</p>' },
      { h: 'HBeAg 陰性（第 4 項）',
        html:
          '<table><thead><tr><th>條款</th><th>ALT</th><th>HBV DNA</th><th>品項</th></tr></thead><tbody>' +
          '<tr><td>4(1)</td><td>半年內兩次 ≥2X，間隔滿 3 個月</td><td>≥ 2,000 IU/mL</td><td>全部品項</td></tr>' +
          '<tr><td>4(1)</td><td>只有一次 ≥2X</td><td>≥ 2,000 IU/mL</td><td>限未列名 entecavir（如 Baraclude）、TAF</td></tr>' +
          '<tr><td>4(2)</td><td>半年內兩次 &gt;ULN，間隔滿 3 個月</td><td>≥ 20,000 IU/mL</td><td>≥F3 全部品項；F2 限未列名 entecavir、TAF</td></tr>' +
          '</tbody></table>' +
          '<p>療程：至少 2 年，HBV DNA 連續 3 次（間隔 6 個月）測不到可停藥，每次最多給付 36 個月。</p>' +
          '<p>品項受限時不可用：Fofnir、Hepwin、Sebivo、Ricovir、Hepuri、Virclean、Teno B、Tenof、Viread、Livepro、Lamidine、Hepar-Pro、Hepato-Ease、Barazer、Becavir。</p>' },
      { h: '纖維化門檻',
        html:
          '<table><thead><tr><th></th><th>Fibroscan</th><th>ARFI</th><th>FIB-4</th></tr></thead><tbody>' +
          '<tr><td>F2</td><td>≥ 8 kPa</td><td>≥ 1.5</td><td>≥ 2.1</td></tr>' +
          '<tr><td>F3</td><td>≥ 9.5 kPa</td><td>≥ 1.81</td><td>≥ 3.25</td></tr>' +
          '<tr><td>F4</td><td>≥ 12 kPa</td><td>≥ 1.98</td><td></td></tr>' +
          '</tbody></table>' },
      { h: '特殊族群',
        html:
          '<ul><li>懷孕（第 2(7) 項）：HBV DNA ≥2×10⁵ IU/mL，滿 27 週起可用 telbivudine、TDF 或 TAF，至產後 4 週。</li>' +
          '<li>肝癌根除性治療後（第 2(8) 項）：可檢驗到 HBV DNA，可長期使用至肝癌復發且無法再根除。</li>' +
          '<li>化療或免疫抑制（第 2(9) 項）：依藥物種類與 HBsAg／anti-HBc 狀態，本工具未逐條判定，請對照條文。</li></ul>' }
    ]
  }
};
