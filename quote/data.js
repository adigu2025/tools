/* 報價的價目資料：品項與價格（CATEGORIES）、內視鏡選單（ENDO_TREE）、備註、優惠金額、套組成分（PANEL_PARTS）。
   從 quote/app.js 拆出來（2026-11-18），改價格、新增檢驗只改這一份；改價格時同一份裡的 PANEL_PARTS 一起檢查，
   tests/quote.test.js 會檢查套組成分都指到存在的品項。
   包在 QUOTE_DATA 裡，不佔用全域名稱（工作台同一頁還有其他工具的程式）；app.js 開頭取出來用。
   要在 quote/app.js 之前載入（index.html、sw.js、tests/load.js）。 */
var QUOTE_DATA = (function(){
/* ═══════════════════════════════════════════════════════════════════
   NOTES LOOKUP (備註，僅 tooltip 與列印使用)
   ═══════════════════════════════════════════════════════════════════ */
const ITEM_NOTES = {
  hc_base:`血液常規（紅血球、白血球、血小板）\n飯前血糖、糖化血色素、胰島素阻抗\n肝功能 AST、ALT（附 FIB-4 肝纖維化指數）\n腎功能 BUN、肌酸酐，尿酸\n總膽固醇、三酸甘油酯、高密度及低密度膽固醇\n甲狀腺功能 TSH、free T4\n尿液一般檢查\n腹部超音波、甲狀腺超音波\nTANITA 身體組成分析`,
  hc_m1:`Lp(a) 脂蛋白(a)\nApoB 載脂蛋白 B\nhs-CRP 高敏感度 C 反應蛋白\nECG 12 導程心電圖`,
  hc_m3:`B 型肝炎表面抗原\nB 型肝炎表面抗體\nC 型肝炎抗體`,
  hc_m7f:`共同：CEA、AFP、CA199、SCC、Cyfra 21-1\nCA-724、Pro-GRP、β-HCG、EB-VCA-IgA\n女性：CA125、CA153`,
  hc_m7m:`共同：CEA、AFP、CA199、SCC、Cyfra 21-1\nCA-724、Pro-GRP、β-HCG、EB-VCA-IgA\n男性：PSA、free-PSA`,
  hc_m6:`屬於健檢項目，胃鏡、大腸鏡檢查與麻醉皆為自費，同一次完成\n含日本製造代餐與清腸藥物、標準胃鏡（經口）\n檢查中如需切片或瘜肉切除，處置費用可全額自費，或依實際情況申報健保`,
  lb01:`飯前血糖
肝功能 AST、ALT
腎功能 BUN、肌酸酐，尿酸
總膽固醇、三酸甘油酯、高密度及低密度膽固醇
尿液一般檢查`,
  lb02:`血液常規與白血球分類
飯前血糖、糖化血色素
肝功能 AST、ALT
腎功能 BUN、肌酸酐，尿酸
總膽固醇、三酸甘油酯、高密度及低密度膽固醇、膽固醇比值
尿液一般檢查`,
  lb03:`血液常規與白血球分類
飯前血糖、糖化血色素
肝功能 AST、ALT、總膽紅素、直接膽紅素、鹼性磷酸酶、γ-GT
白蛋白、球蛋白、總蛋白、澱粉酶
腎功能 BUN、肌酸酐，尿酸
總膽固醇、三酸甘油酯、高密度及低密度膽固醇、膽固醇比值
尿液一般檢查`,
  lb04:`血液常規與白血球分類
飯前血糖、糖化血色素
肝功能 AST、ALT
B 型肝炎表面抗原與抗體、C 型肝炎抗體
腎功能 BUN、肌酸酐，尿酸
總膽固醇、三酸甘油酯、高密度及低密度膽固醇、膽固醇比值
尿液一般檢查`,
  lb05:`B 型肝炎表面抗原
B 型肝炎表面抗體
C 型肝炎抗體`,
  lb06:`飯前血糖、糖化血色素、胰島素阻抗（HOMA-IR）
肝功能 AST、ALT
腎功能 BUN、肌酸酐，尿酸
總膽固醇、三酸甘油酯、高密度及低密度膽固醇
甲狀腺功能 TSH、free T4`,
  lb07:`飯前血糖、糖化血色素、胰島素阻抗（HOMA-IR）
腎功能 BUN、肌酸酐
尿液白蛋白與肌酸酐比值（UACR）`,
  lb08:`尿液白蛋白與肌酸酐比值（UACR）`,
  lb09:`血液常規與白血球分類
血清鐵、總鐵結合能力（TIBC）`,
  lb10:`飯前血糖
總膽固醇、三酸甘油酯、高密度及低密度膽固醇、膽固醇比值
高敏感度 C 反應蛋白（hs-CRP）、同半胱胺酸
心臟標記 NT-proBNP、肌酸激酶（CPK）`,
  lb11:`甲狀腺功能 T3、free T4、TSH`,
  lb12:`濾泡刺激素（FSH）、黃體成長激素（LH）、雌二醇（E2）
甲狀腺刺激素（TSH）、泌乳素、黃體素
披衣菌抗體 IgG`,
  lb13:`愛滋病毒抗原抗體
梅毒 RPR／VDRL、梅毒螺旋體抗體
淋病雙球菌 DNA、披衣菌 DNA
疱疹病毒 1 型、2 型抗體 IgG`,
  lb14:`白蛋白、鋅、鐵蛋白
皮質醇、維生素 D、同半胱胺酸
甲狀腺功能 TSH、free T4`,
  lb15:`CEA、AFP、CA125、CA153、CA199、SCC、Cyfra 21-1`,
  lb16:`CEA、AFP、CA125、CA153、CA199、SCC、Cyfra 21-1、CA-724、Pro-GRP、β-HCG、EB-VCA-IgA`,
  lb17:`CEA、AFP、CA199、PSA、SCC、Cyfra 21-1`,
  lb18:`CEA、AFP、CA199、PSA、SCC、Cyfra 21-1、CA-724、Pro-GRP、β-HCG、free-PSA、EB-VCA-IgA`,
  // ex1-ex5: 檢查項目無備註
};

/* ─ 一段式備註（hover 1.5秒顯示，不顯示於卡片） ─────────────────────── */
const ITEM_DESCS = {
  'en_gc_ins':  '健保同日只給付其中一項，另一項與相關處置、耗材以自費計價',
  'en_gc_self': '不使用健保、不留健保紀錄；檢查中的處置與耗材也以自費計價',
  'en_sp_gb':   '含拋棄式切片鉗，病理檢查費另計',
  'en_sp_gp':   '含拋棄式切除環，病理檢查費另計',
  'en_sp_cb':   '含拋棄式切片鉗，病理檢查費另計',
  'en_sp_cp1':   '含拋棄式切除環，病理檢查費另計',
  'en_sp_cp2':   '含拋棄式切除環，病理檢查費另計',
  'en_sp_cp3':   '含拋棄式切除環，病理檢查費另計',
  'lb_20007':   '報告時效 7 至 10 個工作天',
};

/* ═══════════════════════════════════════════════════════════════════
   DATA  —  健檢/檢驗/檢查 來自 Excel；內視鏡/點滴待補充
   ═══════════════════════════════════════════════════════════════════ */
const CATEGORIES = [
  {
    id: 'health-check', label: '健檢方案', desc: '個人化健康評估套組',
    items: [
      { id:'hc_s1', type:'section', name:'基礎套組' },
      { id:'hc_base', name:'基礎套組', desc:'血液常規、血糖代謝、肝腎功能、\n尿酸、血脂肪、甲狀腺功能、尿液、\n腹部超音波、甲狀腺超音波、TANITA', price:3000 },
      { id:'hc_s2', type:'section', name:'加選模組（每項都可單獨選擇）' },
      { id:'hc_m1', name:'① 心血管風險評估', desc:'Lp(a) 脂蛋白(a)、ApoB、hs-CRP、ECG 12 導程心電圖', price:1900 },
      { id:'hc_m2', name:'② 頸動脈超音波', desc:'頸部動脈血管超音波\n與 ① 合選折 NT$ 400', price:600 },
      { id:'hc_m3', name:'③ B、C 型肝炎篩檢', desc:'B 肝表面抗原與抗體、C 肝抗體', price:500 },
      { id:'hc_m4', name:'④ 幽門桿菌呼氣檢查', desc:'Hp 碳 13 尿素呼氣測試', price:1200 },
      { id:'hc_m5', name:'⑤ 糞便潛血檢查', desc:'免疫法（FIT）', price:400 },
      { id:'hc_m6', name:'⑥ 麻醉胃鏡＋大腸鏡', desc:'健檢項目，檢查與麻醉自費，含日本製代餐與標準胃鏡', price:10000 },
      { id:'hc_s3', type:'section', name:'⑦ 11 項腫瘤標記（男女項目不同，擇一）' },
      { id:'hc_m7f', name:'⑦ 11 項腫瘤標記（女）', desc:'共同 9 項＋CA125、CA153', price:4000 },
      { id:'hc_m7m', name:'⑦ 11 項腫瘤標記（男）', desc:'共同 9 項＋PSA、free-PSA', price:4000 },
      { id:'hc_s4', type:'section', name:'⑧ 院外檢查' },
      { id:'hc_m8', name:'⑧ 低劑量肺部電腦斷層', desc:'依榮總定價，檢查當日於榮總繳費', price:5490, extPay:'榮總' },
    ]
  },
  {
    id: 'lab', label: '檢驗', desc: '血液、尿液及特殊檢驗',
    items: [
      { id:'lb_s_c', type:'section', name:'檢驗套組' },
      { id:'lb01', name:'成人健檢', desc:'血糖、肝腎功能、尿酸、血脂、尿液\n代碼 H14＋UR', price:400 },
      { id:'lb02', name:'成人健檢（安心）', desc:'血液常規、血糖、糖化血色素、肝腎功能、血脂、尿液\n代碼 H07', price:600 },
      { id:'lb03', name:'成人健檢（代謝）', desc:'血液常規、血糖、完整肝功能、腎功能、血脂、尿液\n代碼 MAB', price:1000 },
      { id:'lb04', name:'成人健檢（護肝）', desc:'血液常規、血糖、肝腎功能、B 肝與 C 肝篩檢、血脂、尿液\n代碼 MAA', price:1200 },
      { id:'lb05', name:'病毒性肝炎', desc:'B 肝表面抗原與抗體、C 肝抗體\n代碼 H20', price:500 },
      { id:'lb06', name:'減重前評估', desc:'血糖、胰島素阻抗、肝腎功能、血脂、甲狀腺\n代碼 MAS', price:1200 },
      { id:'lb07', name:'糖尿病風險評估（含胰島素阻抗）', desc:'血糖、胰島素阻抗、腎功能、尿液白蛋白\n代碼 MAD', price:800 },
      { id:'lb08', name:'定量蛋白尿', desc:'尿液白蛋白與肌酸酐比值\n代碼 UAC', price:350 },
      { id:'lb09', name:'缺鐵性貧血', desc:'血液常規、血清鐵、總鐵結合能力\n代碼 H16', price:800 },
      { id:'lb10', name:'心血管健康', desc:'血糖、血脂、hs-CRP、同半胱胺酸、NT-proBNP\n代碼 MAC', price:2200 },
      { id:'lb11', name:'甲狀腺機能', desc:'T3、free T4、TSH\n代碼 15U', price:700 },
      { id:'lb12', name:'女性荷爾蒙', desc:'FSH、LH、E2、TSH、泌乳素、黃體素\n代碼 MAG', price:1500 },
      { id:'lb13', name:'婚前健檢', desc:'愛滋、梅毒、淋病、披衣菌、疱疹\n代碼 KKJ', price:3800 },
      { id:'lb14', name:'傷口癒合力指標', desc:'白蛋白、鋅、鐵蛋白、維生素 D 等\n代碼 MAK', price:1500 },
      { id:'lb15', name:'基礎腫瘤標記（女）', desc:'女性 7 項腫瘤標記', price:2500 },
      { id:'lb16', name:'完整腫瘤標記（女）', desc:'女性 11 項腫瘤標記', price:4000 },
      { id:'lb17', name:'基礎腫瘤標記（男）', desc:'男性 6 項腫瘤標記', price:2200 },
      { id:'lb18', name:'完整腫瘤標記（男）', desc:'男性 11 項腫瘤標記', price:4000 },
      { id:'lb_s0', type:'section', name:'一般生化檢查' },
      { id:'lb_01001', name:'AC Sugar 飯前血糖', price:70 },
      { id:'lb_01002', name:'PC Sugar 飯後血糖', price:70 },
      { id:'lb_01003', name:'TG 三酸甘油酯', price:120 },
      { id:'lb_01004', name:'TC 總膽固醇', price:100 },
      { id:'lb_01005', name:'HDL 高密度膽固醇', price:170 },
      { id:'lb_01006', name:'LDL 低密度膽固醇', price:170 },
      { id:'lb_01007', name:'Lp(a) 脂蛋白（a）', price:600 },
      { id:'lb_01029', name:'ApoB 載脂蛋白 B', price:600 },
      { id:'lb_01008', name:'BUN 血中尿素氮', price:70 },
      { id:'lb_01009', name:'UA 尿酸', price:70 },
      { id:'lb_01010', name:'Cr 肌酸酐', price:70 },
      { id:'lb_01011', name:'AST（GOT）麩草轉氨酶', price:70 },
      { id:'lb_01012', name:'ALT（GPT）麩丙轉氨酶', price:70 },
      { id:'lb_01013', name:'γ-GT 丙麩氨轉酶', price:100 },
      { id:'lb_01014', name:'ALP 鹼性磷酸酶', price:70 },
      { id:'lb_01015', name:'T-Bil 總膽紅素', price:70 },
      { id:'lb_01016', name:'D-Bil 直接膽紅素', price:70 },
      { id:'lb_01017', name:'Micro-Bil 新生兒黃疸', price:120 },
      { id:'lb_01018', name:'Albumin 白蛋白', price:70 },
      { id:'lb_01019', name:'Globulin 球蛋白', price:70 },
      { id:'lb_01020', name:'TP 總蛋白', price:70 },
      { id:'lb_ag', name:'A/G ratio 蛋白比值', price:0 },
      { id:'lb_01021', name:'Amylase 澱粉酶', price:150 },
      { id:'lb_01022', name:'Lipase 解脂酶', price:250 },
      { id:'lb_01023', name:'CPK 肌酸激酶', price:150 },
      { id:'lb_01024', name:'LDH 乳酸脫氫酶', price:150 },
      { id:'lb_01025', name:'CK-MB 肌酸激酶 MB 型', price:200 },
      { id:'lb_01026', name:'Cholinesterase 膽鹼酯酶', price:350 },
      { id:'lb_01027', name:'Ammonia 血氨', price:500 },
      { id:'lb_01028', name:'VMA 香草扁桃酸定量', price:500 },
      { id:'lb_s1', type:'section', name:'肝炎病毒檢查' },
      { id:'lb_02001', name:'HBcrAg＋qHBsAg B 型肝炎核心相關抗原＋表面抗原定量', price:2000 },
      { id:'lb_02002', name:'qHBsAg B 型肝炎表面抗原定量', price:500 },
      { id:'lb_02003', name:'HBV DNA B 型肝炎病毒量', price:2500 },
      { id:'lb_02004', name:'HCV RNA C 型肝炎病毒量', price:3000 },
      { id:'lb_02005', name:'HCV Genotype C 型肝炎基因分型', price:4000 },
      { id:'lb_02006', name:'HBsAg B 型肝炎表面抗原', price:200 },
      { id:'lb_02007', name:'Anti-HBs B 型肝炎表面抗體', price:300 },
      { id:'lb_02008', name:'HBeAg B 型肝炎 e 抗原', price:350 },
      { id:'lb_02009', name:'Anti-HBe B 型肝炎 e 抗體', price:350 },
      { id:'lb_02010', name:'Anti-HBc IgG B 型肝炎核心抗體 IgG', price:300 },
      { id:'lb_02011', name:'Anti-HBc IgM B 型肝炎核心抗體 IgM', price:500 },
      { id:'lb_02012', name:'Anti-HAV IgM A 型肝炎抗體 IgM', price:500 },
      { id:'lb_02013', name:'Anti-HAV（IgG＋IgM）A 型肝炎抗體', price:350 },
      { id:'lb_02014', name:'Anti-HCV C 型肝炎抗體', price:400 },
      { id:'lb_02015', name:'Anti-HDV Ab D 型肝炎抗體', price:800 },
      { id:'lb_s2', type:'section', name:'糖尿病檢查' },
      { id:'lb_03001', name:'HbA1c 糖化血色素', price:300 },
      { id:'lb_03002', name:'Insulin 胰島素', price:400 },
      { id:'lb_03003', name:'C-peptide C 胜肽', price:300 },
      { id:'lb_03004', name:'GA 糖化白蛋白', price:400 },
      { id:'lb_03005', name:'GAD Ab 麩胺酸脫羧酶抗體', price:1000 },
      { id:'lb_03006', name:'IA-2 Ab 胰島細胞抗原 2 抗體', price:2400 },
      { id:'lb_s3', type:'section', name:'甲狀腺檢查' },
      { id:'lb_04001', name:'T3 三碘甲狀腺素', price:250 },
      { id:'lb_04002', name:'T4 四碘甲狀腺素', price:250 },
      { id:'lb_04003', name:'TSH 甲狀腺刺激素', price:350 },
      { id:'lb_04004', name:'Free T4 游離四碘甲狀腺素', price:300 },
      { id:'lb_04005', name:'Free T3 游離三碘甲狀腺素', price:300 },
      { id:'lb_04006', name:'T3 Uptake 三碘甲狀腺素攝取率', price:500 },
      { id:'lb_04007', name:'Thyroglobulin 甲狀腺球蛋白', price:200 },
      { id:'lb_04008', name:'Anti-Tg 甲狀腺球蛋白抗體', price:400 },
      { id:'lb_04009', name:'TRAb 甲狀腺刺激素受體抗體', price:700 },
      { id:'lb_04010', name:'Anti-TPO 甲狀腺過氧化酶抗體', price:400 },
      { id:'lb_s4', type:'section', name:'副甲狀腺檢查' },
      { id:'lb_05001', name:'Intact-PTH 副甲狀腺素', price:800 },
      { id:'lb_05002', name:'Calcitonin 降鈣素', price:600 },
      { id:'lb_s5', type:'section', name:'腫瘤標記' },
      { id:'lb_06001', name:'NMP22 膀胱癌標記', price:1500 },
      { id:'lb_06002', name:'HE4 副睪蛋白 4', price:1600 },
      { id:'lb_06003', name:'CA-724 腫瘤標記', price:500 },
      { id:'lb_06004', name:'Pro-GRP 胃泌素釋放胜肽前體', price:1000 },
      { id:'lb_06005', name:'NSE 神經元特異烯醇酶', price:500 },
      { id:'lb_06006', name:'Cyfra 21-1 細胞角質蛋白片段', price:600 },
      { id:'lb_06007', name:'PIVKA-II 異常凝血酶原', price:1200 },
      { id:'lb_06008', name:'AFP 甲型胎兒蛋白', price:350 },
      { id:'lb_06009', name:'CEA 癌胚抗原', price:400 },
      { id:'lb_06010', name:'β-HCG 人類絨毛膜促性腺激素', price:400 },
      { id:'lb_06011', name:'β2-Microglobulin β2 微球蛋白', price:600 },
      { id:'lb_06012', name:'CA125 腫瘤標記', price:500 },
      { id:'lb_06013', name:'CA153 腫瘤標記', price:500 },
      { id:'lb_06014', name:'CA199 腫瘤標記', price:500 },
      { id:'lb_06015', name:'SCC 鱗狀上皮細胞癌抗原', price:500 },
      { id:'lb_06016', name:'EBV DNA 鼻咽癌標記', price:1200 },
      { id:'lb_06017', name:'EB-VCA-IgG 鼻咽癌標記', price:500 },
      { id:'lb_06018', name:'EB-VCA-IgM 鼻咽癌標記', price:500 },
      { id:'lb_06019', name:'EB-VCA-IgA 鼻咽癌標記', price:500 },
      { id:'lb_s6', type:'section', name:'攝護腺檢查' },
      { id:'lb_07001', name:'PSA 攝護腺特異抗原', price:500 },
      { id:'lb_07002', name:'Free PSA 游離攝護腺特異抗原', price:500 },
      { id:'lb_07003', name:'PHI 攝護腺健康指數\n（含 PSA、fPSA、p2PSA）', price:2500 },
      { id:'lb_s7', type:'section', name:'特殊檢查' },
      { id:'lb_08001', name:'UBT 幽門桿菌碳 13 尿素呼氣測試', price:1200 },
      { id:'lb_08002', name:'CTC 循環腫瘤細胞檢測', price:10000 },
      { id:'lb_08003', name:'SOD-RBC 紅血球超氧化物歧化酶', price:1400 },
      { id:'lb_s8', type:'section', name:'尿液、糞便、痰液檢查' },
      { id:'lb_09001', name:'Urine Routine 尿液一般檢查', price:100 },
      { id:'lb_09002', name:'Urine Chemistry 尿液生化檢查', price:100 },
      { id:'lb_09003', name:'Urine Protein 尿蛋白定量', price:70 },
      { id:'lb_09004', name:'Microalbumin 尿液微量白蛋白', price:300 },
      { id:'lb_09005', name:'Urine Creatinine 尿液肌酸酐', price:70 },
      { id:'lb_09006', name:'Pregnancy Test 驗孕', price:100 },
      { id:'lb_09007', name:'Amoeba 阿米巴檢查', price:400 },
      { id:'lb_09008', name:'Stool Routine 糞便一般檢查', price:100 },
      { id:'lb_09009', name:'HpSA 幽門桿菌糞便抗原', price:500 },
      { id:'lb_09010', name:'iFOBT 糞便潛血免疫分析', price:400 },
      { id:'lb_09011', name:'Perianal Swab 蟯蟲膠片', price:50 },
      { id:'lb_09012', name:'Sputum Routine 痰液一般檢查', price:300 },
      { id:'lb_09013', name:'Gut Microbiome 腸道菌分析', price:8000 },
      { id:'lb_s9', type:'section', name:'一般血液檢查' },
      { id:'lb_10001', name:'CBC 全套血液檢查（8 項）', price:250 },
      { id:'lb_10002', name:'D/C 白血球分類計數', price:250 },
      { id:'lb_10003', name:'PT 凝血酶原時間', price:200 },
      { id:'lb_10004', name:'APTT 部分凝血活酶時間', price:300 },
      { id:'lb_10005', name:'Blood Type 血型', price:50 },
      { id:'lb_10006', name:'Rh 因子', price:100 },
      { id:'lb_10007', name:'Crossmatch 交叉配血試驗', price:500 },
      { id:'lb_10008', name:'ESR 紅血球沉降速率', price:100 },
      { id:'lb_10009', name:'G6PD 蠶豆症篩檢', price:400 },
      { id:'lb_s10', type:'section', name:'貧血檢查' },
      { id:'lb_11001', name:'Fe 血清鐵', price:100 },
      { id:'lb_11002', name:'TIBC 總鐵結合能力', price:300 },
      { id:'lb_11003', name:'Vitamin B12 維生素 B12', price:500 },
      { id:'lb_11004', name:'Folate 葉酸', price:500 },
      { id:'lb_11005', name:'Transferrin 運鐵蛋白', price:400 },
      { id:'lb_11006', name:'Ferritin 鐵蛋白', price:400 },
      { id:'lb_11007', name:'Hb-EP 血紅素電泳', price:500 },
      { id:'lb_s11', type:'section', name:'電解質、重金屬檢查' },
      { id:'lb_12001', name:'Na 鈉', price:70 },
      { id:'lb_12002', name:'K 鉀', price:70 },
      { id:'lb_12003', name:'Cl 氯', price:70 },
      { id:'lb_12004', name:'Ca 鈣', price:70 },
      { id:'lb_12005', name:'P 磷', price:70 },
      { id:'lb_12006', name:'Mg 鎂', price:70 },
      { id:'lb_12007', name:'Li 鋰', price:300 },
      { id:'lb_12008', name:'Pb 鉛', price:600 },
      { id:'lb_12009', name:'Hg 汞', price:800 },
      { id:'lb_12010', name:'Al 鋁', price:600 },
      { id:'lb_12011', name:'Zn 鋅', price:700 },
      { id:'lb_12012', name:'Se 硒', price:1000 },
      { id:'lb_12013', name:'Cu 銅', price:500 },
      { id:'lb_12014', name:'As 砷', price:800 },
      { id:'lb_s12', type:'section', name:'心臟檢查' },
      { id:'lb_13001', name:'D-Dimer 纖維蛋白降解產物', price:750 },
      { id:'lb_13002', name:'Troponin-I 心肌旋轉蛋白 I', price:800 },
      { id:'lb_13003', name:'hs-CRP 高敏感度 C 反應蛋白', price:360 },
      { id:'lb_13004', name:'Homocysteine 同半胱胺酸', price:800 },
      { id:'lb_13005', name:'NT-proBNP 心臟衰竭標記', price:1200 },
      { id:'lb_s13', type:'section', name:'血清免疫學檢查' },
      { id:'lb_14001', name:'RA 類風濕因子（比濁法）', price:300 },
      { id:'lb_14002', name:'CRP C 反應蛋白（比濁法）', price:300 },
      { id:'lb_14003', name:'Hp Ab 幽門桿菌抗體', price:500 },
      { id:'lb_14004', name:'HpSA 幽門桿菌糞便抗原', price:500 },
      { id:'lb_14005', name:'ASLO 抗鏈球菌溶血素 O', price:250 },
      { id:'lb_14006', name:'IgG 免疫球蛋白 G', price:300 },
      { id:'lb_14007', name:'IgA 免疫球蛋白 A', price:300 },
      { id:'lb_14008', name:'IgM 免疫球蛋白 M', price:300 },
      { id:'lb_14009', name:'IgD 免疫球蛋白 D', price:300 },
      { id:'lb_14010', name:'IgE 免疫球蛋白 E', price:400 },
      { id:'lb_14011', name:'C3 補體 C3', price:300 },
      { id:'lb_14012', name:'C4 補體 C4', price:300 },
      { id:'lb_14013', name:'Rubella IgG 德國麻疹抗體 IgG', price:300 },
      { id:'lb_14014', name:'Rubella IgM 德國麻疹抗體 IgM', price:600 },
      { id:'lb_s14', type:'section', name:'自體免疫檢查' },
      { id:'lb_15001', name:'ANA 抗細胞核抗體', price:500 },
      { id:'lb_15002', name:'Anti-dsDNA 抗雙股 DNA 抗體', price:400 },
      { id:'lb_15003', name:'Anti-CCP 抗環瓜胺酸抗體', price:1200 },
      { id:'lb_15004', name:'Anti-ENA 抗可萃取核抗原抗體', price:2000 },
      { id:'lb_15005', name:'CTD Screen 結締組織疾病篩檢', price:450 },
      { id:'lb_15006', name:'ANCA 抗嗜中性球細胞質抗體', price:800 },
      { id:'lb_15007', name:'AChR Ab 乙醯膽鹼受體抗體', price:1800 },
      { id:'lb_15008', name:'ASMA 抗平滑肌抗體', price:400 },
      { id:'lb_15009', name:'AMA 抗粒線體抗體', price:500 },
      { id:'lb_15010', name:'Anti-Cardiolipin IgG 抗心脂抗體 IgG', price:900 },
      { id:'lb_15011', name:'Anti-Cardiolipin IgM 抗心脂抗體 IgM', price:800 },
      { id:'lb_15012', name:'Anti-β2-GPI IgG 抗 β2 醣蛋白 I 抗體 IgG', price:700 },
      { id:'lb_15013', name:'Anti-β2-GPI IgM 抗 β2 醣蛋白 I 抗體 IgM', price:1400 },
      { id:'lb_15014', name:'Lupus Anticoagulant 狼瘡抗凝血因子', price:2000 },
      { id:'lb_15015', name:'tTG-IgA 乳糜瀉抗體', price:3000 },
      { id:'lb_s15', type:'section', name:'傳染病檢查' },
      { id:'lb_16001', name:'Mycoplasma IgG 黴漿菌抗體 IgG', price:360 },
      { id:'lb_16002', name:'Mycoplasma IgM 黴漿菌抗體 IgM', price:400 },
      { id:'lb_16003', name:'CMV IgG 巨細胞病毒抗體 IgG', price:1000 },
      { id:'lb_16004', name:'CMV IgM 巨細胞病毒抗體 IgM', price:600 },
      { id:'lb_16005', name:'Measles IgG 麻疹抗體 IgG', price:360 },
      { id:'lb_16006', name:'Measles IgM 麻疹抗體 IgM', price:1200 },
      { id:'lb_16007', name:'Mumps IgG 腮腺炎抗體 IgG', price:500 },
      { id:'lb_16008', name:'Mumps IgM 腮腺炎抗體 IgM', price:1200 },
      { id:'lb_16009', name:'VZV IgG 水痘抗體 IgG', price:1000 },
      { id:'lb_16010', name:'VZV IgM 水痘抗體 IgM', price:1000 },
      { id:'lb_16011', name:'Toxoplasma IgG 弓漿蟲抗體 IgG', price:800 },
      { id:'lb_16012', name:'Toxoplasma IgM 弓漿蟲抗體 IgM', price:800 },
      { id:'lb_16013', name:'Widal & Weil-Felix 傷寒與斑疹傷寒凝集試驗', price:300 },
      { id:'lb_16014', name:'Rotavirus Ag 輪狀病毒抗原', price:600 },
      { id:'lb_s16', type:'section', name:'生殖功能荷爾蒙' },
      { id:'lb_17001', name:'AMH 抗穆勒氏管荷爾蒙', price:1000 },
      { id:'lb_17002', name:'SHBG 性荷爾蒙結合球蛋白', price:1200 },
      { id:'lb_17003', name:'P4 黃體素', price:350 },
      { id:'lb_17004', name:'GH 生長激素', price:500 },
      { id:'lb_17005', name:'Cortisol 皮質醇（上午 8 點）', price:400 },
      { id:'lb_17006', name:'Cortisol 皮質醇（下午 4 點）', price:400 },
      { id:'lb_17007', name:'Aldosterone 醛固酮', price:800 },
      { id:'lb_17008', name:'PRL 泌乳素', price:350 },
      { id:'lb_17009', name:'Testosterone 睪固酮', price:300 },
      { id:'lb_17010', name:'FSH 濾泡刺激素', price:350 },
      { id:'lb_17011', name:'LH 黃體生成素', price:350 },
      { id:'lb_17012', name:'E2 雌二醇', price:350 },
      { id:'lb_17013', name:'β-HCG 人類絨毛膜促性腺激素', price:400 },
      { id:'lb_17014', name:'IGF-1 類胰島素生長因子', price:1000 },
      { id:'lb_17015', name:'DHEA-S 硫酸脫氫表雄固酮', price:500 },
      { id:'lb_17016', name:'ACTH 促腎上腺皮質素', price:1200 },
      { id:'lb_17017', name:'PRA 血漿腎素活性', price:1000 },
      { id:'lb_17018', name:'5-HIAA 5-氫氧靛基醋酸', price:1500 },
      { id:'lb_17019', name:'Catecholamine 兒茶酚胺', price:2000 },
      { id:'lb_s17', type:'section', name:'過敏原檢查' },
      { id:'lb_18001', name:'IgE 免疫球蛋白 E', price:400 },
      { id:'lb_18002', name:'Phadiatop 吸入性過敏原篩檢', price:600 },
      { id:'lb_18003', name:'40 項過敏原（吸入＋食入）', price:2500 },
      { id:'lb_18004', name:'66 項過敏原（吸入＋食入）', price:3600 },
      { id:'lb_18005', name:'101 項過敏原（食入）', price:8000 },
      { id:'lb_18006', name:'110 項過敏原（急性＋慢性）', price:4800 },
      { id:'lb_18007', name:'224 項過敏原（急性＋慢性）', price:12000 },
      { id:'lb_s18', type:'section', name:'藥物、毒物檢查' },
      { id:'lb_19001', name:'Carbamazepine 血中濃度（Tegretol）', price:400 },
      { id:'lb_19002', name:'Phenytoin 血中濃度（Dilantin）', price:400 },
      { id:'lb_19003', name:'Theophylline 血中濃度', price:400 },
      { id:'lb_19004', name:'Valproic Acid 血中濃度（Depakene）', price:400 },
      { id:'lb_19005', name:'Digoxin 血中濃度', price:400 },
      { id:'lb_19006', name:'Phenobarbital 血中濃度（Luminal）', price:400 },
      { id:'lb_19007', name:'Morphine 嗎啡', price:400 },
      { id:'lb_19008', name:'Amphetamine 安非他命', price:400 },
      { id:'lb_19009', name:'Heroin 海洛因', price:400 },
      { id:'lb_19010', name:'MDMA 搖頭丸', price:1000 },
      { id:'lb_19011', name:'Ketamine K 他命', price:1000 },
      { id:'lb_s19', type:'section', name:'基因檢測' },
      { id:'lb_20001', name:'APOE 阿茲海默症風險基因', price:2000 },
      { id:'lb_20002', name:'5-HTT 血清素轉運體基因', price:3000 },
      { id:'lb_20003', name:'HLA-B*5801 抗痛風藥物過敏基因', price:3500 },
      { id:'lb_20004', name:'HLA-B*1502 抗癲癇藥物過敏基因', price:4000 },
      { id:'lb_20005', name:'HLA-B27 僵直性脊椎炎基因', price:2000 },
      { id:'lb_20006', name:'Obesity Gene 肥胖基因檢測', price:5500 },
      { id:'lb_20007', name:'ACTN3 運動基因', price:1500 },
      { id:'lb_s20', type:'section', name:'性病檢查' },
      { id:'lb_21001', name:'VDRL（RPR）梅毒篩檢', price:100 },
      { id:'lb_21002', name:'TPHA 梅毒螺旋體抗體', price:300 },
      { id:'lb_21003', name:'HIV Ag/Ab 愛滋病毒抗原抗體', price:400 },
      { id:'lb_21004', name:'FTA-ABS IgM 梅毒螢光抗體', price:1000 },
      { id:'lb_21005', name:'Chlamydia IgG 披衣菌抗體 IgG', price:600 },
      { id:'lb_21006', name:'Chlamydia IgM 披衣菌抗體 IgM', price:600 },
      { id:'lb_21007', name:'Chlamydia IgA 披衣菌抗體 IgA', price:600 },
      { id:'lb_21008', name:'HSV-1 IgG 疱疹病毒 1 型抗體 IgG', price:300 },
      { id:'lb_21009', name:'HSV-2 IgG 疱疹病毒 2 型抗體 IgG', price:300 },
      { id:'lb_21010', name:'HSV-1 IgM 疱疹病毒 1 型抗體 IgM', price:700 },
      { id:'lb_21011', name:'HSV-2 IgM 疱疹病毒 2 型抗體 IgM', price:700 },
      { id:'lb_21012', name:'HSV-1/2 DNA 疱疹病毒 DNA', price:2000 },
      { id:'lb_21013', name:'Chlamydia DNA 披衣菌 DNA', price:1200 },
      { id:'lb_21014', name:'Trichomonas DNA 滴蟲 DNA', price:1200 },
      { id:'lb_21015', name:'N. gonorrhoeae DNA 淋病雙球菌 DNA', price:1200 },
      { id:'lb_21016', name:'HPV DNA 人類乳突病毒 DNA', price:1500 },
      { id:'lb_21017', name:'HPV 人類乳突病毒檢測', price:1400 },
      { id:'lb_s21', type:'section', name:'婦產科' },
      { id:'lb_22001', name:'九合一 DNA（優奈）', price:3500 },
      { id:'lb_22002', name:'GBS B 群鏈球菌檢測', price:500 },
      { id:'lb_22003', name:'唐氏症二指標（附表）', price:800 },
      { id:'lb_22004', name:'第二孕期唐氏症四指標（附表）', price:2200 },
      { id:'lb_s22', type:'section', name:'精液檢查' },
      { id:'lb_23001', name:'Semen Analysis 精液分析', price:400 },
      { id:'lb_23002', name:'Sperm Quality 精子品質分析', price:1500 },
      { id:'lb_23003', name:'Sperm DNA Fragmentation 精子 DNA 碎片檢測', price:6000 },
      { id:'lb_s23', type:'section', name:'細菌培養' },
      { id:'lb_24001', name:'Blood Culture 血液培養（需氧）', price:500 },
      { id:'lb_24002', name:'Blood Culture 血液培養（厭氧）', price:500 },
      { id:'lb_24003', name:'Urine Culture 尿液培養', price:360 },
      { id:'lb_24004', name:'Stool Culture 糞便培養', price:500 },
      { id:'lb_24005', name:'Salmonella/Shigella 沙門氏菌與志賀氏菌培養', price:500 },
      { id:'lb_24006', name:'Wound/Pus Culture 傷口膿液培養（需氧）', price:360 },
      { id:'lb_24007', name:'Wound/Pus Culture 傷口膿液培養（厭氧）', price:360 },
      { id:'lb_24008', name:'Water Culture 水質培養', price:500 },
      { id:'lb_24009', name:'Sputum Culture 痰液培養', price:500 },
      { id:'lb_24010', name:'Gram Stain 革蘭氏染色', price:100 },
      { id:'lb_24011', name:'Acid-Fast Stain 抗酸菌染色', price:250 },
      { id:'lb_24012', name:'TB Culture 結核菌培養', price:600 },
      { id:'lb_s24', type:'section', name:'骨質疏鬆症' },
      { id:'lb_25001', name:'Synovial Fluid 關節液分析', price:200 },
      { id:'lb_25002', name:'BAP 骨特異性鹼性磷酸酶', price:600 },
      { id:'lb_25003', name:'Vitamin D 維生素 D', price:800 },
      { id:'lb_25004', name:'P1NP 骨生成指標', price:1200 },
      { id:'lb_25005', name:'β-CTx 骨吸收指標', price:1000 },
      { id:'lb_s25', type:'section', name:'病理、細胞學' },
      { id:'lb_26001', name:'體液細胞檢查', price:600 },
      { id:'lb_26002', name:'穿刺細胞檢查', price:700 },
      { id:'lb_26003', name:'薄片細胞學檢查', price:1200 },
      { id:'lb_26004', name:'第一級外科病理', price:400 },
      { id:'lb_26005', name:'第二級外科病理', price:800 },
      { id:'lb_26006', name:'第三級外科病理', price:1000 },
      { id:'lb_26007', name:'第四級外科病理', price:1800 },
      { id:'lb_26008', name:'第五級外科病理', price:2600 },
    
    ]
  },
  {
    id: 'exam', label: '檢查與點滴', desc: '超音波、導引穿刺、心電圖與點滴',
    items: [
      { id:'ex_su', type:'section', name:'超音波' },
      { id:'ex1', name:'全腹部超音波', desc:'檢查肝、膽、胰、脾、腎', price:800 },
      { id:'ex2', name:'甲狀腺超音波', desc:'檢查甲狀腺與周邊組織', price:600 },
      { id:'ex3', name:'頸動脈超音波', desc:'頸部動脈血管超音波', price:600 },
      { id:'ex_sg', type:'section', name:'超音波導引' },
      { id:'ex_g4', name:'超音波導引關節穿刺', desc:'含超音波導引、關節穿刺與關節液分析', price:2050 },
      { id:'ex_g5', name:'超音波導引肋膜穿刺', desc:'含超音波導引、肋膜穿刺與肋膜液分析', price:2650 },
      { id:'ex_g6', name:'超音波導引腹腔穿刺', desc:'含超音波導引、腹腔穿刺與腹水分析', price:2400 },
      { id:'ex_g7', name:'超音波導引甲狀腺穿刺', desc:'含超音波導引、甲狀腺細針穿刺與薄片細胞學檢查', price:3300 },
      { id:'ex_so', type:'section', name:'其他檢查' },
      { id:'ex4', name:'ECG 12 導程心電圖', desc:'12 導程靜態心電圖', price:300 },
      { id:'ex5', name:'TANITA 身體組成分析', desc:'體脂肪、肌肉量與水分分布', price:500 },
      { id:'ex_sd', type:'section', name:'點滴' },
      { id:'dr1', name:'術後全效\n組織修復', desc:'維生素 C＋甘草酸配方\n生理食鹽水 250 mL，加維生素 C、美久奧林（甲硫胺酸、維生素 B 群、牛磺酸）、麩醯胺酸、甘草酸製劑', price:2000 },
      { id:'dr2', name:'晨曦抗氧\n護肝修護', desc:'維生素 C＋硫辛酸配方\n生理食鹽水 250 mL，加維生素 C、硫辛酸、麩醯胺酸、甘草酸製劑、美久奧林', price:1800 },
      { id:'dr3', name:'循環代謝\n全效配方', desc:'維生素 C＋銀杏配方\n生理食鹽水 250 mL，加維生素 C、硫辛酸、美久奧林、銀杏萃取', price:600 },
      { id:'dr4', name:'元素原力。\n全效修復', desc:'維生素 B12＋鋅配方\n生理食鹽水 250 mL，加維生素 B12、硫酸鋅、麩醯胺酸、止血明（Tranexamic acid）', price:2000 },
      { id:'dr5', name:'微量元素\n體力補充', desc:'胺基酸＋維生素 B12 配方\n胺基酸輸液 250 mL，加維生素 B12、硫酸鋅、腸胃解痙劑（Buscopan）', price:800 },
      { id:'dr6', name:'賦活原生。\n組織修復點滴', desc:'胺基酸＋硫辛酸配方\n胺基酸輸液 250 mL，加維生素 C、硫辛酸、硫酸鋅', price:1000 },
    
    ]
  },
  {
    id: 'endo', label: '內視鏡', desc: '胃腸道內視鏡診療',
    items: [
    ]
  },
];

/* ═══════════════════════════════════════════════════════════════════
   ENDO TREE  —  三層式內視鏡選單
   ═══════════════════════════════════════════════════════════════════ */
const ENDO_TREE = {
  layer1: [
    { id:'en_gastro',   name:'胃鏡',                      basePrice:1600,
      layer2:[
        {id:'en_g_s',  name:'標準胃鏡（直徑約 0.9 cm）經口', desc:'含拋棄式咬口器',                                 addPrice:100},
        {id:'en_g_to', name:'極細胃鏡（直徑約 0.5 cm）經口', desc:'含拋棄式咬口器',                                 addPrice:700},
        {id:'en_g_tn', name:'極細胃鏡（直徑約 0.5 cm）經鼻', desc:'經鼻插入，不需咬口器',                                       addPrice:600},
        {id:'en_g_hp', name:'加驗幽門桿菌',               desc:'Hp 快速尿素測試 NT$ 300＋拋棄式切片鉗 NT$ 1,000',    addPrice:1300}
      ],
      layer3:[{id:'en_g_w',name:'清醒',addPrice:0},{id:'en_g_l',name:'輕中度鎮靜',addPrice:2000},{id:'en_g_a',name:'麻醉',addPrice:4000}]
    },
    { id:'en_colon',    name:'大腸鏡',                     basePrice:2500,
      layer2:[
        {id:'en_c_j',  name:'日本製造代餐與清腸藥物', desc:'含拋棄式檢查褲與大腸鏡二氧化碳充氣', addPrice:1500},
        {id:'en_c_t',  name:'台灣製造代餐與清腸藥物', desc:'含拋棄式檢查褲與大腸鏡二氧化碳充氣', addPrice:1200}
      ],
      layer3:[{id:'en_c_w',name:'清醒',addPrice:0},{id:'en_c_l',name:'輕中度鎮靜',addPrice:2500},{id:'en_c_a',name:'麻醉',addPrice:4000}]
    },
    { id:'en_gc_ins',   name:'胃鏡＋大腸鏡（部分健保）',   desc:'健保同日只給付其中一項，另一項與相關處置、耗材以自費計價', basePrice:1600,
      layer2:[
        {id:'en_gi_s',  name:'標準胃鏡（直徑約 0.9 cm）經口', desc:'含拋棄式咬口器',                              addPrice:100},
        {id:'en_gi_to', name:'極細胃鏡（直徑約 0.5 cm）經口', desc:'含拋棄式咬口器',                              addPrice:700},
        {id:'en_gi_tn', name:'極細胃鏡（直徑約 0.5 cm）經鼻', desc:'經鼻插入，不需咬口器',                                    addPrice:600},
        {id:'en_gi_hp', name:'加驗幽門桿菌',               desc:'Hp 快速尿素測試 NT$ 300＋拋棄式切片鉗 NT$ 1,000',    addPrice:1300},
        {id:'en_gi_j',  name:'日本製造代餐與清腸藥物', desc:'含拋棄式檢查褲與大腸鏡二氧化碳充氣', addPrice:1500},
        {id:'en_gi_t',  name:'台灣製造代餐與清腸藥物', desc:'含拋棄式檢查褲與大腸鏡二氧化碳充氣', addPrice:1200}
      ],
      layer3:[{id:'en_gi_w',name:'清醒',addPrice:0},{id:'en_gi_l',name:'輕中度鎮靜',addPrice:4500},{id:'en_gi_a',name:'麻醉',addPrice:6500}]
    },
    { id:'en_gc_self',  name:'胃鏡＋大腸鏡（完全自費）',   desc:'不使用健保、不留健保紀錄；檢查中的處置與耗材也以自費計價', basePrice:4100,
      layer2:[
        {id:'en_gs_s',  name:'標準胃鏡（直徑約 0.9 cm）經口', desc:'含拋棄式咬口器',                              addPrice:100},
        {id:'en_gs_to', name:'極細胃鏡（直徑約 0.5 cm）經口', desc:'含拋棄式咬口器',                              addPrice:700},
        {id:'en_gs_tn', name:'極細胃鏡（直徑約 0.5 cm）經鼻', desc:'經鼻插入，不需咬口器',                                    addPrice:600},
        {id:'en_gs_hp', name:'加驗幽門桿菌',               desc:'Hp 快速尿素測試 NT$ 300＋拋棄式切片鉗 NT$ 1,000',    addPrice:1300},
        {id:'en_gs_j',  name:'日本製造代餐與清腸藥物', desc:'含拋棄式檢查褲與大腸鏡二氧化碳充氣', addPrice:1500},
        {id:'en_gs_t',  name:'台灣製造代餐與清腸藥物', desc:'含拋棄式檢查褲與大腸鏡二氧化碳充氣', addPrice:1200}
      ],
      layer3:[{id:'en_gs_w',name:'清醒',addPrice:0},{id:'en_gs_l',name:'輕中度鎮靜',addPrice:4500},{id:'en_gs_a',name:'麻醉',addPrice:6500}]
    }
  ],
  special:[
    {id:'en_capsule', name:'膠囊內視鏡',                   desc:'含台灣製造代餐與清腸藥物',       price:56000},
    {id:'en_arbl',    name:'ARBL 抗逆流結紮術',  desc:'需同時選擇胃鏡＋鎮靜或麻醉',    price:16000},
    {id:'en_het',     name:'HET 微創痔瘡冷凝刀',           desc:'需同時選擇大腸鏡＋鎮靜或麻醉',  price:35500}
  ],
  selfPay:[
    {id:'en_sp_g',    name:'胃鏡（自費）',                        desc:'',                                          price:1600},
    {id:'en_sp_ghp',  name:'胃鏡＋Hp 檢測',             desc:'Hp 快速尿素測試＋拋棄式切片鉗',               price:2900},
    {id:'en_sp_gb',   name:'胃鏡＋切片',                   desc:'含拋棄式切片鉗，病理檢查費另計',           price:2600},
    {id:'en_sp_gp',   name:'胃鏡＋瘜肉切除術',             desc:'含拋棄式切除環，病理檢查費另計',           price:7000},
    {id:'en_sp_c',    name:'大腸鏡（自費）',                        desc:'',                                          price:2500},
    {id:'en_sp_cb',   name:'大腸鏡＋切片',                   desc:'含拋棄式切片鉗，病理檢查費另計',           price:3500},
    {id:'en_sp_cp1',  name:'大腸鏡＋瘜肉切除術（1 至 3 個）',      desc:'含拋棄式切除環，病理檢查費另計',           price:5000},
    {id:'en_sp_cp2',  name:'大腸鏡＋瘜肉切除術（4 至 9 個）',      desc:'含拋棄式切除環，病理檢查費另計',           price:6000},
    {id:'en_sp_cp3',  name:'大腸鏡＋瘜肉切除術（10 個以上）',      desc:'含拋棄式切除環，病理檢查費另計',           price:8500},
    /* 耗材：視臨床需要使用，以件數計價（qty:true） */
    {id:'en_sp_path',    name:'病理檢查費',        desc:'每一項檢體',              price:2000, qty:true},
    {id:'en_sp_forceps', name:'切片鉗',            desc:'拋棄式，每支',            price:1000, qty:true},
    {id:'en_sp_snare',   name:'切除環',            desc:'拋棄式，每個',            price:1000, qty:true},
    {id:'en_sp_clip',    name:'止血夾',            desc:'每支',                    price:1000, qty:true},
    {id:'en_sp_needle',  name:'注射針＋止血藥物', desc:'每組',                    price:1500, qty:true},
  ]
};


/* ═══════════════════════════════════════════════════════════════════
   折扣金額設定區 ★ 要啟用某項優惠，把金額從 0 改成實際折扣即可
   金額為 0 的規則不會顯示（renderCart 只收 discount > 0）。
   ═══════════════════════════════════════════════════════════════════ */
const DISCOUNT_AMOUNTS = {
  'disc-endo-1':   0,   // 舒眠胃鏡＋舒眠大腸鏡同日
  'disc-endo-2':   0,   // 一般（清醒）胃鏡＋大腸鏡同日
  'disc-hp':       0,   // 胃鏡加做幽門桿菌快速檢測
  'disc-drip-2':   0,   // 點滴任選 2 項以上
  'disc-drip-3':   0,   // 點滴任選 3 項以上
  'disc-us-2':   200,   // 超音波任選 2 項
  'disc-us-3':   400,   // 超音波 3 項
  'disc-hc-cv':  400,   // 健檢 ① 心血管評估＋② 頸動脈超音波合選
};

/* ─ 成分代號 → 可單獨加選的品項 id ─────────────────────────────────
   只收錄在「檢驗／檢查」分類中真的能單選的品項。
   找不到對應單選品項者一律不納入（目前只有 TC/HDL 比值、HOMA-IR 本身），寧可少提醒也不誤報。 */
const P = {
  acSugar:'lb_01001', hba1c:'lb_03001', insulin:'lb_03002',   /* HOMA-IR 需測胰島素 */
  ast:'lb_01011', alt:'lb_01012', bun:'lb_01008', cr:'lb_01010', ua:'lb_01009',
  tc:'lb_01004', tg:'lb_01003', hdl:'lb_01005', ldl:'lb_01006', lpa:'lb_01007',
  tbil:'lb_01015', dbil:'lb_01016', alkp:'lb_01014', rgt:'lb_01013',
  alb:'lb_01018', glob:'lb_01019', tp:'lb_01020', amylase:'lb_01021', cpk:'lb_01023',
  tsh:'lb_04003', ft4:'lb_04004', t3:'lb_04001',
  urine:'lb_09001', microalb:'lb_09004', ucr:'lb_09005',
  cbc:'lb_10001', dc:'lb_10002', fe:'lb_11001', tibc:'lb_11002', ferritin:'lb_11006',
  hbsag:'lb_02006', hbsab:'lb_02007', hcv:'lb_02014',
  hscrp:'lb_13003', apob:'lb_01029', homocys:'lb_13004', probnp:'lb_13005',
  fsh:'lb_17010', lh:'lb_17011', e2:'lb_17012', cortisol:'lb_17005', p4:'lb_17003', prl:'lb_17008',
  zn:'lb_12011', vitd:'lb_25003',
  hiv:'lb_21003', gono:'lb_21015', vdrl:'lb_21001', tpha:'lb_21002',
  hsv1:'lb_21008', hsv2:'lb_21009', chlaIgG:'lb_21005', chlaDNA:'lb_21013',
  cea:'lb_06009', afp:'lb_06008', ca125:'lb_06012', ca153:'lb_06013',
  ca199:'lb_06014', scc:'lb_06015', cyfra:'lb_06006', ca724:'lb_06003',
  progrp:'lb_06004', bhcg:'lb_06010', vcaIgA:'lb_06019',
  psa:'lb_07001', fpsa:'lb_07002'
};

/* ─ 套組／方案 → 成分（展開後才能跨套組比對重複）─────────────────── */
const PANEL_PARTS = {
  /* 檢驗套組 */
  lb01:[P.acSugar,P.ast,P.alt,P.bun,P.cr,P.ua,P.tc,P.tg,P.hdl,P.ldl,P.urine],
  lb02:[P.cbc,P.dc,P.acSugar,P.hba1c,P.ast,P.alt,P.bun,P.cr,P.ua,P.tc,P.tg,P.hdl,P.ldl,P.urine],
  lb03:[P.cbc,P.dc,P.acSugar,P.hba1c,P.ast,P.alt,P.tbil,P.dbil,P.alkp,P.rgt,P.alb,P.glob,P.tp,P.amylase,
        P.bun,P.cr,P.ua,P.tc,P.tg,P.hdl,P.ldl,P.urine],
  lb04:[P.cbc,P.dc,P.acSugar,P.hba1c,P.ast,P.alt,P.hbsag,P.hbsab,P.hcv,
        P.bun,P.cr,P.ua,P.tc,P.tg,P.hdl,P.ldl,P.urine],
  lb05:[P.hbsag,P.hbsab,P.hcv],
  lb06:[P.acSugar,P.hba1c,P.insulin,P.ast,P.alt,P.bun,P.cr,P.ua,
        P.tc,P.tg,P.hdl,P.ldl,P.tsh,P.ft4],
  lb07:[P.acSugar,P.hba1c,P.insulin,P.bun,P.cr,P.microalb,P.ucr],
  lb08:[P.microalb,P.ucr],
  lb09:[P.cbc,P.dc,P.fe,P.tibc],
  lb10:[P.acSugar,P.tc,P.tg,P.hdl,P.ldl,P.hscrp,P.homocys,P.probnp,P.cpk],
  lb11:[P.t3,P.ft4,P.tsh],
  lb12:[P.fsh,P.lh,P.e2,P.tsh,P.prl,P.p4,P.chlaIgG],
  lb13:[P.hiv,P.gono,P.vdrl,P.hsv1,P.hsv2,P.tpha,P.chlaDNA],
  lb14:[P.alb,P.zn,P.ferritin,P.cortisol,P.vitd,P.homocys,P.tsh,P.ft4],
  lb15:[P.cea,P.afp,P.ca125,P.ca153,P.ca199,P.scc,P.cyfra],
  lb16:[P.cea,P.afp,P.ca125,P.ca153,P.ca199,P.scc,P.cyfra,P.ca724,P.progrp,P.bhcg,P.vcaIgA],
  lb17:[P.cea,P.afp,P.ca199,P.psa,P.scc,P.cyfra],
  lb18:[P.cea,P.afp,P.ca199,P.psa,P.scc,P.cyfra,P.ca724,P.progrp,P.bhcg,P.fpsa,P.vcaIgA]
};
/* 健檢方案：生化／尿液 + 影像與功能檢查 */
const HC_LAB_A = [P.acSugar,P.hba1c,P.insulin,P.ast,P.alt,P.bun,P.cr,P.ua,
                  P.tc,P.tg,P.hdl,P.ldl,P.tsh,P.ft4,P.urine];
PANEL_PARTS.hc_base = HC_LAB_A.concat([P.cbc,'ex1','ex2','ex5']);    /* 加血液常規、腹超、甲狀腺超音波、TANITA */
PANEL_PARTS.hc_m1 = [P.lpa,P.apob,P.hscrp,'ex4'];
PANEL_PARTS.hc_m2 = ['ex3'];
PANEL_PARTS.hc_m3 = [P.hbsag,P.hbsab,P.hcv];
PANEL_PARTS.hc_m4 = ['lb_08001'];                                     /* 碳 13 尿素呼氣測試 */
PANEL_PARTS.hc_m5 = ['lb_09010'];                                     /* 糞便潛血免疫分析 */
PANEL_PARTS.hc_m7f = PANEL_PARTS.lb16;                               /* 與檢驗「完整腫瘤指標(女)」同內容 */
PANEL_PARTS.hc_m7m = PANEL_PARTS.lb18;                               /* 與檢驗「完整腫瘤指標(男)」同內容 */

const HC_WITH_ENDO = { hc_m6:'⑥ 麻醉胃鏡＋大腸鏡' };

/* 同一項檢驗在兩個分類各列一次（方便從不同分類找到）：分身 id → 本尊 id
   搜尋只列本尊；重複計費比對時視為同一項。 */
const SAME_TEST = { lb_14004:'lb_09009', lb_18001:'lb_14010', lb_17013:'lb_06010' };

return {ITEM_NOTES, ITEM_DESCS, CATEGORIES, ENDO_TREE, DISCOUNT_AMOUNTS, P, PANEL_PARTS, HC_LAB_A, HC_WITH_ENDO, SAME_TEST};
})();
