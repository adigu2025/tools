/* 報價工具（醫療費用規劃）的程式。原本是獨立的 clinic-planner repo，2026-10-31 併入工作台。
   畫面在 view.html，由 ../mount.js 裝進 #quote-host 的 shadow root：
   QD 是 shadow root（找元素、掛事件），QB 是 .q-body（取代原本的 body）。
   事件掛在 QD 上，快捷鍵只在焦點位於報價畫面裡才有作用，不會和工作台其他分頁互搶。
   整段包在函式裡，變數名稱不會和工作台或其他工具衝突。 */
(function(){
/* ═══════════════════════════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════════════════════════ */
const ICONS = {
  'health-check': `<svg viewBox="0 0 28 28" fill="none">
    <rect x="4.5" y="4" width="19" height="22" rx="2.5" stroke="currentColor" stroke-width="1.6"/>
    <path d="M10 4V3a1.2 1.2 0 011.2-1.2h5.6A1.2 1.2 0 0118 3v1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M7 16.5h2.8l2-5 3.2 9 2-4H21" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  'lab': `<svg viewBox="0 0 28 28" fill="none">
    <path d="M10.5 4h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M12 4v8.5L6.2 20.2A2.3 2.3 0 008.3 24h11.4a2.3 2.3 0 002.1-3.8L16 12.5V4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="10.5" cy="19.5" r="1.1" fill="currentColor"/>
    <circle cx="15.5" cy="21.5" r="1.1" fill="currentColor"/>
    <circle cx="13"   cy="17.5" r=".8"  fill="currentColor"/>
  </svg>`,
  'exam': `<svg viewBox="0 0 28 28" fill="none">
    <circle cx="12" cy="11" r="7" stroke="currentColor" stroke-width="1.6"/>
    <line x1="17" y1="16" x2="23.5" y2="22.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="9"  y1="11" x2="15"  y2="11"   stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="12" y1="8"  x2="12"  y2="14"   stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  'endo': `<svg viewBox="0 0 34 28" fill="none">
    <rect x="1.5" y="5" width="31" height="16" rx="2.5" stroke="currentColor" stroke-width="1.6"/>
    <line x1="1.5" y1="9" x2="32.5" y2="9" stroke="currentColor" stroke-width="0.7" opacity="0.25"/>
    <rect x="4.5" y="11.5" width="10" height="6.5" rx="1.2" stroke="currentColor" stroke-width="1.3"/>
    <path d="M5.8 15h1.8l1.2-2.5 1.8 5 1.2-2.5h1.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="18" y1="6" x2="18" y2="21" stroke="currentColor" stroke-width="0.7" opacity="0.2"/>
    <circle cx="25" cy="15" r="3.5" stroke="currentColor" stroke-width="1.4"/>
    <circle cx="25" cy="15" r="1"   fill="currentColor"/>
    <circle cx="21" cy="11.5" r="1" fill="currentColor" opacity="0.5"/>
    <circle cx="21" cy="14.5" r="1" fill="currentColor" opacity="0.5"/>
    <circle cx="21" cy="17.5" r="1" fill="currentColor" opacity="0.5"/>
    <line   x1="12.5" y1="21" x2="12.5" y2="25.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="12.5" cy="26.5" rx="3" ry="1.2" stroke="currentColor" stroke-width="1.3"/>
  </svg>`,
  'drip': `<svg viewBox="0 0 28 32" fill="none">
    <path d="M14 4L14 1.5Q14 0 15.5 0Q17 0 17 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <path d="M8.5 4.5Q6 4.5 6 8L6 18.5Q6 24 14 24Q22 24 22 18.5L22 8Q22 4.5 19.5 4.5Z" stroke="currentColor" stroke-width="1.6"/>
    <line x1="7.5" y1="14.5" x2="20.5" y2="14.5" stroke="currentColor" stroke-width="1" stroke-dasharray="2.5 2" opacity="0.35"/>
    <line x1="14" y1="24" x2="14" y2="29.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M11.8 30Q14 27.5 16.2 30Q16.2 33 14 33Q11.8 33 11.8 30Z" fill="currentColor" opacity="0.4"/>
  </svg>`,
};

/* ═══════════════════════════════════════════════════════════════════
   NOTES LOOKUP (備註，僅 tooltip 與列印使用)
   ═══════════════════════════════════════════════════════════════════ */
const ITEM_NOTES = {
  hc_base:`血液常規（紅血球、白血球、血小板）\n飯前血糖、糖化血色素、胰島素阻抗\n肝功能 AST、ALT（附 FIB-4 肝纖維化指數）\n腎功能 BUN、肌酸酐，尿酸\n總膽固醇、三酸甘油酯、高密度及低密度膽固醇\n甲狀腺功能 TSH、free T4\n尿液一般檢查\n腹部超音波、甲狀腺超音波\nTANITA 身體組成分析`,
  hc_m1:`脂蛋白(a)\nApoB 載脂蛋白 B\nhs-CRP 高敏感度 C 反應蛋白\n心電圖`,
  hc_m3:`B 型肝炎表面抗原\nB 型肝炎表面抗體\nC 型肝炎抗體`,
  hc_m7f:`共同：CEA、AFP、CA199、SCC、Cyfra 21-1\nCA-724、Pro-GRP、β-HCG、EB-VCA-IgA\n女性：CA125、CA153\n數值僅供參考，不能取代影像與內視鏡檢查`,
  hc_m7m:`共同：CEA、AFP、CA199、SCC、Cyfra 21-1\nCA-724、Pro-GRP、β-HCG、EB-VCA-IgA\n男性：PSA、free-PSA\n數值僅供參考，不能取代影像與內視鏡檢查`,
  hc_m6:`胃鏡＋大腸鏡，同一次麻醉完成\n完全自費，不留健保紀錄\n切片、瘜肉切除與病理檢查依實際處置另計`,
  lb01:`(H14 + UR)
AC sugar
AST, ALT
BUN, Cr, uric acid
TC, TG, HDL, LDL
+ Urine routine`,
  lb02:`(H07)
CBC/DC 
AC sugar, HbA1c
AST, ALT
BUN, Cr, uric acid
TC, TG, HDL, LDL, TC/HDL ratio
urine routine`,
  lb03:`(MAB)
CBC/DC
AC sugar, HbA1c
AST, ALT, bilirubin-t/d, ALK-P, r-GT, alb, globulin, TP, amylase
BUN, Cr, uric acid
TC, TG, HDL, LDL, TC/HDL ratio
urine routine`,
  lb04:`(MAA)
CBC/DC
AC sugar, HbA1c
AST, ALT, HBsAg, anti-HBs, anti-HCV
BUN, Cr, uric acid
TC, TG, HDL, LDL, TC/HDL ratio
urine routine`,
  lb05:`(H20)
HBsAg, anti-HBs, anti-HCV`,
  lb06:`(MAS)
AC sugar, HbA1, HOMA-IR
AST, ALT
BUN, Cr, uric acid
TC, TG, HDL, LDL
TSH, free T4`,
  lb07:`(MAD)
AC sugar, HbA1, HOMA-IR
BUN, Cr
U-ACr`,
  lb08:`(UAC)
U-ACr`,
  lb09:`(H16)
CBC/DC
iron, TIBC`,
  lb10:`(MAC)
AC sugar
TC, TG, HDL, LDL, TC/HDL ratio
hsCRP, homocysteine, NT-proBNP, CPK`,
  lb11:`(15U)
T3, freeT4, TSH`,
  lb12:`(MAG)
FSH, LH, E2, TSH, prostaglandin, progesterone, chlamydia IgG`,
  lb13:`(KKJ)
anti-HIV, N-gono DNA, RPR/VDRL, HSVI-IgG, HSVII-IgG, treponemal, trachomatis DNA`,
  lb14:`(MAK)
alb, Zn, ferritin, cortisol, vit D3, homocysteine, TSH, fT4`,
  lb15:`CEA、AFP、CA125、CA153、CA199、SCC、Cyfra 21-1`,
  lb16:`CEA、AFP、CA125、CA153、CA199、SCC、Cyfra 21-1、CA-724、Pro-GRP、β-HCG、EV-VCA-IgA`,
  lb17:`CEA、AFP、CA199、PSA、SCC、Cyfra 21-1`,
  lb18:`CEA、AFP、CA199、PSA、SCC、Cyfra 21-1、CA-724、Pro-GRP、β-HCG、free-PSA、EV-VCA-IgA`,
  // ex1-ex5: 檢查項目無備註
};

/* ─ 一段式備註（hover 1.5秒顯示，不顯示於卡片） ─────────────────────── */
const ITEM_DESCS = {
  'en_gc_ins':  '健保給付規定：胃鏡與大腸鏡同日檢查只給付其中一項。自費之項目與相關之處置皆需要自費。',
  'en_gc_self': '完全自費表示完全不留健保紀錄，但是內視鏡檢查過程中相關處置及耗材皆需要自費。',
  'en_sp_gb':   '不含病理檢查',
  'en_sp_gp':   '不含病理檢查',
  'en_sp_cb':   '不含病理檢查',
  'en_sp_cp1':  '不含病理檢查',
  'en_sp_cp2':  '不含病理檢查',
  'en_sp_cp3':  '不含病理檢查',
  'lb_20007':   '報告時效 7-10 工作天',
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
      { id:'hc_m1', name:'① 心血管風險評估', desc:'脂蛋白(a)、ApoB、hs-CRP、心電圖', price:1900 },
      { id:'hc_m2', name:'② 頸動脈超音波', desc:'與 ① 合選優惠 NT$ 400', price:600 },
      { id:'hc_m3', name:'③ B、C 型肝炎篩檢', desc:'B 肝表面抗原與抗體、C 肝抗體', price:500 },
      { id:'hc_m4', name:'④ 幽門桿菌呼氣檢查', desc:'碳 13 尿素呼氣測試', price:1200 },
      { id:'hc_m5', name:'⑤ 糞便潛血檢查', desc:'免疫法（FIT）', price:400 },
      { id:'hc_m6', name:'⑥ 麻醉胃鏡＋大腸鏡', desc:'健檢專案，完全自費', price:10000 },
      { id:'hc_s3', type:'section', name:'⑦ 11 項腫瘤標記（男女項目不同，擇一）' },
      { id:'hc_m7f', name:'⑦ 11 項腫瘤標記（女）', desc:'共同 9 項＋CA125、CA153', price:4000 },
      { id:'hc_m7m', name:'⑦ 11 項腫瘤標記（男）', desc:'共同 9 項＋PSA、free-PSA', price:4000 },
      { id:'hc_s4', type:'section', name:'⑧ 院外檢查' },
      { id:'hc_m8', name:'⑧ 低劑量肺部電腦斷層', desc:'依榮總定價，於榮總檢查當日繳費', price:5490, extPay:'榮總' },
    ]
  },
  {
    id: 'lab', label: '檢驗', desc: '血液、尿液及特殊檢驗',
    items: [
      { id:'lb_s_c', type:'section', name:'檢驗套組' },
      { id:'lb01', name:'成人健檢', desc:'(H14 + UR)', price:400 },
      { id:'lb02', name:'成人健檢-安心', desc:'(H07)', price:600 },
      { id:'lb03', name:'成人健檢-代謝', desc:'(MAB)', price:1000 },
      { id:'lb04', name:'成人健檢-護肝', desc:'(MAA)', price:1200 },
      { id:'lb05', name:'病毒性肝炎', desc:'(H20)', price:500 },
      { id:'lb06', name:'減重前評估', desc:'(MAS)', price:1200 },
      { id:'lb07', name:'糖尿病風險評估(含胰島素阻抗)', desc:'(MAD)', price:800 },
      { id:'lb08', name:'定量蛋白尿', desc:'(UAC)', price:350 },
      { id:'lb09', name:'缺鐵性貧血', desc:'(H16)', price:800 },
      { id:'lb10', name:'心血管健康', desc:'(MAC)', price:2200 },
      { id:'lb11', name:'甲狀腺機能', desc:'(15U)', price:700 },
      { id:'lb12', name:'女性荷爾蒙', desc:'(MAG)', price:1500 },
      { id:'lb13', name:'婚前健檢', desc:'(KKJ)', price:3800 },
      { id:'lb14', name:'傷口癒合力指標', desc:'(MAK)', price:1500 },
      { id:'lb15', name:'基礎腫瘤指標(女)', desc:'女性7項癌篩', price:2500 },
      { id:'lb16', name:'完整腫瘤指標(女)', desc:'女性11項癌篩', price:4000 },
      { id:'lb17', name:'基礎腫瘤指標(男)', desc:'男性6項癌篩', price:2200 },
      { id:'lb18', name:'完整腫瘤指標(男)', desc:'男性11項癌篩', price:4000 },
      { id:'lb_s0', type:'section', name:'一般生化檢查' },
      { id:'lb_01001', name:'AC Sugar 飯前血糖', price:70 },
      { id:'lb_01002', name:'PC Sugar 飯後血糖', price:70 },
      { id:'lb_01003', name:'TG Triglyceride中性脂肪', price:120 },
      { id:'lb_01004', name:'TC Total Cholesterol膽固醇', price:100 },
      { id:'lb_01005', name:'HDL 高密度膽固醇', price:170 },
      { id:'lb_01006', name:'LDL 低密度膽固醇', price:170 },
      { id:'lb_01007', name:'Lipoprotein(a) 脂蛋白(a)', price:600 },
      { id:'lb_01029', name:'Apo B 載脂蛋白B', price:600 },
      { id:'lb_01008', name:'BUN 血中尿素氮', price:70 },
      { id:'lb_01009', name:'UA (Uric Acid) 尿酸', price:70 },
      { id:'lb_01010', name:'Cr (Creatinine)  肌酸肝', price:70 },
      { id:'lb_01011', name:'AST (GOT) 麩草轉氨基脢', price:70 },
      { id:'lb_01012', name:'ALT (GPT) 麩丙銅轉氨基脢', price:70 },
      { id:'lb_01013', name:'r-GT 丙麩氨轉脢', price:100 },
      { id:'lb_01014', name:'Alk-P (ALP) 鹼性磷酸脢', price:70 },
      { id:'lb_01015', name:'Total Bilirubin  膽紅素總量', price:70 },
      { id:'lb_01016', name:'Direct Bilirubin 直接膽紅素', price:70 },
      { id:'lb_01017', name:'Micro Bilirubin 新生兒黃疸', price:120 },
      { id:'lb_01018', name:'Albumin 白蛋白', price:70 },
      { id:'lb_01019', name:'Globulin 球蛋白', price:70 },
      { id:'lb_01020', name:'T-P (Total-protein)全蛋白', price:70 },
      { id:'lb_ag', name:'A/G ratio 蛋白比值', price:0 },
      { id:'lb_01021', name:'Amylase 澱粉脢', price:150 },
      { id:'lb_01022', name:'Lipase 解脂脢', price:250 },
      { id:'lb_01023', name:'CPK 肌酸激脢', price:150 },
      { id:'lb_01024', name:'LDH 乳酸脫氫脢', price:150 },
      { id:'lb_01025', name:'CK-MB 肌酸磷酸脢', price:200 },
      { id:'lb_01026', name:'Cholinesterase 膽素脂脢', price:350 },
      { id:'lb_01027', name:'Ammonia 血氨', price:500 },
      { id:'lb_01028', name:'VMA 香莢杏仁酸定量', price:500 },
      { id:'lb_s1', type:'section', name:'肝炎病毒檢查' },
      { id:'lb_02001', name:'HBcrAg 合併 HBs quant', price:2000 },
      { id:'lb_02002', name:'HBsAg quant', price:500 },
      { id:'lb_02003', name:'HBV-DNA', price:2500 },
      { id:'lb_02004', name:'HCV-RNA', price:3000 },
      { id:'lb_02005', name:'HCV 基因分型', price:4000 },
      { id:'lb_02006', name:'HBsAg B型肝炎表面抗原', price:200 },
      { id:'lb_02007', name:'HBsAb B型肝炎表面抗體', price:300 },
      { id:'lb_02008', name:'HBeAg B型肝炎E抗原', price:350 },
      { id:'lb_02009', name:'HBeAb B型肝炎E抗體', price:350 },
      { id:'lb_02010', name:'HBc-IgG B肝核心抗體', price:300 },
      { id:'lb_02011', name:'HBc-IgM B型肝炎核心IgM', price:500 },
      { id:'lb_02012', name:'Anti-HAV IgM A型肝炎抗體', price:500 },
      { id:'lb_02013', name:'HAV Ab(IgG+IgM) A型肝炎抗體', price:350 },
      { id:'lb_02014', name:'Anti-HCV C型肝炎抗體', price:400 },
      { id:'lb_s2', type:'section', name:'糖尿病檢查' },
      { id:'lb_03001', name:'HbA1C  醣化血色素', price:300 },
      { id:'lb_03002', name:'Insulin 胰島素血清檢驗', price:400 },
      { id:'lb_03003', name:'C-Peptide C-胜鍊胰島素', price:300 },
      { id:'lb_03004', name:'GA(Glycated Albumin) 醣化白蛋白', price:400 },
      { id:'lb_03005', name:'GAD Ab 穀醯酸脫梭脢抗體', price:1000 },
      { id:'lb_03006', name:'IA2 Ab 胰島細胞抗原-2抗體', price:2400 },
      { id:'lb_s3', type:'section', name:'甲狀腺檢查' },
      { id:'lb_04001', name:'T3 三碘甲狀腺素', price:250 },
      { id:'lb_04002', name:'T4 四碘甲狀腺素', price:250 },
      { id:'lb_04003', name:'TSH 甲狀腺促進素', price:350 },
      { id:'lb_04004', name:'Free T4游離四碘甲狀腺', price:300 },
      { id:'lb_04005', name:'Free T3游離三碘甲狀腺', price:300 },
      { id:'lb_04006', name:'T3 Uptake三碘腺攝取率', price:500 },
      { id:'lb_04007', name:'Thyroglobulin甲狀腺球蛋白', price:200 },
      { id:'lb_04008', name:'ATA甲狀腺球蛋白抗體', price:400 },
      { id:'lb_04009', name:'TSH recepter結合體抗體', price:700 },
      { id:'lb_04010', name:'Anti-TPO甲狀腺過氧化脢', price:400 },
      { id:'lb_s4', type:'section', name:'副甲狀腺檢查' },
      { id:'lb_05001', name:'Intact-PTH 副甲狀腺素', price:800 },
      { id:'lb_05002', name:'Calcitonin 降血鈣素', price:600 },
      { id:'lb_s5', type:'section', name:'腫瘤癌症篩檢' },
      { id:'lb_06001', name:'NMP22 膀胱癌', price:1500 },
      { id:'lb_06002', name:'HE4  副睪蛋白質4', price:1600 },
      { id:'lb_06003', name:'CA724 腫瘤標記', price:500 },
      { id:'lb_06004', name:'Pro-GRP 胃泌素釋放前體', price:1000 },
      { id:'lb_06005', name:'NSE 神經元特異烯醇酶', price:500 },
      { id:'lb_06006', name:'Cyfra21-1 細胞角質蛋白片段21-1', price:600 },
      { id:'lb_06007', name:'PIVKA-II 異常凝血酶原', price:1200 },
      { id:'lb_06008', name:'AFP 甲型胎兒蛋白', price:350 },
      { id:'lb_06009', name:'CEA 癌胚胎抗原', price:400 },
      { id:'lb_06010', name:'β-HCG人類絨毛膜激素', price:400 },
      { id:'lb_06011', name:'β2-Microglobaline 骨髓癌', price:600 },
      { id:'lb_06012', name:'CA125 腫瘤標記', price:500 },
      { id:'lb_06013', name:'CA153 腫瘤標記', price:500 },
      { id:'lb_06014', name:'CA199 腫瘤標記', price:500 },
      { id:'lb_06015', name:'SCC 鱗狀細胞癌抗原', price:500 },
      { id:'lb_06016', name:'EBV-DNA 鼻咽癌', price:1200 },
      { id:'lb_06017', name:'EB VCA-IgG 鼻咽癌', price:500 },
      { id:'lb_06018', name:'EB VCA-IgM 鼻咽癌', price:500 },
      { id:'lb_06019', name:'EB VCA-IgA 鼻咽癌病毒', price:500 },
      { id:'lb_s6', type:'section', name:'攝護腺檢查' },
      { id:'lb_07001', name:'PSA 攝護腺特異抗原', price:500 },
      { id:'lb_07002', name:'Free PSA 游離攝護腺', price:500 },
      { id:'lb_07003', name:'PHI 攝護腺健康指標\n(含PSA、fPSA、p2PSA)', price:2500 },
      { id:'lb_s7', type:'section', name:'特殊檢查' },
      { id:'lb_08001', name:'UBT 碳-13尿素呼氣測試(幽門桿菌)', price:1200 },
      { id:'lb_08002', name:'CTC循環腫瘤細胞檢測', price:10000 },
      { id:'lb_08003', name:'SOD-RBC超氧化物歧化脢', price:1400 },
      { id:'lb_s8', type:'section', name:'常見尿液.糞便.痰液檢查' },
      { id:'lb_09001', name:'Urine Routine 尿一般檢查', price:100 },
      { id:'lb_09002', name:'尿生化檢查', price:100 },
      { id:'lb_09003', name:'Urine Protein 定量尿蛋白', price:70 },
      { id:'lb_09004', name:'Microalbumin 微量蛋白', price:300 },
      { id:'lb_09005', name:'Urine Creatinine 尿肌肝酸', price:70 },
      { id:'lb_09006', name:'Pregnancy test懷孕試驗', price:100 },
      { id:'lb_09007', name:'Amoeba    阿米巴檢查', price:400 },
      { id:'lb_09008', name:'Stool Routine  糞便常規', price:100 },
      { id:'lb_09009', name:'HpSA 糞便抗原檢查(幽門桿菌)', price:500 },
      { id:'lb_09010', name:'iFOBT糞便潛血免疫分析', price:400 },
      { id:'lb_09011', name:'Perianal swab 蟯蟲膠片', price:50 },
      { id:'lb_09012', name:'Sputum Routine痰液常規', price:300 },
      { id:'lb_09013', name:'腸道菌分析', price:8000 },
      { id:'lb_s9', type:'section', name:'一般血液檢查' },
      { id:'lb_10001', name:'CBC (全套血液檢查8項)', price:250 },
      { id:'lb_10002', name:'D/C (WBC 分類計數)', price:250 },
      { id:'lb_10003', name:'PT  凝血脢原時間', price:200 },
      { id:'lb_10004', name:'APTT 部份凝血活脢時間', price:300 },
      { id:'lb_10005', name:'Blood Type 血型', price:50 },
      { id:'lb_10006', name:'RH因子', price:100 },
      { id:'lb_10007', name:'Crossmatching test 核血試驗', price:500 },
      { id:'lb_10008', name:'ESR 紅血球沈降速率', price:100 },
      { id:'lb_10009', name:'G6PD 蠶豆症', price:400 },
      { id:'lb_s10', type:'section', name:'貧血檢查' },
      { id:'lb_11001', name:'Fe 鐵', price:100 },
      { id:'lb_11002', name:'TIBC 總鐵結合能力', price:300 },
      { id:'lb_11003', name:'Vitamin B12 維他命B12', price:500 },
      { id:'lb_11004', name:'Folate 葉酸', price:500 },
      { id:'lb_11005', name:'Transferrin 運鐵蛋白', price:400 },
      { id:'lb_11006', name:'Ferritin 鐵蛋白', price:400 },
      { id:'lb_11007', name:'Hb-EP  血紅素電泳', price:500 },
      { id:'lb_s11', type:'section', name:'電解質.重金屬檢查' },
      { id:'lb_12001', name:'Na (Sodium) 鈉', price:70 },
      { id:'lb_12002', name:'K (Potasium) 鉀', price:70 },
      { id:'lb_12003', name:'Cl (Chloride) 氯', price:70 },
      { id:'lb_12004', name:'Ca (Calcium) 鈣', price:70 },
      { id:'lb_12005', name:'P (Phosphorous) 磷', price:70 },
      { id:'lb_12006', name:'Mg (Magnesium) 鎂', price:70 },
      { id:'lb_12007', name:'Li (Lithium) 鋰', price:300 },
      { id:'lb_12008', name:'Pb (Lead) 鉛', price:600 },
      { id:'lb_12009', name:'Hg (Mercury) 汞', price:800 },
      { id:'lb_12010', name:'Al (Aluminum)鋁', price:600 },
      { id:'lb_12011', name:'Zn (Zinc)鋅', price:700 },
      { id:'lb_12012', name:'Se (Selenium) 硒', price:1000 },
      { id:'lb_12013', name:'Cu (Copper) 銅', price:500 },
      { id:'lb_12014', name:'As (Arsenic) 砷', price:800 },
      { id:'lb_s12', type:'section', name:'心肌梗塞檢查' },
      { id:'lb_13001', name:'D-Dimer test', price:750 },
      { id:'lb_13002', name:'Troponin-I心肌旋轉蛋白-I', price:800 },
      { id:'lb_13003', name:'hsCRP高靈敏度C反應蛋白', price:360 },
      { id:'lb_13004', name:'Homocysteine同半胱胺酸', price:800 },
      { id:'lb_13005', name:'NT-proBNP 心臟標記', price:1200 },
      { id:'lb_s13', type:'section', name:'血清免疫學檢查' },
      { id:'lb_14001', name:'RA 類風濕因子(比濁法)', price:300 },
      { id:'lb_14002', name:'CRP C反應蛋白(比濁法)', price:300 },
      { id:'lb_14003', name:'H.pylori Ab 幽門桿菌抗體', price:500 },
      { id:'lb_14004', name:'HpSA 幽門桿菌糞便抗原', price:800 },
      { id:'lb_14005', name:'ASLO 抗連鎖球溶解素', price:250 },
      { id:'lb_14006', name:'IgG 免疫球蛋白 G', price:300 },
      { id:'lb_14007', name:'IgA 免疫球蛋白 A', price:300 },
      { id:'lb_14008', name:'IgM 免疫球蛋白 M', price:300 },
      { id:'lb_14009', name:'IgD 免疫球蛋白 D', price:300 },
      { id:'lb_14010', name:'IgE 免疫球蛋白 E', price:400 },
      { id:'lb_14011', name:'C3  補體-3', price:300 },
      { id:'lb_14012', name:'C4  補體-4', price:300 },
      { id:'lb_14013', name:'Rubella IgG  德國痳疹', price:300 },
      { id:'lb_14014', name:'Rubella IgM  德國痳疹', price:600 },
      { id:'lb_s14', type:'section', name:'自體免疫檢查' },
      { id:'lb_15001', name:'ANA 抗細胞核抗體', price:500 },
      { id:'lb_15002', name:'Anti-ds DNA  DNA抗體', price:400 },
      { id:'lb_15003', name:'Anti-CCP抗環瓜氨酸抗體', price:1200 },
      { id:'lb_15004', name:'Anti-ENA抗體鑑定', price:2000 },
      { id:'lb_15005', name:'CTD Screen自體免疫篩檢', price:450 },
      { id:'lb_15006', name:'ANCA 抗嗜中性球細胞質抗體', price:800 },
      { id:'lb_15007', name:'AchR Ab 乙醯膽鹼抗體', price:1800 },
      { id:'lb_15008', name:'ASMA 平滑肌抗體', price:400 },
      { id:'lb_15009', name:'Mitochondrial Ab 抗粒腺體', price:500 },
      { id:'lb_15010', name:'Cardiolipin IgG 心脂抗體', price:900 },
      { id:'lb_15011', name:'Cardiolipin IgM 心脂抗體', price:800 },
      { id:'lb_15012', name:'Anti-β2-GPI IgG', price:700 },
      { id:'lb_15013', name:'Anti-β2-GPI IgM', price:1400 },
      { id:'lb_15014', name:'Lupus Anti-coagulant', price:2000 },
      { id:'lb_15015', name:'tTG-IgA 乳糜瀉抗體', price:3000 },
      { id:'lb_s15', type:'section', name:'傳染病檢查' },
      { id:'lb_16001', name:'Mycoplasma IgG 黴漿菌', price:360 },
      { id:'lb_16002', name:'Mycoplasma IgM 黴漿菌', price:400 },
      { id:'lb_16003', name:'CMV-IgG 巨細胞病毒', price:1000 },
      { id:'lb_16004', name:'CMV-IgM 巨細胞病毒', price:600 },
      { id:'lb_16005', name:'Meales Virus-IgG 麻疹', price:360 },
      { id:'lb_16006', name:'Meales Virus-IgM 麻疹', price:1200 },
      { id:'lb_16007', name:'MumpsVirus-IgG 腮腺炎', price:500 },
      { id:'lb_16008', name:'MumpsVirus-IgM 腮腺炎', price:1200 },
      { id:'lb_16009', name:'V-Zoster IgG 水痘', price:1000 },
      { id:'lb_16010', name:'V-Zoster IgM 水痘', price:1000 },
      { id:'lb_16011', name:'Toxoplasma-IgG 弓漿蟲', price:800 },
      { id:'lb_16012', name:'Toxoplasma-IgM 弓漿蟲', price:800 },
      { id:'lb_16013', name:'Widal & Weil-Felix 傷寒', price:300 },
      { id:'lb_16014', name:'Rota virus Ag  輪狀病毒', price:600 },
      { id:'lb_s16', type:'section', name:'生殖功能荷爾蒙' },
      { id:'lb_17001', name:'AMH 抗穆勒氏管荷爾蒙', price:1000 },
      { id:'lb_17002', name:'SHBG 套檢', price:1200 },
      { id:'lb_17003', name:'P4 (Progesteron) 黃體脂酮', price:350 },
      { id:'lb_17004', name:'GH 生長激素', price:500 },
      { id:'lb_17005', name:'Cortisol(8AM) 皮質素', price:400 },
      { id:'lb_17006', name:'Cortisol(4PM) 皮質素', price:400 },
      { id:'lb_17007', name:'Aldosterone 醛類脂醇酵素', price:800 },
      { id:'lb_17008', name:'PRL (Prolactin) 泌乳素', price:350 },
      { id:'lb_17009', name:'Testosterone 睪固酮', price:300 },
      { id:'lb_17010', name:'FSH 濾泡激素', price:350 },
      { id:'lb_17011', name:'LH 黃體激素', price:350 },
      { id:'lb_17012', name:'E2 (Estradiol)  雌二素', price:350 },
      { id:'lb_17013', name:'β-HCG人類絨毛膜激素', price:400 },
      { id:'lb_17014', name:'IGF-1類胰島素成長因子', price:1000 },
      { id:'lb_17015', name:'DHEA-S 異雄固酮', price:500 },
      { id:'lb_17016', name:'ACTH 促腎上腺皮質素', price:1200 },
      { id:'lb_17017', name:'Renin Activity(PRA)', price:1000 },
      { id:'lb_17018', name:'5-HIAA 5-氫氧靛基醋酸', price:1500 },
      { id:'lb_17019', name:'Catecholamine 兒茶酚氨測定', price:2000 },
      { id:'lb_s17', type:'section', name:'過敏原檢查' },
      { id:'lb_18001', name:'IgE 免疫球蛋白 E', price:400 },
      { id:'lb_18002', name:'Phadiatop (吸入性過敏)', price:600 },
      { id:'lb_18003', name:'40 項過敏原(吸入+食入)', price:2500 },
      { id:'lb_18004', name:'66 項過敏原(吸入+食入)', price:3600 },
      { id:'lb_18005', name:'101項過敏原(食入)', price:8000 },
      { id:'lb_18006', name:'110項過敏原(急性+慢性)', price:4800 },
      { id:'lb_18007', name:'224項過敏原(急性+慢性)', price:12000 },
      { id:'lb_s18', type:'section', name:'藥物.毒物檢查' },
      { id:'lb_19001', name:'Carbamazepine(Tegretol)', price:400 },
      { id:'lb_19002', name:'Phenytoin (Dilantin)', price:400 },
      { id:'lb_19003', name:'Theophylline/Aminophyline', price:400 },
      { id:'lb_19004', name:'Valproic acid (Depakene)', price:400 },
      { id:'lb_19005', name:'Digoxin  長葉毛地黃', price:400 },
      { id:'lb_19006', name:'Phenobarbital(Luminal)', price:400 },
      { id:'lb_19007', name:'Morphine 嗎啡', price:400 },
      { id:'lb_19008', name:'Amphetamin 安非他命', price:400 },
      { id:'lb_19009', name:'Heroin 海洛因', price:400 },
      { id:'lb_19010', name:'MDMA 搖頭丸', price:1000 },
      { id:'lb_19011', name:'Ketamine K他命', price:1000 },
      { id:'lb_s19', type:'section', name:'基因檢測' },
      { id:'lb_20001', name:'APO-E 阿茲海默症基因', price:2000 },
      { id:'lb_20002', name:'5HTT genotyping 血清素運送基因', price:3000 },
      { id:'lb_20003', name:'HLA-B5801 抗痛風藥物過敏基因', price:3500 },
      { id:'lb_20004', name:'HLA-B1502 抗癲癇藥物過敏基因', price:4000 },
      { id:'lb_20005', name:'HLA-B27 僵直性脊椎炎', price:2000 },
      { id:'lb_20006', name:'肥胖基因檢測', price:5500 },
      { id:'lb_20007', name:'ACTN3 genotype', price:1500 },
      { id:'lb_s20', type:'section', name:'性病檢查' },
      { id:'lb_21001', name:'VDRL (STS/RPR) 梅毒', price:100 },
      { id:'lb_21002', name:'TPHA 梅毒螺旋體', price:300 },
      { id:'lb_21003', name:'HIV Ag/Ab Combo test', price:400 },
      { id:'lb_21004', name:'FTA-ABS IgM 梅毒螢光染', price:1000 },
      { id:'lb_21005', name:'Chlamydia-IgG 披衣菌', price:600 },
      { id:'lb_21006', name:'Chlamydia-IgM 披衣菌', price:600 },
      { id:'lb_21007', name:'Chlamydia-IgA 披衣菌', price:600 },
      { id:'lb_21008', name:'HSV-I IgG 疱疹 1 型', price:300 },
      { id:'lb_21009', name:'HSV-II IgG 疱疹 2 型', price:300 },
      { id:'lb_21010', name:'HSV-I IgM 疱疹 1型', price:700 },
      { id:'lb_21011', name:'HSV-II IgM 疱疹 2 型', price:700 },
      { id:'lb_21012', name:'HSV(1+2)-DNA', price:2000 },
      { id:'lb_21013', name:'Chlamydia DNA 披衣菌DNA', price:1200 },
      { id:'lb_21014', name:'Trichomonas DNA 滴蟲DNA', price:1200 },
      { id:'lb_21015', name:'N.gono DNA 淋病雙球菌', price:1200 },
      { id:'lb_21016', name:'HPV-DNA Assay', price:1500 },
      { id:'lb_21017', name:'人類乳突病毒檢測', price:1400 },
      { id:'lb_s21', type:'section', name:'婦產科' },
      { id:'lb_22001', name:'九合一DNA(優奈)', price:3500 },
      { id:'lb_22002', name:'B群鏈球菌檢測', price:500 },
      { id:'lb_22003', name:'唐氏二指標(附表)', price:800 },
      { id:'lb_22004', name:'新二孕期唐氏四指標(附表)', price:2200 },
      { id:'lb_s22', type:'section', name:'精液檢查' },
      { id:'lb_23001', name:'精液分析Semen Analysis', price:400 },
      { id:'lb_23002', name:'精子品質分析', price:1500 },
      { id:'lb_23003', name:'精子DNA碎片檢測', price:6000 },
      { id:'lb_s23', type:'section', name:'細菌培養' },
      { id:'lb_24001', name:'Blood culture(需氧)', price:500 },
      { id:'lb_24002', name:'Blood culture(厭氧)', price:500 },
      { id:'lb_24003', name:'Urine Culture 尿液培養', price:360 },
      { id:'lb_24004', name:'Stool Culture 糞便培養', price:500 },
      { id:'lb_24005', name:'Salmonella/Shigella 培養', price:500 },
      { id:'lb_24006', name:'Wound/Pus culture(需氧)', price:360 },
      { id:'lb_24007', name:'Wound/Pus culture(厭氧)', price:360 },
      { id:'lb_24008', name:'Water Culture 水質培養', price:500 },
      { id:'lb_24009', name:'Sputum Culture 痰液培養', price:500 },
      { id:'lb_24010', name:'Gram’s Stain 革蘭氏染', price:100 },
      { id:'lb_24011', name:'Acid-FastStain抗酸菌染', price:250 },
      { id:'lb_24012', name:'TB Culture 結核桿菌', price:600 },
      { id:'lb_s24', type:'section', name:'骨質疏鬆症' },
      { id:'lb_25001', name:'關節囊液分析', price:200 },
      { id:'lb_25002', name:'BAP骨質特異性鹼性磷酸酶', price:600 },
      { id:'lb_25003', name:'Vitamin.D 維他命D', price:800 },
      { id:'lb_25004', name:'P1NP骨骼生成速度指標', price:1200 },
      { id:'lb_25005', name:'β-crosslaps(β-CTx)', price:1000 },
      { id:'lb_s25', type:'section', name:'病理、 細胞學' },
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
    id: 'exam', label: '檢查及處置', desc: '影像及功能性儀器檢查',
    items: [
      { id:'ex_su', type:'section', name:'超音波' },
      { id:'ex1', name:'全腹部超音波', desc:'檢查肝、膽、胰、脾、腎', price:800 },
      { id:'ex2', name:'甲狀腺超音波', desc:'檢查甲狀腺與周邊組織', price:600 },
      { id:'ex3', name:'頸動脈超音波', desc:'了解頸部血管健康狀態', price:600 },
      { id:'ex_sg', type:'section', name:'超音波導引' },
      { id:'ex_g4', name:'超音波導引 + 關節穿刺 + 關節囊液體分析', desc:'', price:2050 },
      { id:'ex_g5', name:'超音波導引 + 肋膜穿刺 + 肋膜腔液體分析', desc:'', price:2650 },
      { id:'ex_g6', name:'超音波導引 + 腹腔穿刺 + 腹腔液體分析', desc:'', price:2400 },
      { id:'ex_g7', name:'超音波導引 + 甲狀腺穿刺 + 薄片細胞學檢查', desc:'', price:3300 },
      { id:'ex_so', type:'section', name:'其他檢查' },
      { id:'ex4', name:'心電圖', desc:'基礎的心臟狀態篩檢', price:300 },
      { id:'ex5', name:'TANITA身體組成', desc:'了解身體組成與平衡狀態', price:500 },
    
    ]
  },
  {
    id: 'endo', label: '內視鏡', desc: '胃腸道內視鏡診療',
    items: [
    ]
  },
  {
    id: 'drip', label: '點滴', desc: '靜脈注射功能性點滴療程',
    items: [
      { id:'dr1', name:'術後全效\n組織修復', desc:'強力抗氧化、護肝排毒與抗發炎。著重於深度疲勞修復與過敏體質調理。',                                         price:2000 },
      { id:'dr2', name:'晨曦抗氧\n保肝修護', desc:'精神提振、細胞修復、溫和保肝。各成分劑量均衡，提供即時的體力與能量代謝補充。',                           price:1800 },
      { id:'dr3', name:'循環代謝\n全效配方', desc:'改善微循環、神經抗老、極高劑量抗氧化。針對頭暈耳鳴、用腦過度與末梢冰冷。',                               price:600  },
      { id:'dr4', name:'元素原力\n全效修復', desc:'神經痛/麻修復、抗炎止血、皮膚亮白。提供頂級的術後傷口修復與全方位微量元素補給。',                       price:2000 },
      { id:'dr5', name:'微量元素\n體力補充', desc:'急性腸胃炎/腸痙攣止痛、高濃度腸道黏膜修復與全靜脈營養補給。',                                           price:800  },
      { id:'dr6', name:'賦活原生\n組織修復', desc:'基礎體力補充、能量代謝與抗氧化。配方精簡、高效直接。',                                                   price:1000 },
    ]
  }
];

/* ═══════════════════════════════════════════════════════════════════
   ENDO TREE  —  三層式內視鏡選單
   ═══════════════════════════════════════════════════════════════════ */
const ENDO_TREE = {
  layer1: [
    { id:'en_gastro',   name:'胃鏡',                      basePrice:1600,
      layer2:[
        {id:'en_g_s',  name:'標準胃鏡 (直徑約0.9cm) 經口', desc:'使用拋棄式咬口器',                                 addPrice:100},
        {id:'en_g_to', name:'極細胃鏡 (直徑約0.5cm) 經口', desc:'使用拋棄式咬口器',                                 addPrice:700},
        {id:'en_g_tn', name:'極細胃鏡 (直徑約0.5cm) 經鼻', desc:'無其他耗材',                                       addPrice:600},
        {id:'en_g_hp', name:'加驗幽門桿菌',               desc:'快速尿素測試 NT$300 ＋ 拋棄式切片鉗 NT$1,000',    addPrice:1300}
      ],
      layer3:[{id:'en_g_w',name:'清醒',addPrice:0},{id:'en_g_l',name:'輕中度鎮靜',addPrice:2000},{id:'en_g_a',name:'麻醉',addPrice:4000}]
    },
    { id:'en_colon',    name:'大腸鏡',                     basePrice:2500,
      layer2:[
        {id:'en_c_j',  name:'日本製造代餐與清腸藥物', desc:'拋棄式檢查褲 ＋ 大腸鏡二氧化碳充氣', addPrice:1500},
        {id:'en_c_t',  name:'台灣製造代餐與清腸藥物', desc:'拋棄式檢查褲 ＋ 大腸鏡二氧化碳充氣', addPrice:1200}
      ],
      layer3:[{id:'en_c_w',name:'清醒',addPrice:0},{id:'en_c_l',name:'輕中度鎮靜',addPrice:2500},{id:'en_c_a',name:'麻醉',addPrice:4000}]
    },
    { id:'en_gc_ins',   name:'胃鏡＋大腸鏡（部分健保）',   desc:'健保給付規定：胃鏡與大腸鏡同日檢查只給付其中一項。自費之項目與相關之處置皆需要自費', basePrice:1600,
      layer2:[
        {id:'en_gi_s',  name:'標準胃鏡 (直徑約0.9cm) 經口', desc:'使用拋棄式咬口器',                              addPrice:100},
        {id:'en_gi_to', name:'極細胃鏡 (直徑約0.5cm) 經口', desc:'使用拋棄式咬口器',                              addPrice:700},
        {id:'en_gi_tn', name:'極細胃鏡 (直徑約0.5cm) 經鼻', desc:'無其他耗材',                                    addPrice:600},
        {id:'en_gi_hp', name:'加驗幽門桿菌',               desc:'快速尿素測試 NT$300 ＋ 拋棄式切片鉗 NT$1,000',    addPrice:1300},
        {id:'en_gi_j',  name:'日本製造代餐與清腸藥物', desc:'拋棄式檢查褲 ＋ 大腸鏡二氧化碳充氣', addPrice:1500},
        {id:'en_gi_t',  name:'台灣製造代餐與清腸藥物', desc:'拋棄式檢查褲 ＋ 大腸鏡二氧化碳充氣', addPrice:1200}
      ],
      layer3:[{id:'en_gi_w',name:'清醒',addPrice:0},{id:'en_gi_l',name:'輕中度鎮靜',addPrice:4500},{id:'en_gi_a',name:'麻醉',addPrice:6500}]
    },
    { id:'en_gc_self',  name:'胃鏡＋大腸鏡（完全自費）',   desc:'完全自費表示完全不留健保紀錄，但是內視鏡檢查過程中相關處置及茈材皆需要自費', basePrice:4100,
      layer2:[
        {id:'en_gs_s',  name:'標準胃鏡 (直徑約0.9cm) 經口', desc:'使用拋棄式咬口器',                              addPrice:100},
        {id:'en_gs_to', name:'極細胃鏡 (直徑約0.5cm) 經口', desc:'使用拋棄式咬口器',                              addPrice:700},
        {id:'en_gs_tn', name:'極細胃鏡 (直徑約0.5cm) 經鼻', desc:'無其他耗材',                                    addPrice:600},
        {id:'en_gs_hp', name:'加驗幽門桿菌',               desc:'快速尿素測試 NT$300 ＋ 拋棄式切片鉗 NT$1,000',    addPrice:1300},
        {id:'en_gs_j',  name:'日本製造代餐與清腸藥物', desc:'拋棄式檢查褲 ＋ 大腸鏡二氧化碳充氣', addPrice:1500},
        {id:'en_gs_t',  name:'台灣製造代餐與清腸藥物', desc:'拋棄式檢查褲 ＋ 大腸鏡二氧化碳充氣', addPrice:1200}
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
    {id:'en_sp_g',    name:'胃鏡',                          desc:'',                                          price:1600},
    {id:'en_sp_ghp',  name:'胃鏡 + 驗幽門桿菌',             desc:'快速尿素測試及拋棄式切片鉗',               price:2900},
    {id:'en_sp_gb',   name:'胃鏡 + 切片',                   desc:'使用拋棄式切片鉗，不含病理檢查',           price:2600},
    {id:'en_sp_gp',   name:'胃鏡 + 瘜肉切除術',             desc:'使用拋棄式切除環，不含病理檢查',           price:7000},
    {id:'en_sp_c',    name:'大腸鏡',                          desc:'',                                          price:2500},
    {id:'en_sp_cb',   name:'大腸鏡 + 切片',                   desc:'使用拋棄式切片鉗，不含病理檢查',           price:3500},
    {id:'en_sp_cp1',  name:'大腸鏡 + 瘜肉切除術(1-3個)',      desc:'使用拋棄式切除環，不含病理檢查',           price:5000},
    {id:'en_sp_cp2',  name:'大腸鏡 + 瘜肉切除術(4-9個)',      desc:'使用拋棄式切除環，不含病理檢查',           price:6000},
    {id:'en_sp_cp3',  name:'大腸鏡 + 瘜肉切除術(>10個)',      desc:'使用拋棄式切除環，不含病理檢查',           price:8500},
    /* 耗材：視臨床需要使用，以件數計價（qty:true） */
    {id:'en_sp_path',    name:'病理檢查費',        desc:'每一項檢體',              price:2000, qty:true},
    {id:'en_sp_forceps', name:'切片鉗',            desc:'拋棄式，每支',            price:1000, qty:true},
    {id:'en_sp_snare',   name:'切除環',            desc:'拋棄式，每個',            price:1000, qty:true},
    {id:'en_sp_clip',    name:'止血夾',            desc:'每支',                    price:1000, qty:true},
    {id:'en_sp_needle',  name:'注射針 + 止血藥物', desc:'每組',                    price:1500, qty:true},
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

/* ─ 內視鏡折扣條件用的輔助判斷 ─────────────────────────────────────
   購物車 id 規則：L1 為鏡種本身（en_gastro、en_sp_gb…），
   L2／L3 為「L1id|子項id」。鎮靜層結尾為 _w（清醒）／_l（輕中度）／_a（麻醉）。
   原本的條件寫在 en1～en6 這些已不存在的舊編號上，永遠不會成立。 */
const SED_AWAKE = /_w$/, SED_DEEP = /_(l|a)$/;
/* 只計「分別選取」的胃鏡與大腸鏡。組合鏡（en_gc_ins／en_gc_self）的鎮靜費本身
   已是同日合併價（例：麻醉 6,500 對比分開 4,000＋4,000），不再疊加同日折扣。 */
function endoSubIds(c, kind){
  const re = kind==='gastro' ? /^(en_gastro|en_sp_g)\|/ : /^(en_colon|en_sp_c)\|/;
  return c.filter(i=>re.test(i.id)).map(i=>i.id.split('|')[1]);
}
function hasSedatedGastro(c){ return endoSubIds(c,'gastro').some(s=>SED_DEEP.test(s)&&/^(en_g|sp_g)/.test(s)); }
function hasSedatedColon(c){  return endoSubIds(c,'colon').some(s=>SED_DEEP.test(s)&&/^(en_c|sp_c)/.test(s)); }
function hasAwakeGastro(c){   return endoSubIds(c,'gastro').some(s=>SED_AWAKE.test(s)&&/^(en_g|sp_g)/.test(s)); }
function hasAwakeColon(c){    return endoSubIds(c,'colon').some(s=>SED_AWAKE.test(s)&&/^(en_c|sp_c)/.test(s)); }
/* 胃鏡類 L1（含組合鏡與自費胃鏡系列） */
function hasAnyGastro(c){
  return c.some(i=>/^(en_gastro|en_gc_ins|en_gc_self|en_sp_g)/.test(i.id));
}
/* 幽門桿菌：L2 加選（…|*_hp）或自費「胃鏡 + 驗幽門桿菌」套組 */
function hasHpTest(c){
  return c.some(i=>/_hp$/.test(i.id)||i.id==='en_sp_ghp');
}
/* 點滴項目 id 為 dr1～dr6 */
function dripCount(c){ return c.filter(i=>/^dr\d+$/.test(i.id)).length; }

const DISCOUNT_RULES = [
  { id:'disc-endo-1', name:'舒眠胃＋大腸鏡同日套組', note:'同日無痛胃鏡與無痛大腸鏡',
    check:c=>hasSedatedGastro(c)&&hasSedatedColon(c) },
  { id:'disc-endo-2', name:'一般胃＋大腸鏡同日優惠', note:'同日一般胃鏡與一般大腸鏡',
    check:c=>hasAwakeGastro(c)&&hasAwakeColon(c) },
  { id:'disc-hp', name:'胃鏡加做 HP 快速檢測優惠', note:'任何胃鏡搭配幽門桿菌快速尿素酶',
    check:c=>hasAnyGastro(c)&&hasHpTest(c) },
  { id:'disc-drip-2', name:'雙選點滴療程優惠', note:'任選兩項（含）以上點滴',
    check:c=>dripCount(c)>=2 },
  { id:'disc-drip-3', name:'三選點滴療程優惠', note:'任選三項（含）以上點滴',
    check:c=>dripCount(c)>=3 },
  // 超音波複選優惠 (取最優一組，不疊加)
  { id:'disc-us-2', name:'雙項超音波優惠', note:'複選任意2項超音波',
    check:c=>c.filter(i=>['ex1','ex2','ex3'].includes(i.id)&&i.mode!=='ins').length>=2 },
  { id:'disc-us-3', name:'三項超音波優惠', note:'複選三項超音波',
    check:c=>c.filter(i=>['ex1','ex2','ex3'].includes(i.id)&&i.mode!=='ins').length===3 },
  { id:'disc-hc-cv', name:'心血管評估＋頸動脈超音波合選優惠', note:'健檢 ① 與 ② 一起選',
    check:c=>c.some(i=>i.id==='hc_m1'&&i.mode!=='ins')&&c.some(i=>(i.id==='hc_m2'||i.id==='ex3')&&i.mode!=='ins') },
].map(r=>Object.assign(r,{discount:DISCOUNT_AMOUNTS[r.id]||0}));

/* ═══════════════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════════════ */
let cart = [];
let currentCat = null;
let dismissedDiscounts = new Set();
var manualDiscountOverride = null;
var spL1=null; /* 自費內視鏡展開狀態 */
let kbIndex = -1;
let endoDepth=0, endoL1=null, endoL2=null;

/* ═══════════════════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════════════════ */
function fmtPrice(p){ return Number(p).toLocaleString('zh-TW'); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function nl2br(s){ return esc(s).replace(/\n/g,'<br>'); }
function nl2list(s){
  return s.split('\n').map(l=>`<div class="tooltip-line"><span class="tooltip-bullet">•</span><span>${esc(l.trim())}</span></div>`).join('');
}

/* 名稱中的規格括號（(直徑約0.9cm)、(1-3個)、(>10個)…）：
   縮小字級並整段不斷行，避免斷在「0.9c／m」這種語意不完整的位置。 */
function nmSpec(name){
  return esc(name).replace(/[（(][^（()）]*[）)]/g, function(m){
    return '<span class="nm-spec">'+m+'</span>';
  });
}
/* 內視鏡第二層名稱：前 4 字獨立一行；含規格括號者，其餘整段縮小且不斷行，
   讓「(直徑約0.9cm) 經口」維持在同一行，語意不被拆開。
   無規格括號者維持原本排版不變。 */
function endoL2NameHtml(name){
  var head = name.length>4 ? esc(name.slice(0,4))+'<br>' : '';
  var tail = name.length>4 ? name.slice(4) : name;
  if(/[（(]/.test(tail))
    return '<div class="item-name nm-flow">'+head+'<span class="nm-spec">'+esc(tail.trim())+'</span></div>';
  return '<div class="item-name">'+head+esc(tail)+'</div>';
}
/* 自費內視鏡第一層名稱：規格括號不斷行（如 瘜肉切除術(1-3個)） */
function spNameHtml(name){
  if(/[（(]/.test(name))
    return '<div class="item-name nm-flow">'+nmSpec(name)+'</div>';
  return '<div class="item-name">'+esc(name)+'</div>';
}

/* Toast：可帶一個動作按鈕（例如「復原」），有動作時顯示時間拉長 */
function showToast(msg, actionLabel, actionFn){
  const t   = QD.getElementById('toast');
  const m   = QD.getElementById('toastMsg');
  const btn = QD.getElementById('toastAction');
  m.textContent = msg;
  clearTimeout(t._t);
  if(actionLabel && typeof actionFn === 'function'){
    btn.textContent = actionLabel;
    btn.classList.remove('hidden');
    t.classList.add('has-action');
    btn.onclick = ()=>{
      btn.onclick = null;
      t.classList.remove('show','has-action');
      btn.classList.add('hidden');
      clearTimeout(t._t);
      actionFn();
    };
    t.classList.add('show');
    t._t = setTimeout(()=>{ t.classList.remove('show','has-action'); btn.classList.add('hidden'); btn.onclick=null; }, 6000);
  } else {
    btn.classList.add('hidden'); btn.onclick=null;
    t.classList.remove('has-action');
    t.classList.add('show');
    t._t = setTimeout(()=>t.classList.remove('show'), 1500);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   TOOLTIP
   ═══════════════════════════════════════════════════════════════════ */
const tooltipEl = QD.getElementById('tooltipPopup');
let tooltipTimer = null;
let mouseX = 0, mouseY = 0;

QD.addEventListener('mousemove', e=>{ mouseX=e.clientX; mouseY=e.clientY; positionTooltip(); });

QD.addEventListener('mouseover', e=>{
  const card = e.target.closest('.item-card[data-id]');
  if(!card) return;
  const notes = ITEM_NOTES[card.dataset.id];
  const rdesc = ITEM_DESCS[card.dataset.id];
  if(!notes && !rdesc) return;
  clearTimeout(tooltipTimer);
  tooltipTimer = setTimeout(()=>{
    if(notes){
      tooltipEl.innerHTML = `<div class="tooltip-title">包含項目</div>${nl2list(notes)}`;
    } else {
      tooltipEl.innerHTML = `<div class="tooltip-title">備註</div>`
        + `<div style="line-height:1.8;word-break:keep-all;overflow-wrap:break-word">${esc(rdesc)}</div>`;
    }
    tooltipEl.classList.add('visible');
    positionTooltip();
  }, 1500);
});

QD.addEventListener('mouseout', e=>{
  const card = e.target.closest('.item-card[data-id]');
  if(!card) return;
  clearTimeout(tooltipTimer);
  tooltipEl.classList.remove('visible');
});

function positionTooltip(){
  if(!tooltipEl.classList.contains('visible')) return;
  const tw=tooltipEl.offsetWidth||240, th=tooltipEl.offsetHeight||120;
  const vw=window.innerWidth,   vh=window.innerHeight;
  let left=mouseX+18, top=mouseY+14;
  if(left+tw>vw-8) left=mouseX-tw-18;
  if(top+th>vh-8)  top=mouseY-th-14;
  tooltipEl.style.left=left+'px';
  tooltipEl.style.top=top+'px';
}

/* ═══════════════════════════════════════════════════════════════════
   SEARCH
   ═══════════════════════════════════════════════════════════════════ */
const searchInput   = QD.getElementById('searchInput');
const searchResults = QD.getElementById('searchResults');
const searchIcon    = QD.getElementById('searchIcon');
const searchClear   = QD.getElementById('searchClear');

/* .screen 帶有 transform，會成為 fixed 子元素的定位基準，
   因此把下拉選單移到 body 底下，確保永遠對齊視窗且不被裁切。 */
QB.appendChild(searchResults);

searchInput.addEventListener('input', ()=>{
  const q = searchInput.value.trim();
  if(!q){ closeSearch(); return; }
  searchIcon.classList.add('hidden');
  searchClear.classList.add('visible');
  runSearch(q);
});

// Keyboard navigation: ↑↓ to move, Enter to select, Esc to close
searchInput.addEventListener('keydown', e=>{
  const items = QD.querySelectorAll('#searchResults .search-result-item');
  if(!searchResults.classList.contains('open') || items.length===0){
    if(e.key==='Escape') closeSearch();
    return;
  }
  if(e.key==='ArrowDown'){
    e.preventDefault();
    kbIndex = Math.min(kbIndex+1, items.length-1);
    updateKbActive(items);
  } else if(e.key==='ArrowUp'){
    e.preventDefault();
    kbIndex = Math.max(kbIndex-1, -1);
    updateKbActive(items);
  } else if(e.key==='Enter'){
    e.preventDefault();
    const target = kbIndex>=0 ? items[kbIndex] : items[0];
    if(target) target.click();
  } else if(e.key==='Escape'){
    closeSearch();
  }
});

function updateKbActive(items){
  items.forEach((el,i)=>{
    el.classList.toggle('kb-active', i===kbIndex);
    if(i===kbIndex) el.scrollIntoView({block:'nearest'});
  });
}

searchClear.addEventListener('click', ()=>{
  searchInput.value=''; closeSearch();
  searchInput.focus();
});

QD.addEventListener('click', e=>{
  if(!e.target.closest('.search-box') && !e.target.closest('.search-results')) closeSearch();
});

function closeSearch(){
  searchResults.classList.remove('open');
  searchIcon.classList.remove('hidden');
  searchClear.classList.remove('visible');

}

/* 搜尋結果點選直接加入清單 */
function addItemFromSearch(catId, itemId){
  const cat  = CATEGORIES.find(c=>c.id===catId);
  if(!cat) return;
  const item = cat.items.find(i=>i.id===itemId);
  if(!item || item.type==='section') return;
  const inCart = cart.findIndex(c=>c.id===item.id);
  if(inCart !== -1){
    showToast(`「${item.name}」已在費用清單中`);
  } else {
    if(HC_RADIO.has(item.id)) cart = cart.filter(c=>!HC_RADIO.has(c.id));
    cart.push(Object.assign({id:item.id, name:item.name, catLabel:cat.label,
               price:item.price, mode:'self', priceEdited:false}, item.extPay?{extPay:item.extPay}:{}));
    showToast(`✓ 已加入（自費）：${item.name}`);
  }
  renderCart();
  if(currentCat) buildItemsGrid(currentCat);
}

function runSearch(q){
  kbIndex = -1;
  const ql = q.toLowerCase();
  const hits = [];

  /* 一般分類項目：可直接加入清單 */
  CATEGORIES.forEach(cat=>{
    if(cat.id==='endo') return; /* 內視鏡另行處理（多層選項） */
    cat.items.forEach(item=>{
      if(item.type==='section') return;
      const haystack = (item.name+' '+item.desc+' '+(ITEM_NOTES[item.id]||'')).toLowerCase();
      if(haystack.includes(ql)){
        hits.push({ catId:cat.id, catLabel:cat.label, item, nav:false });
      }
    });
  });

  /* 內視鏡：因需逐層選擇鏡種／代餐／鎮靜，搜尋結果導向該分類而非直接加入 */
  const endoLabel = (CATEGORIES.find(c=>c.id==='endo')||{}).label || '內視鏡';
  const endoPool = [
    ...ENDO_TREE.layer1.map(i=>({id:i.id,name:i.name,desc:i.desc||'',price:i.basePrice})),
    ...ENDO_TREE.special.map(i=>({id:i.id,name:i.name,desc:i.desc||'',price:i.price})),
    ...ENDO_TREE.selfPay.map(i=>({id:i.id,name:i.name,desc:i.desc||'',price:i.price}))
  ];
  endoPool.forEach(item=>{
    if((item.name+' '+item.desc).toLowerCase().includes(ql)){
      hits.push({ catId:'endo', catLabel:endoLabel, item, nav:true });
    }
  });

  searchResults.innerHTML='';
  if(hits.length===0){
    searchResults.innerHTML=`<div class="search-empty">找不到「${esc(q)}」相關項目</div>`;
  } else {
    hits.forEach(h=>{
      const div=document.createElement('div');
      div.className='search-result-item';
      const priceStr = h.item.price>0
        ? (h.nav && h.catId==='endo' && ENDO_TREE.layer1.some(l=>l.id===h.item.id)
            ? `NT$ ${fmtPrice(h.item.price)} 起`
            : `NT$ ${fmtPrice(h.item.price)}`)
        : '待建檔';
      const descFirst = (h.item.desc||'').split('\n')[0];
      div.innerHTML=`
        <span class="sr-cat-badge">${esc(h.catLabel)}</span>
        <span class="sr-name">${esc(h.item.name)}</span>
        <span class="sr-desc">${esc(h.nav ? (descFirst||'前往內視鏡選單完成選擇') : descFirst)}</span>
        <span class="sr-price">${esc(priceStr)}</span>
      `;
      div.addEventListener('click',()=>{
        closeSearch();
        searchInput.value='';
        if(h.nav){ openCategory(h.catId); showToast(`請於選單中完成「${h.item.name}」的選項`); }
        else     { addItemFromSearch(h.catId, h.item.id); }
      });
      searchResults.appendChild(div);
    });
  }
  searchResults.classList.add('open');
  positionSearchResults();

}

/* 下拉選單使用 fixed 定位，不會被捲動容器裁切 */
function positionSearchResults(){
  const box = QD.querySelector('.search-box');
  if(!box) return;
  const r  = box.getBoundingClientRect();
  const sr = QD.getElementById('searchResults');
  sr.style.left  = r.left + 'px';
  sr.style.width = r.width + 'px';
  sr.style.top   = (r.bottom + 6) + 'px';
  sr.style.maxHeight = Math.max(120, Math.min(360, window.innerHeight - r.bottom - 20)) + 'px';
}

function navigateToItem(catId, itemId){
  openCategory(catId);
  setTimeout(()=>{
    const card=QD.querySelector(`.item-card[data-id="${itemId}"]`);
    if(card){
      card.scrollIntoView({behavior:'smooth',block:'center'});
      card.classList.add('highlight-flash');
      setTimeout(()=>card.classList.remove('highlight-flash'),2000);
    }
  },350);
}

/* ─ 自訂新增項目卡片 ─────────────────────────────────────────────── */
var _customCount=0;
/* 計數器每次載入歸零，若還原了含 custom_1 的清單會撞號（刪一個會刪掉兩個），
   因此發號前先確認該 id 不在清單中。 */
function nextCustomId(){
  var n=_customCount, id;
  do { id='custom_'+(++n); } while(cart.some(function(x){return x.id===id;}));
  _customCount=n;
  return id;
}
function appendCustomAddCard(grid,catLabel){
  var card=document.createElement('div');
  card.className='item-card custom-add-card';
  card.innerHTML='<div style="font-size:26px;color:var(--accent)">＋</div>'
    +'<div style="font-size:14px;font-weight:600;color:var(--accent)">新增自訂項目</div>';
  card.addEventListener('click',function(e){
    if(card.querySelector('.custom-add-input')) return; /* 已在編輯中，忽略 */
    card.className='item-card'; card.style.cursor='default';
    card.innerHTML='<div class="custom-add-form" style="width:100%">'
      +'<span class="custom-add-label">項目名稱</span>'
      +'<input class="custom-add-input" type="text" autocomplete="off">'
      +'<span class="custom-add-label">金額（元）</span>'
      +'<input class="custom-add-input" type="number" min="0">'
      +'<div class="custom-add-btn-row">'
      +'<button class="custom-add-confirm">確認加入</button>'
      +'<button class="custom-add-cancel-btn">取消</button>'
      +'</div></div>'; /* /custom-add-form */
    var nameEl=card.querySelector('input[type="text"]');
    var priceEl=card.querySelector('input[type="number"]');
    /* 阻止 form 內所有點擊往上冒泡觸發 card click */
    card.querySelector('.custom-add-form').addEventListener('click',function(ev){ev.stopPropagation();});
    nameEl.focus();
    card.querySelector('.custom-add-confirm').addEventListener('click',function(){
      var name=nameEl.value.trim();
      if(!name){nameEl.focus();return;}
      var price=Math.max(0,parseInt(priceEl.value)||0);
      var id=nextCustomId();
      cart.push({id:id,name:name,catLabel:catLabel,price:price,mode:'self',priceEdited:false});
      renderCart(); if(currentCat) buildItemsGrid(currentCat);
      showToast('✓ 已加入：'+name);
    });
    card.querySelector('.custom-add-cancel-btn').addEventListener('click',function(){
      if(currentCat) buildItemsGrid(currentCat);
    });
    nameEl.addEventListener('keydown',function(e){if(e.key==='Enter')priceEl.focus();});
    priceEl.addEventListener('keydown',function(e){if(e.key==='Enter')card.querySelector('.custom-add-confirm').click();});
  });
  grid.appendChild(card);
}

/* ═══════════════════════════════════════════════════════════════════
   BUILD HOME
   ═══════════════════════════════════════════════════════════════════ */
function buildHome(){
  const grid=QD.getElementById('catGrid');
  grid.innerHTML='';
  CATEGORIES.forEach(cat=>{
    const card=document.createElement('div');
    card.className='cat-card';
    card.innerHTML=`
      <div class="cat-icon">${ICONS[cat.id]}</div>
      <div class="cat-label">${cat.label}</div>
      <div class="cat-count-badge">${cat.id==='endo'?(ENDO_TREE.layer1.length+ENDO_TREE.special.length+ENDO_TREE.selfPay.length):cat.items.filter(i=>!i.type).length} 項</div>
    `;
    card.addEventListener('click',()=>openCategory(cat.id));
    grid.appendChild(card);
  });
  applyCardA11y();
}

/* ═══════════════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════════════ */

function openCategory(catId){
  const cat=CATEGORIES.find(c=>c.id===catId);
  if(!cat) return;
  currentCat=cat;
  if(cat.id==='endo'){endoDepth=0;endoL1=null;endoL2=null;}
  QD.getElementById('catIconEl').innerHTML=ICONS[cat.id]||'';
  QD.getElementById('catTitleEl').textContent=cat.label;
  QD.getElementById('catDescEl').textContent=cat.desc;
  /* 換分類時清掉上一個分類的篩選字；內視鏡為逐層選單，不提供篩選 */
  resetCatFilter();
  const cf=QD.getElementById('catFilter');
  if(cf) cf.classList.toggle('hidden', cat.id==='endo');
  buildItemsGrid(cat);
  const home=QD.getElementById('screen-home');
  const catScreen=QD.getElementById('screen-category');
  home.classList.remove('active'); home.classList.add('exit');
  setTimeout(()=>home.classList.remove('exit'),320);
  catScreen.classList.add('active');
}

function goHome(){
  QD.getElementById('screen-category').classList.remove('active');
  QD.getElementById('screen-doc').classList.remove('active');
  QB.classList.remove('doc-max');
  document.body.classList.remove('q-max');
  currentDoc=null;
  QD.getElementById('screen-home').classList.add('active');
  currentCat=null;
}
QD.getElementById('backBtn').addEventListener('click',goHome);

/* ═══════════════════════════════════════════════════════════════════
   分類內即時篩選（檢驗有 300 多項，只靠滑動找太慢）
   內視鏡是逐層選單，不套用篩選。
   ═══════════════════════════════════════════════════════════════════ */
let catFilter='';

function matchesCatFilter(item){
  if(!catFilter) return true;
  const q=catFilter.toLowerCase();
  return (item.name+' '+(item.desc||'')+' '+(ITEM_NOTES[item.id]||'')+' '+(ITEM_DESCS[item.id]||''))
         .toLowerCase().includes(q);
}

function updateFilterCount(shown){
  const el=QD.getElementById('catFilterCount');
  if(!el) return;
  el.textContent = catFilter ? shown+' 項' : '';
}

function setCatFilter(v){
  catFilter=v.trim();
  const clr=QD.getElementById('catFilterClear');
  if(clr) clr.classList.toggle('visible', !!catFilter);
  if(currentCat) buildItemsGrid(currentCat);
  const sc=QD.querySelector('.items-scroll');
  if(sc) sc.scrollTop=0;
}

function resetCatFilter(){
  const inp=QD.getElementById('catFilterInput');
  if(inp) inp.value='';
  catFilter='';
  const clr=QD.getElementById('catFilterClear');
  if(clr) clr.classList.remove('visible');
  updateFilterCount(0);
}

(function initCatFilter(){
  const inp=QD.getElementById('catFilterInput');
  const clr=QD.getElementById('catFilterClear');
  if(!inp) return;
  inp.addEventListener('input',()=>setCatFilter(inp.value));
  inp.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      e.stopPropagation();               /* 先清篩選，不要直接跳回選單 */
      if(catFilter){ resetCatFilter(); if(currentCat) buildItemsGrid(currentCat); }
      else inp.blur();
    }
  });
  if(clr) clr.addEventListener('click',()=>{
    resetCatFilter();
    if(currentCat) buildItemsGrid(currentCat);
    inp.focus();
  });
})();

/* ═══════════════════════════════════════════════════════════════════
   BUILD ITEMS GRID
   ═══════════════════════════════════════════════════════════════════ */
function buildItemsGrid(cat){
  if(cat.id==='endo'){buildEndoGrid();return;}
  const grid=QD.getElementById('itemsGrid');
  grid.innerHTML='';

  /* 篩選中：先算出哪些分段還有項目，空分段不顯示標題 */
  const filtering=!!catFilter;
  const sectionHas={};
  if(filtering){
    let cur=null;
    cat.items.forEach(it=>{
      if(it.type==='section'){ cur=it.id; if(!(cur in sectionHas)) sectionHas[cur]=false; return; }
      if(cur&&matchesCatFilter(it)) sectionHas[cur]=true;
    });
  }
  let shown=0;

  /* 點滴：第一順位（篩選中不顯示自訂新增卡） */
  if(cat.id==='drip'&&!filtering) appendCustomAddCard(grid,cat.label);
  cat.items.forEach(item=>{
    if(item.type==='section'){
      if(filtering&&!sectionHas[item.id]) return;
      /* 檢驗：在「一般生化檢查」之前插入（= 檢驗套組最後一位） */
      if(cat.id==='lab'&&item.id==='lb_s0'&&!filtering) appendCustomAddCard(grid,cat.label);
      const hdr=document.createElement('div');
      hdr.className='items-section-header';
      hdr.textContent=item.name;
      grid.appendChild(hdr);
      return;
    }
    if(filtering&&!matchesCatFilter(item)) return;
    shown++;
    const inCart=cart.find(c=>c.id===item.id);
    const mode=inCart?inCart.mode:'self';
    const sel=!!inCart, isIns=sel&&mode==='ins';
    const hasNotes=!!ITEM_NOTES[item.id];

    const card=document.createElement('div');
    card.className='item-card'+(isIns?' ins-mode':sel?' selected':'');
    card.dataset.id=item.id;

    let priceHtml;
    if(isIns) priceHtml=`<span class="price-val ins-price">免自費</span>`;
    else if(item.price>0) priceHtml=`<span class="price-currency">NT$</span><span class="price-val">${fmtPrice(item.price)}</span>`;
    else priceHtml=`<span class="price-val tbd">待建檔</span>`;

    const descHtml = nl2br(item.desc||'');

    card.innerHTML=`
      <div class="mode-badge ${isIns?'ins':'self'}">${isIns?'免自費':'自費'}</div>
      <div class="item-name">${esc(item.name).replace(/\n/g,'<br>').replace(' + ','<br>+ ')}</div>
      <div class="item-desc">${descHtml}</div>
      <div class="item-price-row">${priceHtml}</div>
      ${hasNotes?'<div class="notes-hint">📋 停留 2 秒查看備註</div>':''}
      <div class="check-dot">✓</div>
    `;

    card.addEventListener('click',      e=>{e.preventDefault();toggleItem(item,'self');});
    if(cat.id!=='health-check'&&cat.id!=='drip') card.addEventListener('contextmenu',e=>{e.preventDefault();toggleItem(item,'ins');});
    grid.appendChild(card);
  });
  /* 檢查及處置：其他檢查最後一位（= grid 最末） */
  if(cat.id==='exam'&&!filtering) appendCustomAddCard(grid,cat.label);
  if(filtering&&shown===0){
    const e=document.createElement('div');
    e.className='filter-empty';
    e.innerHTML='找不到「'+esc(catFilter)+'」相關項目<br>請換個關鍵字，或清除篩選';
    grid.appendChild(e);
  }
  updateFilterCount(shown);
  applyCardA11y();
}

/* ═══════════════════════════════════════════════════════════════════
   BUILD ENDO GRID
   ═══════════════════════════════════════════════════════════════════ */
/* ─ 內視鏡主鏡互斥群組 ────────────────────────────────── */
var SCOPE_PFX=['en_gastro','en_colon','en_gc_ins','en_gc_self'];
function isScopeItem(id){return SCOPE_PFX.some(function(p){return id===p||id.startsWith(p+'|');});}
/* 常規內視鏡互斥規則：胃鏡↔大腸鏡可共存，兩者均與胃鏡+大腸鏡(部分健保)互斥 */
var REG_EXCL={
  'en_gastro': ['en_gc_ins'],
  'en_colon':  ['en_gc_ins'],
  'en_gc_ins': ['en_gastro','en_colon'],
};

/* L1 右鍵切換自費/免自費（三層彼此獨立） */
function toggleScopeItem(it,mode){
  var pfx=SCOPE_PFX.find(function(p){return it.id===p||it.id.startsWith(p+'|');});
  var idx=cart.findIndex(function(x){return x.id===it.id;});
  if(idx!==-1){
    /* 已在清單：自費↔免自費互換 */
    if(cart[idx].mode==='ins'){
      cart[idx].mode='self'; cart[idx].price=it._basePrice||it.price;
      showToast('切換為自費：'+it.name);
    } else {
      cart[idx].mode='ins'; cart[idx].price=0;
      showToast('切換為免自費：'+it.name);
    }
  } else {
    /* 未在清單：清除其他鏡種 L1，保留同鏡種 L2+L3，加入免自費 */
    cart=cart.filter(function(x){
      var xp=SCOPE_PFX.find(function(p){return x.id===p||x.id.startsWith(p+'|');});
      return !xp||xp===pfx;
    });
    /* 防重複：再次確保此 L1 不在清單 */
    cart=cart.filter(function(x){return x.id!==it.id;});
    cart.push({id:it.id,name:it.name,catLabel:'內視鏡',price:0,mode:'ins',priceEdited:false,_basePrice:it._basePrice||it.price});
    showToast('✓ 已加入（免自費）：'+it.name);
  }
  renderCart(); if(currentCat) buildItemsGrid(currentCat);
}

/* ─ L2 群組判斷 ─────────────────────────────────────────────────── */
/* 鏡頭類型（三選一）*/
function isScopeTypeL2(l2id){ return l2id.endsWith('_s')||l2id.endsWith('_to')||l2id.endsWith('_tn'); }
/* 幽門桿菌（可額外加選）*/
function isHpL2(l2id){ return l2id.endsWith('_hp'); }
/* 大腸鏡代餐（二選一）*/
function isColonPrepL2(l2id){ return l2id.endsWith('_j')||l2id.endsWith('_t'); }
/* 組合鏡 L1 ID */
var COMBO_L1_IDS=['en_gc_ins','en_gc_self'];

/* 幽門桿菌直接加選/取消（不需選鎮靜層） */
function toggleHpItem(l1obj,l2obj){
  var hpFid=l1obj.id+'|'+l2obj.id;
  var idx=cart.findIndex(function(x){return x.id===hpFid;});
  if(idx!==-1){
    cart.splice(idx,1);
    var l1Idx=cart.findIndex(function(x){return x.id===l1obj.id&&x._autoAdded;});
    if(l1Idx!==-1){
      var hasOtherSubs=cart.some(function(x){return x.id.startsWith(l1obj.id+'|');});
      if(!hasOtherSubs) cart.splice(l1Idx,1);
    }
    showToast('已移除：'+l2obj.name);
  } else {
    if(!cart.find(function(x){return x.id===l1obj.id;})){
      cart.push({id:l1obj.id,name:l1obj.name,catLabel:'內視鏡',
                 price:l1obj.basePrice,mode:'self',priceEdited:false,
                 _autoAdded:true,_basePrice:l1obj.basePrice});
    }
    cart.push({id:hpFid,name:l2obj.name,catLabel:'內視鏡',
               price:l2obj.addPrice,mode:'self',priceEdited:false});
    showToast('✓ 已加入：'+l2obj.name);
  }
  renderCart(); if(currentCat) buildItemsGrid(currentCat);
}

/* 組合鏡代餐直接選取/取消（二選一互斥，不需選鎮靜層） */
function toggleColonPrepItem(l1obj,l2obj){
  var cpFid=l1obj.id+'|'+l2obj.id;
  var idx=cart.findIndex(function(x){return x.id===cpFid;});
  if(idx!==-1){
    cart.splice(idx,1);
    var l1Idx=cart.findIndex(function(x){return x.id===l1obj.id&&x._autoAdded;});
    if(l1Idx!==-1){
      var hasOtherSubs=cart.some(function(x){return x.id.startsWith(l1obj.id+'|');});
      if(!hasOtherSubs) cart.splice(l1Idx,1);
    }
    showToast('已移除：'+l2obj.name);
  } else {
    /* 清除同 L1 下其他代餐選項（二選一互斥） */
    cart=cart.filter(function(x){
      if(!x.id.startsWith(l1obj.id+'|')) return true;
      var xL2id=x.id.split('|')[1];
      return !isColonPrepL2(xL2id);
    });
    if(!cart.find(function(x){return x.id===l1obj.id;})){
      cart.push({id:l1obj.id,name:l1obj.name,catLabel:'內視鏡',
                 price:l1obj.basePrice,mode:'self',priceEdited:false,
                 _autoAdded:true,_basePrice:l1obj.basePrice});
    }
    cart.push({id:cpFid,name:l2obj.name,catLabel:'內視鏡',
               price:l2obj.addPrice,mode:'self',priceEdited:false});
    showToast('✓ 已加入：'+l2obj.name);
  }
  renderCart(); if(currentCat) buildItemsGrid(currentCat);
}

/* 鏡頭類型直接切換（三選一互斥） */
function toggleScopeTypeItem(l1obj,l2obj){
  var sfid=l1obj.id+'|'+l2obj.id;
  var idx=cart.findIndex(function(x){return x.id===sfid;});
  if(idx!==-1){
    cart.splice(idx,1);
    var l1Idx=cart.findIndex(function(x){return x.id===l1obj.id&&x._autoAdded;});
    if(l1Idx!==-1){
      var hasOtherSubs=cart.some(function(x){return x.id.startsWith(l1obj.id+'|');});
      if(!hasOtherSubs) cart.splice(l1Idx,1);
    }
    showToast('已移除：'+l2obj.name);
  } else {
    cart=cart.filter(function(x){
      if(!x.id.startsWith(l1obj.id+'|')) return true;
      var xL2id=x.id.split('|')[1];
      return !isScopeTypeL2(xL2id);
    });
    if(!cart.find(function(x){return x.id===l1obj.id;})){
      cart.push({id:l1obj.id,name:l1obj.name,catLabel:'內視鏡',
                 price:l1obj.basePrice,mode:'self',priceEdited:false,
                 _autoAdded:true,_basePrice:l1obj.basePrice});
    }
    cart.push({id:sfid,name:l2obj.name,catLabel:'內視鏡',
               price:l2obj.addPrice,mode:'self',priceEdited:false});
    showToast('✓ 已加入：'+l2obj.name);
  }
  renderCart(); if(currentCat) buildItemsGrid(currentCat);
}

/* 鎨靜/麻醉直接切換（三選一互斥） */
function isSedationL3(l3id){ return l3id.endsWith('_w')||l3id.endsWith('_l')||l3id.endsWith('_a'); }
function toggleSedationItem(l1obj,l3obj){
  var l3fid=l1obj.id+'|'+l3obj.id;
  var idx=cart.findIndex(function(x){return x.id===l3fid;});
  if(idx!==-1){
    cart.splice(idx,1);
    var l1Idx=cart.findIndex(function(x){return x.id===l1obj.id&&x._autoAdded;});
    if(l1Idx!==-1){
      var hasOtherSubs=cart.some(function(x){return x.id.startsWith(l1obj.id+'|');});
      if(!hasOtherSubs) cart.splice(l1Idx,1);
    }
    showToast('已移除：'+l3obj.name);
  } else {
    cart=cart.filter(function(x){
      if(!x.id.startsWith(l1obj.id+'|')) return true;
      var xSubId=x.id.split('|')[1];
      return !isSedationL3(xSubId);
    });
    if(!cart.find(function(x){return x.id===l1obj.id;})){
      cart.push({id:l1obj.id,name:l1obj.name,catLabel:'內視鏡',
                 price:l1obj.basePrice,mode:'self',priceEdited:false,
                 _autoAdded:true,_basePrice:l1obj.basePrice});
    }
    cart.push({id:l3fid,name:l3obj.name,catLabel:'內視鏡',
               price:l3obj.addPrice,mode:'self',priceEdited:false});
    showToast('✓ 已加入：'+l3obj.name);
  }
  renderCart(); if(currentCat) buildItemsGrid(currentCat);
}

/* L3 點選：鎨頭類型及代餐選項加入清單（幽門桿菌不走此路） */
/* 鏡頭類型三選一；幽門桿菌可額外加；代餐二選一；各群組獨立互斥 */
function addL3Item(l1obj,l2obj,l3obj){
  var fid=l1obj.id+'|'+l2obj.id+'|'+l3obj.id;
  var fname=l2obj.name+' / '+l3obj.name;
  var l2l3price=l2obj.addPrice+l3obj.addPrice;
  var existIdx=cart.findIndex(function(x){return x.id===fid;});
  if(existIdx!==-1){
    /* 再點一次：移除；若 L1 是自動加入且無其他子項，一併移除 */
    cart.splice(existIdx,1);
    var l1Idx=cart.findIndex(function(x){return x.id===l1obj.id&&x._autoAdded;});
    if(l1Idx!==-1){
      var hasOtherSubs=cart.some(function(x){return x.id.startsWith(l1obj.id+'|');});
      if(!hasOtherSubs) cart.splice(l1Idx,1);
    }
    showToast('已移除：'+l3obj.name);
  } else {
    /* 清除其他鏡種 */
    cart=cart.filter(function(x){
      var xp=SCOPE_PFX.find(function(p){return x.id===p||x.id.startsWith(p+'|');});
      return !xp||xp===l1obj.id;
    });
    /* 依群組互斥清除同鏡種舊選項；幽門桿菌（HP）永遠保留 */
    var newIsScopeType=isScopeTypeL2(l2obj.id);
    var newIsColonPrep=isColonPrepL2(l2obj.id);
    cart=cart.filter(function(x){
      if(!x.id.startsWith(l1obj.id+'|')) return true;
      var xL2id=x.id.split('|')[1];
      if(isHpL2(xL2id)) return true;          /* HP 永遠保留 */
      if(newIsScopeType) return !isScopeTypeL2(xL2id); /* 鏡頭互斥 */
      if(newIsColonPrep) return !isColonPrepL2(xL2id); /* 代餐互斥 */
      return false;
    });
    /* 自動加入 L1 */
    if(!cart.find(function(x){return x.id===l1obj.id;})){
      cart.push({id:l1obj.id,name:l1obj.name,catLabel:'內視鏡',
                 price:l1obj.basePrice,mode:'self',priceEdited:false,
                 _autoAdded:true,_basePrice:l1obj.basePrice});
    }
    cart.push({id:fid,name:fname,catLabel:'內視鏡',price:l2l3price,mode:'self',priceEdited:false});
    showToast('✓ 已加入（自費）：'+l3obj.name);
  }
  renderCart(); if(currentCat) buildItemsGrid(currentCat);
}

function buildEndoGrid(){
  var grid=QD.getElementById('itemsGrid');
  grid.innerHTML='';

  var h1=document.createElement('div'); h1.className='items-section-header'; h1.textContent='常規內視鏡'; grid.appendChild(h1);
  ENDO_TREE.layer1.forEach(function(l1){
    if(l1.id==='en_gc_self') return; /* 移至自費內視鏡區 */
    var canIns=(l1.id==='en_gastro'||l1.id==='en_colon');
    var isOpen=!!(endoL1&&endoL1.id===l1.id);
    var directIns=canIns?cart.find(function(x){return x.id===l1.id&&x.mode==='ins';}):null;
    var subSelf=cart.find(function(x){return x.id.startsWith(l1.id+'|');});
    var anyInCart=directIns||subSelf; var isIns=!!directIns;
    var l1c=document.createElement('div');
    var l1cls='item-card endo-nav reg-l1';
    if(isIns) l1cls+=' endo-ins';
    else if(isOpen) l1cls+=' endo-open';
    /* 只有互斥的項目才 dimmed */
    var isDimmed=endoL1!==null&&!isOpen&&(REG_EXCL[endoL1.id]||[]).indexOf(l1.id)!==-1;
    if(isDimmed) l1cls+=' endo-dimmed';
    l1c.className=l1cls; l1c.style.position='relative';
    l1c.dataset.id=l1.id;  /* 啟用 hover tooltip */
    var l1price=isIns
      ?'<div class="item-price-row"><span class="price-val" style="color:var(--ins-color);font-size:15px">免自費</span></div>'
      :'<div class="item-price-row"><span class="price-currency">NT$</span><span class="price-val">'+fmtPrice(l1.basePrice)+' 起</span></div>';
    l1c.innerHTML='<div class="mode-badge '+(isIns?'ins':'self')+'">'+(isIns?'免自費':'自費')+'</div>'
      +'<div class="item-name">'+esc(l1.name)+'</div>'
      +l1price
      +'<div class="endo-nav-arrow">'+(isOpen?'▾':'›')+'</div>';
    l1c.onclick=function(){
      if(endoL1&&endoL1.id===l1.id){
        endoL1=null;endoL2=null;
      } else {
        /* 只清除互斥的鏡種（胃鏡↔大腸鏡可共存，兩者均與胃鏡+大腸鏡互斥） */
        (REG_EXCL[l1.id]||[]).forEach(function(xid){
          cart=cart.filter(function(x){return x.id!==xid&&!x.id.startsWith(xid+'|');});
        });
        endoL1=l1;endoL2=null;
      }
      renderCart();buildEndoGrid();
    };
    if(canIns)(function(l){l1c.addEventListener('contextmenu',function(e){
      e.preventDefault(); toggleScopeItem({id:l.id,name:l.name,price:l.basePrice,_basePrice:l.basePrice},'ins');
    });})(l1);
    grid.appendChild(l1c);
    if(isOpen){
      /* ── L2 層：每個按鈕獨立，直接切換加入 ── */
      var l2row=document.createElement('div'); l2row.className='endo-sub-row';
      var l2g=document.createElement('div'); l2g.className='endo-sub-grid';
      l1.layer2.forEach(function(l2){
        var l2c=document.createElement('div'); l2c.style.position='relative';
        if(isHpL2(l2.id)){
          var hpFid=l1.id+'|'+l2.id;
          var hpSel=!!cart.find(function(x){return x.id===hpFid;});
          l2c.className='item-card'+(hpSel?' selected':'');
          l2c.innerHTML='<div class="mode-badge self">自費</div>'
            +'<div class="item-name">'+esc(l2.name)+'</div>'
            +'<div class="item-desc">'+esc(l2.desc||'')+'</div>'
            +'<div class="endo-add-price">+ NT\u00a0'+fmtPrice(l2.addPrice)+'</div>'
            +'<div class="check-dot">✓</div>';
          (function(l1o,l2o){l2c.onclick=function(){toggleHpItem(l1o,l2o);};})(l1,l2);
        } else if(isColonPrepL2(l2.id)){
          var cpFid=l1.id+'|'+l2.id;
          var cpSel=!!cart.find(function(x){return x.id===cpFid;});
          l2c.className='item-card'+(cpSel?' selected':'');
          l2c.innerHTML='<div class="mode-badge self">自費</div>'
            +endoL2NameHtml(l2.name)
            +'<div class="item-desc">'+esc(l2.desc||'')+'</div>'
            +'<div class="endo-add-price">+ NT\u00a0'+fmtPrice(l2.addPrice)+'</div>'
            +'<div class="check-dot">✓</div>';
          (function(l1o,l2o){l2c.onclick=function(){toggleColonPrepItem(l1o,l2o);};})(l1,l2);
        } else {
          var sfid=l1.id+'|'+l2.id;
          var ssel=!!cart.find(function(x){return x.id===sfid;});
          l2c.className='item-card'+(ssel?' selected':'');
          l2c.innerHTML='<div class="mode-badge self">自費</div>'
            +endoL2NameHtml(l2.name)
            +'<div class="item-desc">'+esc(l2.desc||'')+'</div>'
            +'<div class="endo-add-price">+ NT\u00a0'+fmtPrice(l2.addPrice)+'</div>'
            +'<div class="check-dot">✓</div>';
          (function(l1o,l2o){l2c.onclick=function(){toggleScopeTypeItem(l1o,l2o);};})(l1,l2);
        }
        l2g.appendChild(l2c);
      });
      l2row.appendChild(l2g); grid.appendChild(l2row);
      /* ── L3 層：鎨靜/麻醉，永遠顯示，三選一互斥 ── */
      var l3row=document.createElement('div'); l3row.className='endo-sub-row l3';
      var l3g=document.createElement('div'); l3g.className='endo-sub-grid';
      l1.layer3.forEach(function(l3){
        var l3fid=l1.id+'|'+l3.id;
        var l3sel=!!cart.find(function(x){return x.id===l3fid;});
        var l3c=document.createElement('div'); l3c.className='item-card'+(l3sel?' selected':'');
        l3c.innerHTML='<div class="mode-badge self">自費</div>'
          +'<div class="item-name">'+esc(l3.name)+'</div>'
          +'<div class="item-price-row"><span class="price-currency">NT$</span><span class="price-val">'+fmtPrice(l3.addPrice)+'</span></div>'
          +'<div class="check-dot">✓</div>';
        (function(l1o,l3o){l3c.addEventListener('click',function(e){e.preventDefault();toggleSedationItem(l1o,l3o);});})(l1,l3);
        l3g.appendChild(l3c);
      });
      l3row.appendChild(l3g); grid.appendChild(l3row);
    }
  });
  var h2=document.createElement('div'); h2.className='items-section-header'; h2.textContent='其他內視鏡'; grid.appendChild(h2);
  ENDO_TREE.special.forEach(function(sp){
    var ic=cart.find(function(x){return x.id===sp.id;});
    var isIns=ic&&ic.mode==='ins', sel=!!ic;
    var sc=document.createElement('div'); sc.className='item-card'+(isIns?' ins-mode':sel?' selected':''); sc.dataset.id=sp.id;
    sc.innerHTML='<div class="mode-badge '+(isIns?'ins':'self')+'">'+(isIns?'免自費':'自費')+'</div>'
      +'<div class="item-name">'+esc(sp.name).replace(/^([A-Z]+) /,'$1<br>')+'</div><div class="item-desc">'+esc(sp.desc)+'</div>'
      +'<div class="item-price-row"><span class="price-currency">NT$</span><span class="price-val">'+fmtPrice(sp.price)+'</span></div>'
      +'<div class="check-dot">✓</div>';
    (function(it){sc.addEventListener('click',function(e){e.preventDefault();toggleItem(it,'self');});
     sc.addEventListener('contextmenu',function(e){e.preventDefault();toggleItem(it,'ins');});})(
      {id:sp.id,name:sp.name,price:sp.price});
    grid.appendChild(sc);
  });
  appendCustomAddCard(grid,'內視鏡');
  /* 第三類：自費內視鏡（純自費，有三層選單） */
  var h3=document.createElement('div'); h3.className='items-section-header'; h3.textContent='自費內視鏡'; grid.appendChild(h3);

  /* ── 自費胃鏡群組 ── */
  var spGastro=ENDO_TREE.selfPay.filter(function(sp){return sp.name.startsWith('胃鏡');});
  var gcSelf=ENDO_TREE.layer1.find(function(l){return l.id==='en_gc_self';}); /* 移至此區 */
  spGastro.forEach(function(sp){
    renderSpItem(grid,sp,SP_GASTRO_SCOPE,SP_GASTRO_SED);
  });
  /* 胃鏡+大腸鏡(完全自費)：沿用常規三層選單，置於胃鏡列最後 */
  if(gcSelf){
    var gcOpen=!!(endoL1&&endoL1.id==='en_gc_self');
    var gcSub=cart.find(function(x){return x.id.startsWith('en_gc_self|');});
    var gcDimmed=!gcSub&&!gcOpen&&(
      SP_GASTRO_GROUP.some(function(g){return g!=='en_gc_self'&&cart.find(function(x){return x.id===g;});})||
      SP_COLON_GROUP.some(function(c){return c!=='en_gc_self'&&cart.find(function(x){return x.id===c;});})
    );
    var gc=document.createElement('div');
    gc.className='item-card endo-nav sp-card'+(gcOpen?' endo-open':gcSub?' selected':gcDimmed?' endo-dimmed':'');
    gc.dataset.id='en_gc_self'; /* 啟用 hover tooltip */
    gc.innerHTML='<div class="mode-badge self">自費</div>'
      +'<div class="item-name">'+esc(gcSelf.name)+'</div>'
      +'<div class="item-price-row"><span class="price-currency">NT$</span><span class="price-val">'+fmtPrice(gcSelf.basePrice)+' 起</span></div>'
      +'<div class="endo-nav-arrow">'+(gcOpen?'▾':'›')+'</div>';
    gc.onclick=function(){
      if(endoL1&&endoL1.id==='en_gc_self'){
        endoL1=null;endoL2=null;
        renderCart();buildEndoGrid();
        return;
      }
      switchSpGroup(function(){
        cart=cart.filter(function(x){return !x.id.startsWith('en_gc_self|')&&x.id!=='en_gc_self';});
        endoL1=gcSelf;endoL2=null;
      },'en_gc_self');
    };
    grid.appendChild(gc);
    if(gcOpen){
      var gcL2row=document.createElement('div'); gcL2row.className='endo-sub-row';
      var gcL2g=document.createElement('div'); gcL2g.className='endo-sub-grid';
      gcSelf.layer2.forEach(function(l2){
        var fid='en_gc_self|'+l2.id;
        var sel2=!!cart.find(function(x){return x.id===fid;});
        var l2c=document.createElement('div'); l2c.className='item-card'+(sel2?' selected':'');
        l2c.dataset.id=fid;  /* 啟用 hover 備註 */
        /* 屬自費內視鏡區：說明文字改置於備註 */
        l2c.innerHTML='<div class="mode-badge self">自費</div>'
          +endoL2NameHtml(l2.name)
          +'<div class="endo-add-price">+ NT '+fmtPrice(l2.addPrice)+'</div>'
          +'<div class="check-dot">✓</div>';
        (function(l1o,l2o){l2c.onclick=function(){
          if(l2o.id.endsWith('_hp')) toggleHpItem(l1o,l2o);
          else if(l2o.id.endsWith('_j')||l2o.id.endsWith('_t')) toggleColonPrepItem(l1o,l2o);
          else toggleScopeTypeItem(l1o,l2o);
        };})(gcSelf,l2);
        gcL2g.appendChild(l2c);
      });
      gcL2row.appendChild(gcL2g); grid.appendChild(gcL2row);
      var gcL3row=document.createElement('div'); gcL3row.className='endo-sub-row l3';
      var gcL3g=document.createElement('div'); gcL3g.className='endo-sub-grid';
      gcSelf.layer3.forEach(function(l3){
        var l3fid='en_gc_self|'+l3.id;
        var l3sel=!!cart.find(function(x){return x.id===l3fid;});
        var l3c=document.createElement('div'); l3c.className='item-card'+(l3sel?' selected':'');
        l3c.innerHTML='<div class="mode-badge self">自費</div>'
          +'<div class="item-name">'+esc(l3.name)+'</div>'
          +'<div class="item-price-row"><span class="price-currency">NT$</span><span class="price-val">'+fmtPrice(l3.addPrice)+'</span></div>'
          +'<div class="check-dot">✓</div>';
        (function(l1o,l3o){l3c.onclick=function(){toggleSedationItem(l1o,l3o);};})(gcSelf,l3);
        gcL3g.appendChild(l3c);
      });
      gcL3row.appendChild(gcL3g); grid.appendChild(gcL3row);
    }
  }

  /* 自費胃鏡列自訂新增（置於胃鏡列最後） */
  appendCustomAddCard(grid,'內視鏡');

  /* ── 自費大腸鏡群組（強制換列） ── */
  var spColonBr=document.createElement('div'); spColonBr.style.cssText='grid-column:1/-1;height:4px;'; grid.appendChild(spColonBr);
  var spColon=ENDO_TREE.selfPay.filter(function(sp){return sp.name.startsWith('大腸鏡');});
  spColon.forEach(function(sp){
    renderSpItem(grid,sp,SP_COLON_PREP,SP_COLON_SED);
  });
  /* ── 耗材：視臨床需要使用，以件數計價，自成一列 ── */
  if(QTY_DEFS.length){
    var conLabel=document.createElement('div');
    conLabel.className='endo-group-label';
    conLabel.textContent='耗材（視臨床需要使用，點一下加一件、右鍵減一件）';
    grid.appendChild(conLabel);
    /* 自成一列並用較窄的欄寬，五張才排得進同一行，不會落單一張在第二列 */
    var conRow=document.createElement('div'); conRow.className='endo-consum-row';
    grid.appendChild(conRow);
    QTY_DEFS.forEach(function(def){
      var row=cart.find(function(x){return x.id===def.id;});
      var n=row?row.qty:0;
      var c=document.createElement('div');
      c.className='item-card sp-card'+(n>0?' selected':'');
      c.dataset.id=def.id;  /* 啟用 hover 備註 */
      /* 件數併入名稱，維持單行高度不因加選而變動 */
      c.innerHTML='<div class="mode-badge self">自費</div>'
        +'<div class="item-name">'+esc(def.name)+(n>0?' ×'+n:'')+'</div>'
        +'<div class="item-price-row"><span class="price-currency">NT$</span><span class="price-val">'+fmtPrice(def.price)+'</span></div>'
        +'<div class="check-dot">✓</div>';
      (function(id){
        c.onclick=function(e){ e.preventDefault(); changeQtyItem(id,+1); };
        c.addEventListener('contextmenu',function(e){ e.preventDefault(); changeQtyItem(id,-1); });
      })(def.id);
      conRow.appendChild(c);
    });
  }

  applyCardA11y();

  /* 展開後：① 以常規 L1 為基準統一所有卡片高度 ② 垂直置中
     自費內視鏡卡片已無說明文字，結構與常規 L1 相同，因此共用同一基準高度；
     單一 rAF 完成量測與套用，避免多次改尺寸造成選取時畫面跳動。 */
  requestAnimationFrame(function(){
    /* ① 量測常規 L1 自然高度取最大，套用到全部 L1 + 子選單（含自費內視鏡） */
    var allL1=grid.querySelectorAll('.reg-l1');
    var sized=grid.querySelectorAll('.endo-sub-row .item-card, .sp-card');
    /* 先重置 inline 樣式量真實高度 */
    allL1.forEach(function(c){ c.style.minHeight=''; });
    sized.forEach(function(c){ c.style.minHeight=''; });
    var maxRegH=0;
    allL1.forEach(function(c){ maxRegH=Math.max(maxRegH,c.offsetHeight); });
    if(maxRegH>0){
      allL1.forEach(function(c){ c.style.minHeight=maxRegH+'px'; });
      sized.forEach(function(c){ c.style.minHeight=maxRegH+'px'; });
    }

    /* ② 垂直置中 */
    var openCard=grid.querySelector('.endo-open');
    if(!openCard) return;
    var scroll=QD.querySelector('.items-scroll');
    if(!scroll) return;
    scroll.scrollTo({top: openCard.offsetTop-(scroll.clientHeight-openCard.offsetHeight)/2, behavior:'smooth'});
  });
}

/* ── selfPay L1 卡片渲染輔助函數 ── */
function renderSpItem(grid,sp,l2arr,l3arr){
  var inCart=cart.find(function(x){return x.id===sp.id;});
  var isOpen=!!(spL1&&spL1.id===sp.id);
  /* 互斥 dimmed：同群組有其他項目被選取時，本項目淡化 */
  var isDimmed=!inCart&&!isOpen&&(function(){
    var gs=SP_GASTRO_GROUP.indexOf(sp.id)!==-1;
    var cs=SP_COLON_GROUP.indexOf(sp.id)!==-1;
    if(gs&&SP_GASTRO_GROUP.some(function(g){return g!==sp.id&&cart.find(function(x){return x.id===g;});})) return true;
    if(cs&&SP_COLON_GROUP.some(function(c){return c!==sp.id&&cart.find(function(x){return x.id===c;});})) return true;
    return false;
  })();
  var sc=document.createElement('div');
  sc.className='item-card endo-nav sp-card'+(isOpen?' endo-open':inCart?' selected':isDimmed?' endo-dimmed':'');
  sc.dataset.id=sp.id;
  /* 說明文字不放在卡片上（改由備註呈現：hover 顯示、列印顯示） */
  sc.innerHTML='<div class="mode-badge self">自費</div>'
    +spNameHtml(sp.name)
    +'<div class="item-price-row"><span class="price-currency">NT$</span><span class="price-val">'+fmtPrice(sp.price)+' 起</span></div>'
    +'<div class="endo-nav-arrow">'+(isOpen?'▾':'›')+'</div>';
  (function(item){sc.onclick=function(){
    if(spL1&&spL1.id===item.id){ spL1=null; buildEndoGrid(); return; }
    /* 原本少了 renderCart()，清掉的項目仍留在右側清單上（畫面與實際不符） */
    switchSpGroup(function(){ spL1=item; }, item.id);
  };})(sp);
  grid.appendChild(sc);
  if(isOpen){
    /* L2 sub-row（常態顯示） */
    var l2row=document.createElement('div'); l2row.className='endo-sub-row sp-sub-row';
    var l2g=document.createElement('div'); l2g.className='endo-sub-grid';
    l2arr.forEach(function(l2){
      var l2fid=sp.id+'|'+l2.id;
      var l2inCart=!!cart.find(function(x){return x.id===l2fid;});
      var l2c=document.createElement('div'); l2c.className='item-card'+(l2inCart?' selected':'');
      l2c.dataset.id=l2fid;  /* 啟用 hover 備註 */
      /* 斷行位置比照常規內視鏡（第 4 字），避免「日本製造代/餐與清腸藥物」這種斷法 */
      l2c.innerHTML='<div class="mode-badge self">自費</div>'
        +endoL2NameHtml(l2.name)
        +'<div class="endo-add-price">+ NT '+fmtPrice(l2.addPrice)+'</div>'
        +'<div class="check-dot">✓</div>';
      (function(item,l2o){l2c.onclick=function(){toggleSpL2(item,l2o);};})(sp,l2);
      l2g.appendChild(l2c);
    });
    l2row.appendChild(l2g); grid.appendChild(l2row);
    /* L3 sub-row（常態顯示，與 L2 並列） */
    var l3row=document.createElement('div'); l3row.className='endo-sub-row l3 sp-sub-row';
    var l3g=document.createElement('div'); l3g.className='endo-sub-grid';
    l3arr.forEach(function(l3){
      var l3fid=sp.id+'|'+l3.id;
      var l3inCart=!!cart.find(function(x){return x.id===l3fid;});
      var l3c=document.createElement('div'); l3c.className='item-card'+(l3inCart?' selected':'');
      l3c.innerHTML='<div class="mode-badge self">自費</div>'
        +'<div class="item-name">'+esc(l3.name)+'</div>'
        +'<div class="item-price-row"><span class="price-currency">NT$</span><span class="price-val">'+fmtPrice(l3.addPrice)+'</span></div>'
        +'<div class="check-dot">✓</div>';
      (function(item,l3o){l3c.onclick=function(){toggleSpL3(item,l3o);};})(sp,l3);
      l3g.appendChild(l3c);
    });
    l3row.appendChild(l3g); grid.appendChild(l3row);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SELF-PAY ENDO L2/L3 DEFINITIONS & TOGGLE
   ═══════════════════════════════════════════════════════════════════ */
/* 自費互斥群組：en_gc_self 同時屬於兩組（含胃鏡+大腸鏡） */
var SP_GASTRO_GROUP=['en_sp_g','en_sp_ghp','en_sp_gb','en_sp_gp','en_gc_self'];
var SP_COLON_GROUP=['en_sp_c','en_sp_cb','en_sp_cp1','en_sp_cp2','en_sp_cp3','en_gc_self'];
/* 清除同互斥群組的其他選擇，並回傳被移除的項目（供提示與復原使用） */
function clearSpGroup(l1id){
  var grps=[];
  if(SP_GASTRO_GROUP.indexOf(l1id)!==-1) grps.push(SP_GASTRO_GROUP);
  if(SP_COLON_GROUP.indexOf(l1id)!==-1) grps.push(SP_COLON_GROUP);
  if(!grps.length) return [];
  var ids=[];
  grps.forEach(function(grp){
    grp.forEach(function(gid){ if(gid!==l1id&&ids.indexOf(gid)===-1) ids.push(gid); });
  });
  var removed=cart.filter(function(x){
    return ids.some(function(gid){ return x.id===gid||x.id.indexOf(gid+'|')===0; });
  });
  if(removed.length) cart=cart.filter(function(x){ return removed.indexOf(x)===-1; });
  return removed;
}

/* 切換自費鏡種時，把被清掉的選擇講清楚並提供復原
   （原本是靜默清除，已配置好的鏡種／代餐／鎮靜會無聲消失） */
function switchSpGroup(applyFn, l1id){
  var snap={cart:cart.slice(), spL1:spL1, endoL1:endoL1, endoL2:endoL2};
  var removed=clearSpGroup(l1id);
  applyFn();
  renderCart(); buildEndoGrid();
  if(!removed.length) return;
  showToast('已清除原本的 '+removed.length+' 項選擇', '復原', function(){
    cart=snap.cart; spL1=snap.spL1; endoL1=snap.endoL1; endoL2=snap.endoL2;
    _prevCartIds=cart.map(function(c){return c.id;});
    renderCart(); buildEndoGrid();
    showToast('已復原原本的選擇');
  });
}

/* 用詞比照常規內視鏡（en_gastro.layer2 / en_colon.layer2），全站描述一致 */
var SP_GASTRO_SCOPE=[
  {id:'sp_sc_s', name:'標準胃鏡 (直徑約0.9cm) 經口', desc:'使用拋棄式咬口器', addPrice:100},
  {id:'sp_sc_to',name:'極細胃鏡 (直徑約0.5cm) 經口', desc:'使用拋棄式咬口器', addPrice:700},
  {id:'sp_sc_tn',name:'極細胃鏡 (直徑約0.5cm) 經鼻', desc:'無其他耗材',       addPrice:600},
];
var SP_GASTRO_SED=[
  {id:'sp_g_w',name:'清醒',       addPrice:0},
  {id:'sp_g_l',name:'輕中度鎮靜', addPrice:2000},
  {id:'sp_g_a',name:'麻醉',       addPrice:4000},
];
var SP_COLON_PREP=[
  {id:'sp_cp_j',name:'日本製造代餐與清腸藥物',desc:'拋棄式檢查褲 ＋ 大腸鏡二氧化碳充氣',addPrice:1500},
  {id:'sp_cp_t',name:'台灣製造代餐與清腸藥物',desc:'拋棄式檢查褲 ＋ 大腸鏡二氧化碳充氣',addPrice:1200},
];
var SP_COLON_SED=[
  {id:'sp_c_w',name:'清醒',       addPrice:0},
  {id:'sp_c_l',name:'輕中度鎮靜', addPrice:2500},
  {id:'sp_c_a',name:'麻醉',       addPrice:4000},
];

/* ─ 自費內視鏡：卡片上不顯示說明文字，改登錄為備註 ──────────────────
   登錄後 hover tooltip 與列印清單都會自動帶出（兩者皆讀 ITEM_DESCS）。
   key 需與卡片 data-id／購物車 id 一致：L1 為 sp.id，L2 為 sp.id|l2.id。 */
(function registerSelfPayNotes(){
  ENDO_TREE.selfPay.forEach(function(sp){
    if(sp.desc) ITEM_DESCS[sp.id]=sp.desc;
    /* 與 buildEndoGrid 的分組方式一致 */
    var l2arr = sp.name.indexOf('胃鏡')===0   ? SP_GASTRO_SCOPE
              : sp.name.indexOf('大腸鏡')===0 ? SP_COLON_PREP
              : null;
    if(!l2arr) return;
    l2arr.forEach(function(l2){
      if(l2.desc) ITEM_DESCS[sp.id+'|'+l2.id]=l2.desc;
    });
  });
  /* 胃鏡＋大腸鏡（完全自費）沿用常規三層資料，同樣置於自費內視鏡區 */
  var gcSelf=ENDO_TREE.layer1.find(function(l){return l.id==='en_gc_self';});
  if(gcSelf) gcSelf.layer2.forEach(function(l2){
    if(l2.desc) ITEM_DESCS['en_gc_self|'+l2.id]=l2.desc;
  });
})();

function _spAutoL1(spItem){
  if(!cart.find(function(x){return x.id===spItem.id;}))
    cart.push({id:spItem.id,name:spItem.name,catLabel:'內視鏡',price:spItem.price,mode:'self',priceEdited:false,_autoAdded:true});
}
function toggleSpL2(spItem,l2obj){
  clearSpGroup(spItem.id);
  _spAutoL1(spItem);
  var l2fid=spItem.id+'|'+l2obj.id;
  var hasL2=!!cart.find(function(x){return x.id===l2fid;});
  /* 移除同 L1 的舊 L2（互斥） */
  var l2ids=['sp_sc_s','sp_sc_to','sp_sc_tn','sp_cp_j','sp_cp_t'];
  cart=cart.filter(function(x){
    if(!x.id.startsWith(spItem.id+'|')) return true;
    var sub=x.id.slice(spItem.id.length+1);
    return l2ids.indexOf(sub)===-1;
  });
  if(!hasL2){
    cart.push({id:l2fid,name:l2obj.name,catLabel:'內視鏡',price:l2obj.addPrice,mode:'self',priceEdited:false});
    showToast('✓ '+l2obj.name);
  } else {
    showToast('已取消：'+l2obj.name);
  }
  renderCart(); buildEndoGrid();
}
function toggleSpL3(spItem,l3obj){
  clearSpGroup(spItem.id);
  _spAutoL1(spItem);
  var l3fid=spItem.id+'|'+l3obj.id;
  var hasL3=!!cart.find(function(x){return x.id===l3fid;});
  /* 移除同 L1 的舊 L3（互斥） */
  var l3ids=['sp_g_w','sp_g_l','sp_g_a','sp_c_w','sp_c_l','sp_c_a'];
  cart=cart.filter(function(x){
    if(!x.id.startsWith(spItem.id+'|')) return true;
    var sub=x.id.slice(spItem.id.length+1);
    return l3ids.indexOf(sub)===-1;
  });
  if(!hasL3){
    cart.push({id:l3fid,name:l3obj.name,catLabel:'內視鏡',price:l3obj.addPrice,mode:'self',priceEdited:false});
    showToast('✓ '+l3obj.name);
  } else {
    showToast('已取消：'+l3obj.name);
  }
  renderCart(); buildEndoGrid();
}

/* ═══════════════════════════════════════════════════════════════════
   TOGGLE ITEM
   ═══════════════════════════════════════════════════════════════════ */
/* 健檢 A-E 互斥群組（同時只能選一項） */
/* ═══════════════════════════════════════════════════════════════════
   內視鏡耗材：以件數累計於同一列
   同一項按多次只會累加件數，不會產生多列相同項目（列印才不會重複好幾行）。
   ═══════════════════════════════════════════════════════════════════ */
const QTY_DEFS = ENDO_TREE.selfPay.filter(s=>s.qty);
const QTY_IDS  = new Set(QTY_DEFS.map(s=>s.id));

function changeQtyItem(id, delta){
  const def=ENDO_TREE.selfPay.find(s=>s.id===id);
  if(!def) return;
  const idx=cart.findIndex(x=>x.id===id);
  if(idx===-1){
    if(delta<=0) return;
    cart.push({id:id,name:def.name,catLabel:'內視鏡',
               qty:1,unitPrice:def.price,price:def.price,mode:'self',priceEdited:false});
    showToast('✓ 已加入：'+def.name);
  } else {
    const it=cart[idx];
    const q=(it.qty||1)+delta;
    if(q<=0){
      cart.splice(idx,1);
      showToast('已移除：'+def.name);
    } else {
      it.qty=q;
      /* 件數變動後重算金額，原本的手動改價會被覆蓋 */
      it.price=(it.unitPrice||def.price)*q;
      it.priceEdited=false;
      showToast(def.name+' ×'+q);
    }
  }
  renderCart(); buildEndoGrid();
}

/* 健檢模組化後只剩 ⑦ 腫瘤標記男女版互斥，其餘每項都可單獨選擇 */
const HC_RADIO = new Set(['hc_m7f','hc_m7m']);

function toggleItem(item, clickMode){
  const idx=cart.findIndex(c=>c.id===item.id);
  if(idx===-1){
    // 健檢套組互斥：加入前先移除其他同群組項目
    if(HC_RADIO.has(item.id)) cart=cart.filter(c=>!HC_RADIO.has(c.id));
    cart.push(Object.assign({id:item.id,name:item.name,catLabel:currentCat?currentCat.label:'',
               price:item.price,mode:clickMode,priceEdited:false}, item.extPay?{extPay:item.extPay}:{}));
    showToast(`✓ 已加入（${clickMode==='ins'?'免自費':'自費'}）：${item.name}`);
  } else {
    const ex=cart[idx];
    if(clickMode==='self'){
      if(ex.mode==='ins'){ cart[idx].mode='self'; showToast(`切換為自費：${item.name}`); }
      else { cart.splice(idx,1); showToast(`已移除：${item.name}`); }
    } else {
      cart[idx].mode=ex.mode==='ins'?'self':'ins';
      showToast(`切換為${cart[idx].mode==='ins'?'免自費':'自費'}：${item.name}`);
    }
  }
  if(['ex1','ex2','ex3'].includes(item.id)){dismissedDiscounts.delete('disc-us-2');dismissedDiscounts.delete('disc-us-3');}
  renderCart();
  /* 健檢套組互斥會同時影響同群組的卡片，一併更新 */
  const touched = HC_RADIO.has(item.id) ? Array.from(HC_RADIO) : [item.id];
  if(!refreshCards(touched) && currentCat) buildItemsGrid(currentCat);
}

/* ═══════════════════════════════════════════════════════════════════
   局部更新卡片狀態
   原本每點一下就重建整個分類（檢驗 300 多張卡），既慢又會讓鍵盤焦點消失。
   找不到對應卡片時回傳 false，由呼叫端退回完整重建。
   ═══════════════════════════════════════════════════════════════════ */
function applyCardState(card, item){
  const inCart=cart.find(c=>c.id===item.id);
  const sel=!!inCart, isIns=sel&&inCart.mode==='ins';
  /* 保留 nm-flow 等排版用的 class 不受影響（那些在子元素上） */
  card.className='item-card'+(isIns?' ins-mode':sel?' selected':'');
  const badge=card.querySelector('.mode-badge');
  if(badge){
    badge.className='mode-badge '+(isIns?'ins':'self');
    badge.textContent=isIns?'免自費':'自費';
  }
  const priceRow=card.querySelector('.item-price-row');
  if(priceRow){
    if(isIns) priceRow.innerHTML='<span class="price-val ins-price">免自費</span>';
    else if(item.price>0) priceRow.innerHTML='<span class="price-currency">NT$</span><span class="price-val">'+fmtPrice(item.price)+'</span>';
    else priceRow.innerHTML='<span class="price-val tbd">待建檔</span>';
  }
}

function refreshCards(ids){
  if(!currentCat||currentCat.id==='endo') return false;
  const grid=QD.getElementById('itemsGrid');
  if(!grid) return false;
  const pairs=[];
  for(const id of ids){
    const item=currentCat.items.find(i=>i.id===id&&!i.type);
    const card=grid.querySelector('.item-card[data-id="'+cssEsc(id)+'"]');
    if(!item||!card) return false;
    pairs.push([card,item]);
  }
  pairs.forEach(([card,item])=>applyCardState(card,item));
  return true;
}

/* ═══════════════════════════════════════════════════════════════════
   EDITABLE PRICE
   ═══════════════════════════════════════════════════════════════════ */
function startEditPrice(el, itemId){
  const item=cart.find(c=>c.id===itemId);
  if(!item||item.mode==='ins') return;
  /* 第一次改價時記住定價，供「還原定價」使用（會一併寫入保存狀態） */
  if(item._origPrice===undefined) item._origPrice=item.price;

  const input=document.createElement('input');
  input.type='number'; input.className='price-edit-input';
  input.value=item.price||0; input.min=0;
  el.replaceWith(input);
  input.focus(); input.select();

  function save(){
    const val=Math.max(0,parseInt(input.value)||0);
    item.price=val; item.priceEdited=true;
    renderCart();
    if(currentCat) buildItemsGrid(currentCat);
  }
  input.addEventListener('blur',save);
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'){ e.preventDefault(); save(); }
    if(e.key==='Escape') renderCart();
  });
}

/* 還原為定價（改過價格的項目才會顯示此鍵） */
function revertPrice(itemId){
  const item=cart.find(c=>c.id===itemId);
  if(!item||item._origPrice===undefined) return;
  item.price=item._origPrice;
  item.priceEdited=false;
  delete item._origPrice;
  showToast('已還原定價：'+item.name);
  renderCart();
  if(currentCat) buildItemsGrid(currentCat);
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER CART
   ═══════════════════════════════════════════════════════════════════ */
function renderCart(){
  const cartList=QD.getElementById('cartList');
  const discountBlock=QD.getElementById('discountBlock');
  const emptyState=QD.getElementById('emptyState');
  const cartCount=QD.getElementById('cartCount');

  cartList.innerHTML=''; discountBlock.innerHTML='';

  if(cart.length===0){
    emptyState.style.display='';
    cartCount.textContent='0'; cartCount.classList.add('zero');
    QD.getElementById('selfTotal').textContent='NT$ 0';
    var dd=QD.getElementById('discountDisplay');if(dd&&dd.tagName==='SPAN')dd.textContent='— NT$ 0';
    QD.getElementById('grandTotal').textContent='0';
    const er=QD.getElementById('extPayRow'); if(er) er.hidden=true;
    ['hcNote','extPayNote','endoNote'].forEach(id=>{const n=QD.getElementById(id); if(n) n.classList.remove('active');});
    _prevCartIds=[];
    saveState();
    return;
  }
  emptyState.style.display='none';
  cartCount.textContent=String(cart.length);
  cartCount.classList.remove('zero');

  // Group by category
  const groups={};
  cart.forEach(item=>{ if(!groups[item.catLabel]) groups[item.catLabel]=[]; groups[item.catLabel].push(item); });

  Object.entries(groups).forEach(([cat,items])=>{
    if(cat){ const lbl=document.createElement('div'); lbl.className='cart-group-label'; lbl.textContent=cat; cartList.appendChild(lbl); }
    items.forEach(item=>{
      const row=document.createElement('div'); row.className='cart-item';
      row.dataset.cid=item.id;
      /* ITEM_NOTES 是套組內含項目，ITEM_DESCS 是單項備註，標題不同 */
      const isPack=!!ITEM_NOTES[item.id];
      const notes=ITEM_NOTES[item.id]||ITEM_DESCS[item.id]||'';

      let priceEl;
      if(item.mode==='ins'){
        priceEl=`<span class="cart-item-price ins-p">免自費</span><span class="price-edit-hint ins-hint"></span>`;
      } else {
        const isEndoItem=item.catLabel==='內視鏡';
        const isTbd=item.price===0&&!isEndoItem;
        const cls='cart-item-price'+(item.priceEdited?' edited':'')+(isTbd?' tbd':'');
        const label=item.price>0?`NT$ ${fmtPrice(item.price)}`:isTbd?'待建檔':'NT$ 0';
        /* 院外繳費（例如榮總）：照列金額，但不計入本院應收 */
        const extTag=item.extPay?`<span class="ext-pay-tag">於${esc(item.extPay)}繳費</span>`:'';
        /* 改過價格的項目給一個還原鍵，不必整筆刪掉重加 */
        const hint=item.priceEdited
          ? `<button class="price-revert-btn" data-id="${item.id}" title="還原定價">↺ 還原定價</button>`
          : `<span class="price-edit-hint">點擊修改金額</span>`;
        priceEl=`
          <span class="${cls}" data-id="${item.id}">${label}</span>
          ${extTag}${hint}`;
      }

      // Notes block for print
      const notesBlock = notes
        ? `<div class="cart-notes-print${isPack&&notes.split('\n').length>=4?' cols':''}">
             <div class="cart-notes-print-title">${isPack?'包含項目':'備註'}</div>
             ${notes.split('\n').map(l=>`• ${esc(l)}`).join('<br>')}
           </div>`
        : '';

      const catDisplay=item.catLabel==='內視鏡'&&item.id.includes('|')?'耗材及鎮靜/麻醉':item.catLabel;
      /* 以件數計價的項目（病理檢查費）：名稱帶 ×N，並提供加減鍵 */
      const qtyLabel = item.qty ? ` ×${item.qty}` : '';
      const qtyCtrl = (item.qty && item.mode!=='ins')
        ? `<span class="qty-ctrl">
             <button class="qty-btn" data-qty="-1" title="減一件">−</button>
             <span class="qty-num">${item.qty}</span>
             <button class="qty-btn" data-qty="1" title="加一件">＋</button>
           </span>`
        : '';
      row.innerHTML=`
        <div class="cart-item-body">
          <div class="cart-item-name">${esc(item.name).replace(/\n/g,' ')}${qtyLabel}</div>
          <div class="cart-item-meta">
            <span class="cart-badge ${item.mode==='ins'?'ins':'self'}">${item.mode==='ins'?'免自費':'自費'}</span>
            <span class="cart-item-cat">${esc(catDisplay)}</span>
            ${qtyCtrl}
          </div>
          ${notesBlock}
        </div>
        <div class="cart-price-wrap">${priceEl}</div>
        <button class="cart-remove-btn" data-id="${item.id}" title="移除">×</button>
      `;

      // Bind editable price
      const priceSpan=row.querySelector('.cart-item-price:not(.ins-p)');
      if(priceSpan) priceSpan.addEventListener('click',()=>startEditPrice(priceSpan,item.id));

      // 還原定價
      const revertBtn=row.querySelector('.price-revert-btn');
      if(revertBtn) revertBtn.addEventListener('click',e=>{e.stopPropagation();revertPrice(item.id);});

      // 件數加減
      row.querySelectorAll('.qty-btn').forEach(b=>b.addEventListener('click',e=>{
        e.stopPropagation();
        if(QTY_IDS.has(item.id)) changeQtyItem(item.id, parseInt(e.currentTarget.dataset.qty,10));
      }));

      row.querySelector('.cart-remove-btn').addEventListener('click',e=>removeItem(e.currentTarget.dataset.id));
      // 右鍵切換自費/健保
      row.addEventListener('contextmenu', e=>{
        e.preventDefault();
        const it=cart.find(c=>c.id===item.id);
        if(!it) return;
        it.mode = it.mode==='ins' ? 'self' : 'ins';
        showToast(`切換為${it.mode==='ins'?'免自費':'自費'}：${it.name}`);
        renderCart();
        if(currentCat) buildItemsGrid(currentCat);
      });
      cartList.appendChild(row);
    });
  });

  // Totals
  const selfItems=cart.filter(i=>i.mode==='self'&&!i.extPay);
  const extItems=cart.filter(i=>i.mode==='self'&&i.extPay);
  const selfSum=selfItems.reduce((s,i)=>s+(i.price||0),0);
  const extSum=extItems.reduce((s,i)=>s+(i.price||0),0);

  // Discounts
  const activeAll=DISCOUNT_RULES.filter(r=>r.check(cart)&&r.discount>0&&!dismissedDiscounts.has(r.id));
  const dripBest=activeAll.filter(d=>d.id.startsWith('disc-drip')).sort((a,b)=>b.discount-a.discount)[0];
  const usBest  =activeAll.filter(d=>d.id.startsWith('disc-us')).sort((a,b)=>b.discount-a.discount)[0];
  const finalDiscs=[
    ...activeAll.filter(d=>!d.id.startsWith('disc-drip')&&!d.id.startsWith('disc-us')),
    ...(dripBest?[dripBest]:[]),
    ...(usBest?[usBest]:[])
  ];
  let totalDiscount=0;

  if(finalDiscs.length>0){
    const block=document.createElement('div'); block.className='discount-block';
    finalDiscs.forEach(d=>{
      totalDiscount+=d.discount;
      const r=document.createElement('div'); r.className='discount-row';
      r.innerHTML=`<span class="discount-name">${esc(d.name)}</span>
                   <span class="discount-amt">— NT$ ${fmtPrice(d.discount)}</span>
                   <button class="discount-remove-btn" data-disc-id="${esc(d.id)}" title="取消此優惠">✕</button>`;
      block.appendChild(r);
    });
    discountBlock.appendChild(block);
  }

  const displayDiscount=(manualDiscountOverride!==null)?manualDiscountOverride:totalDiscount;
  const grand=Math.max(0,selfSum-displayDiscount-paidAmount);
  const allTbd=selfSum===0&&selfItems.some(i=>i.price===0&&i.catLabel!=='內視鏡');
  QD.getElementById('selfTotal').textContent=allTbd?'待建檔':`NT$ ${fmtPrice(selfSum)}`;
  var ddEl=QD.getElementById('discountDisplay');
  if(ddEl&&ddEl.tagName==='SPAN') ddEl.textContent=displayDiscount>0?`— NT$ ${fmtPrice(displayDiscount)}`:'— NT$ 0';
  QD.getElementById('grandTotal').textContent=allTbd?'待建檔':fmtPrice(grand);
  const extRow=QD.getElementById('extPayRow');
  if(extRow){
    extRow.hidden=extSum===0;
    const where=[...new Set(extItems.map(i=>i.extPay))].join('、');
    QD.getElementById('extPayLabel').textContent='另於'+where+'繳費';
    QD.getElementById('extPayValue').textContent='NT$ '+fmtPrice(extSum);
  }
  (function(){
    const hcNote=QD.getElementById('hcNote');
    if(hcNote) hcNote.classList.toggle('active',cart.some(c=>c.catLabel==='健檢方案'));
    const ldctNote=QD.getElementById('extPayNote');
    if(ldctNote) ldctNote.classList.toggle('active',extItems.length>0);
  })();
  /* 已付金額只負責顯示，編輯由 .panel-foot 的委派處理 */
  var pdEl=QD.getElementById('paidDisplay');
  if(pdEl&&pdEl.tagName==='SPAN') pdEl.textContent='— NT$ '+fmtPrice(paidAmount);
  (function(){
    var hasEndo=cart.some(function(c){return c.catLabel==='內視鏡';});
    var hasHcDE=cart.some(function(c){return c.id==='hc_m6';});
    var noteEl=QD.getElementById('endoNote');
    if(noteEl) noteEl.classList.toggle('active',hasEndo||hasHcDE);
  })();
  renderConflictWarning();
  flagNewCartRows(cartList);
  saveState();
}

/* ═══════════════════════════════════════════════════════════════════
   重複計費提示（僅供櫃檯確認，不列印）
   健檢 ⑥ 麻醉胃鏡＋大腸鏡已含內視鏡檢查，若又在內視鏡區另加自費項目會重複收費。
   ═══════════════════════════════════════════════════════════════════ */
/* ─ 成分代號 → 可單獨加選的品項 id ─────────────────────────────────
   只收錄在「檢驗／檢查」分類中真的能單選的品項。
   找不到對應單選品項者一律不納入（CBC 的 DC 分類計數、TC/HDL 比值、
   Total Protein、progesterone、prostaglandin 等），寧可少提醒也不誤報。 */
const P = {
  acSugar:'lb_01001', hba1c:'lb_03001', insulin:'lb_03002',   /* HOMA-IR 需測胰島素 */
  ast:'lb_01011', alt:'lb_01012', bun:'lb_01008', cr:'lb_01010', ua:'lb_01009',
  tc:'lb_01004', tg:'lb_01003', hdl:'lb_01005', ldl:'lb_01006', lpa:'lb_01007',
  tbil:'lb_01015', dbil:'lb_01016', alkp:'lb_01014', rgt:'lb_01013',
  alb:'lb_01018', glob:'lb_01019', amylase:'lb_01021', cpk:'lb_01023',
  tsh:'lb_04003', ft4:'lb_04004', t3:'lb_04001',
  urine:'lb_09001', microalb:'lb_09004', ucr:'lb_09005',
  cbc:'lb_10001', fe:'lb_11001', tibc:'lb_11002', ferritin:'lb_11006',
  hbsag:'lb_02006', hbsab:'lb_02007', hcv:'lb_02014',
  hscrp:'lb_13003', apob:'lb_01029', homocys:'lb_13004', probnp:'lb_13005',
  fsh:'lb_17010', lh:'lb_17011', e2:'lb_17012', cortisol:'lb_17005',
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
  lb02:[P.cbc,P.acSugar,P.hba1c,P.ast,P.alt,P.bun,P.cr,P.ua,P.tc,P.tg,P.hdl,P.ldl,P.urine],
  lb03:[P.cbc,P.acSugar,P.hba1c,P.ast,P.alt,P.tbil,P.dbil,P.alkp,P.rgt,P.alb,P.glob,P.amylase,
        P.bun,P.cr,P.ua,P.tc,P.tg,P.hdl,P.ldl,P.urine],
  lb04:[P.cbc,P.acSugar,P.hba1c,P.ast,P.alt,P.hbsag,P.hbsab,P.hcv,
        P.bun,P.cr,P.ua,P.tc,P.tg,P.hdl,P.ldl,P.urine],
  lb05:[P.hbsag,P.hbsab,P.hcv],
  lb06:[P.acSugar,P.hba1c,P.insulin,P.ast,P.alt,P.bun,P.cr,P.ua,
        P.tc,P.tg,P.hdl,P.ldl,P.tsh,P.ft4],
  lb07:[P.acSugar,P.hba1c,P.insulin,P.bun,P.cr,P.microalb,P.ucr],
  lb08:[P.microalb,P.ucr],
  lb09:[P.cbc,P.fe,P.tibc],
  lb10:[P.acSugar,P.tc,P.tg,P.hdl,P.ldl,P.hscrp,P.homocys,P.probnp,P.cpk],
  lb11:[P.t3,P.ft4,P.tsh],
  lb12:[P.fsh,P.lh,P.e2,P.tsh,P.chlaIgG],
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

/* id → 品項定義，供顯示重複成分的名稱 */
const ITEM_BY_ID = (function(){
  const m={};
  CATEGORIES.forEach(c=>c.items.forEach(i=>{ if(!i.type) m[i.id]=i; }));
  return m;
})();

function dupList(names){
  return names.length>4
    ? names.slice(0,3).join('、')+' 等 '+names.length+' 項'
    : names.join('、');
}

function renderConflictWarning(){
  const box=QD.getElementById('warnBlock');
  if(!box) return;
  box.innerHTML='';
  /* 免自費項目價格為 0，不構成重複收費 */
  const items=cart.filter(c=>c.mode!=='ins');
  const isPanel=id=>!!PANEL_PARTS[id];
  const warns=[];

  /* ① 套組／方案 已包含清單中的某個單選項目 */
  items.forEach(p=>{
    if(!isPanel(p.id)) return;
    const parts=PANEL_PARTS[p.id];
    const dup=items.filter(x=>x!==p&&!isPanel(x.id)&&parts.indexOf(x.id)!==-1);
    if(!dup.length) return;
    const sum=dup.reduce((s,x)=>s+(x.price||0),0);
    warns.push(esc(p.name)+'已包含 '+dupList(dup.map(x=>esc(x.name)))
      +'，目前重複計入 NT$ '+fmtPrice(sum)+'。');
  });

  /* ② 兩個套組／方案之間的成分重複 */
  for(let i=0;i<items.length;i++){
    if(!isPanel(items[i].id)) continue;
    for(let j=i+1;j<items.length;j++){
      if(!isPanel(items[j].id)) continue;
      const a=PANEL_PARTS[items[i].id], b=PANEL_PARTS[items[j].id];
      const shared=a.filter(x=>b.indexOf(x)!==-1);
      if(!shared.length) continue;
      const names=shared.map(id=>ITEM_BY_ID[id]?esc(ITEM_BY_ID[id].name):id);
      warns.push(esc(items[i].name)+' 與 '+esc(items[j].name)+' 內容重複：'
        +dupList(names)+'，請確認是否兩者都需要。');
    }
  }

  /* ③ 健檢 ⑥ 已含胃鏡與大腸鏡 */
  const hcEndo=items.find(c=>HC_WITH_ENDO[c.id]);
  if(hcEndo){
    const endoSelf=items.filter(c=>c.catLabel==='內視鏡'&&(c.price||0)>0);
    if(endoSelf.length){
      const sum=endoSelf.reduce((s,x)=>s+(x.price||0),0);
      warns.push('健檢'+esc(hcEndo.name)+'已包含胃鏡與大腸鏡，清單中另有 '+endoSelf.length
        +' 項內視鏡自費費用，合計 NT$ '+fmtPrice(sum)+'。');
    }
  }

  if(!warns.length) return;
  const div=document.createElement('div');
  div.className='warn-block';
  div.innerHTML='<div class="warn-title">請確認是否重複計費</div>'
    + warns.map(w=>'<div class="warn-text">'+w+'</div>').join('');
  box.appendChild(div);
}

/* 新加入的項目：捲入可視範圍並短暫標示（長清單時才看得出加了什麼） */
let _prevCartIds = [];
function flagNewCartRows(cartList){
  const nowIds = cart.map(c=>c.id);
  const added  = nowIds.filter(id=>!_prevCartIds.includes(id));
  _prevCartIds = nowIds;
  if(!added.length) return;
  const row = cartList.querySelector('.cart-item[data-cid="'+cssEsc(added[added.length-1])+'"]');
  if(!row) return;
  row.classList.add('just-added');
  setTimeout(()=>row.classList.remove('just-added'), 1400);
  const body = QD.getElementById('panelBody');
  if(body){
    const rt = row.offsetTop, rb = rt + row.offsetHeight;
    if(rt < body.scrollTop || rb > body.scrollTop + body.clientHeight){
      body.scrollTo({ top: Math.max(0, rt - body.clientHeight/2 + row.offsetHeight/2), behavior:'smooth' });
    }
  }
}
function cssEsc(s){
  return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g,'\\$&');
}

function removeItem(id){
  const item=cart.find(c=>c.id===id);
  if(!item){ return; }
  const snapshot=cart.slice();
  cart=cart.filter(c=>c.id!==id);
  showToast(`已移除：${item.name}`, '復原', ()=>{
    cart=snapshot; _prevCartIds=cart.map(c=>c.id);
    renderCart();
    if(!refreshCards([id]) && currentCat) buildItemsGrid(currentCat);
    showToast(`已復原：${item.name}`);
  });
  renderCart();
  if(!refreshCards([id]) && currentCat) buildItemsGrid(currentCat);
}

QD.getElementById('btnClear').addEventListener('click',()=>{
  if(!cart.length){ showToast('清單目前是空的'); return; }
  /* 誤觸會清掉整份說明，保留快照供復原 */
  const snap={cart:cart.slice(), paid:paidAmount, disc:manualDiscountOverride,
              dismissed:new Set(dismissedDiscounts)};
  const n=cart.length;
  cart=[]; paidAmount=0; manualDiscountOverride=null; dismissedDiscounts=new Set();
  var pd=QD.getElementById('paidDisplay');
  if(pd&&pd.tagName==='SPAN') pd.textContent='— NT$ 0';
  renderCart(); if(currentCat) buildItemsGrid(currentCat);
  showToast(`已清除 ${n} 個項目`, '復原', ()=>{
    cart=snap.cart; paidAmount=snap.paid; manualDiscountOverride=snap.disc;
    dismissedDiscounts=snap.dismissed;
    var pd2=QD.getElementById('paidDisplay');
    if(pd2&&pd2.tagName==='SPAN') pd2.textContent='— NT$ '+fmtPrice(paidAmount);
    _prevCartIds=cart.map(c=>c.id);
    renderCart(); if(currentCat) buildItemsGrid(currentCat);
    showToast('已復原清單');
  });
});

/* 列印前先確認清單不是空的，並讓檔名帶上日期 */
QD.getElementById('btnPrint').addEventListener('click',()=>{
  if(!cart.length){ showToast('清單是空的，請先選取項目'); return; }
  const pi=QD.getElementById('patientNameInput');
  const name=pi?pi.value.trim():'';
  /* 等姓名的字型下載完再列印，最多等 3 秒 */
  Promise.race([loadNameFont(name), new Promise(r=>setTimeout(r,3000))])
    .then(()=>{
      /* 列印時才換標題（另存 PDF 的預設檔名），印完改回工作台的標題 */
      const t0=document.title;
      document.title=printFileTitle(name);
      (window.QUOTE_PRINT || window.print)();
      document.title=t0;
    });
});

/* ═══════════════════════════════════════════════════════════════════
   最後改版日期
   ★ 每次改版請一併更新這個日期，會顯示於首頁左下角與列印版頁尾
   ═══════════════════════════════════════════════════════════════════ */
const Q_REVISION = '2026-10-31';
window.Q_REVISION = Q_REVISION;

function renderAppRevision(){
  const el = QD.getElementById('appRevision');
  if(el) el.textContent = '最後改版：' + Q_REVISION;
  const lv = QD.getElementById('letterVersion');
  if(lv) lv.textContent = '價目版本：' + Q_REVISION;
}
renderAppRevision();

/* ═══════════════════════════════════════════════════════════════════
   BANNER DATE
   ═══════════════════════════════════════════════════════════════════ */
function updateDate(){
  const n=new Date();
  QD.getElementById('bannerDate').innerHTML=
    n.toLocaleDateString('zh-TW',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
}
updateDate();
/* 診間電腦常整天不關機，列印前重算日期，避免印出前一天的日期 */
window.addEventListener('beforeprint', updateDate);
/* 每十分鐘校正一次，跨日時畫面上的日期也會跟著換 */
setInterval(updateDate, 600000);

/* 稱謂同步 + 列印檔名 */
/* Google Fonts 依字元分批下載 Noto Serif TC。信件開頭在螢幕上是隱藏的，
   姓名的字不會預先載入，列印時就會改用新細明體，所以輸入時先下載這幾個字 */
function loadNameFont(name){
  if(!name || !document.fonts || !document.fonts.load) return Promise.resolve();
  return document.fonts.load('700 14pt "Noto Serif TC"', name).catch(()=>{});
}
function printFileTitle(name){
  const n = new Date();
  const ymd = n.getFullYear()
    + String(n.getMonth()+1).padStart(2,'0')
    + String(n.getDate()).padStart(2,'0');
  /* 未輸入稱謂時也要有合理檔名，不要用系統標題當 PDF 檔名 */
  return (name ? name + ' ' : '') + '醫療費用說明_' + ymd;
}
(function(){
  var pi=QD.getElementById('patientNameInput');
  var ln=QD.getElementById('letterPatientName');
  if(!pi||!ln) return;
  pi.addEventListener('input',function(){
    var name=pi.value.trim();
    ln.textContent=name||'___';
    loadNameFont(name);
  });
})();

/* 視窗縮放時重新定位搜尋結果 */
window.addEventListener('resize', function(){
  if(QD.getElementById('searchResults').classList.contains('open'))
    positionSearchResults();
});

/* ═══════════════════════════════════════════════════════════════════
   已付金額 & 優惠折扣（可手動編輯）
   以事件委派處理：原本每次 renderCart 都對同一個 span 再 addEventListener
   一次且從未移除，監聽器會不斷累積，點一次會觸發 N 個處理器並搶走焦點。
   ═══════════════════════════════════════════════════════════════════ */
var paidAmount=0;

const EDITABLE_AMOUNTS = {
  paidDisplay:     { get:()=>paidAmount,                set:v=>{paidAmount=v;} },
  discountDisplay: { get:()=>manualDiscountOverride||0,  set:v=>{manualDiscountOverride=v;} }
};

function startEditAmount(el, cfg){
  const elId=el.id, cls=el.className;
  const input=document.createElement('input');
  input.type='number'; input.min='0'; input.className='price-edit-input';
  input.style.color='var(--gold)'; input.value=cfg.get()||'';
  el.replaceWith(input); input.focus(); input.select();
  let done=false;
  function save(){
    if(done) return; done=true;            /* blur 與 keydown 可能同時觸發 */
    cfg.set(Math.max(0,parseInt(input.value)||0));
    const span=document.createElement('span');
    span.id=elId; span.className=cls;
    span.textContent='— NT$ '+fmtPrice(cfg.get());
    input.replaceWith(span);
    renderCart();
  }
  input.addEventListener('blur',save);
  input.addEventListener('keydown',function(e){
    if(e.key==='Enter'||e.key==='Escape'){ e.preventDefault(); save(); }
  });
}

QD.querySelector('.panel-foot').addEventListener('click',function(e){
  const el=e.target.closest('.paid-display, .discount-display');
  if(!el||el.tagName!=='SPAN') return;
  const cfg=EDITABLE_AMOUNTS[el.id];
  if(cfg) startEditAmount(el,cfg);
});

/* X 取消優惠 */
QD.getElementById('discountBlock').addEventListener('click',function(e){
  var btn=e.target.closest('.discount-remove-btn');
  if(!btn) return;
  dismissedDiscounts.add(btn.dataset.discId);
  renderCart();
});

/* ═══════════════════════════════════════════════════════════════════
   狀態保存（避免誤關視窗／重新整理時整份清單消失）
   刻意不自動套用：不同病人之間若自動還原會造成費用張冠李戴，
   因此改為載入時詢問是否還原。
   ═══════════════════════════════════════════════════════════════════ */
const LS_KEY = 'muzicheng_planner_state_v1';
const RESTORE_MAX_AGE = 6 * 60 * 60 * 1000; /* 6 小時內才提示還原 */
let _restoring = false;
let _initDone  = false;   /* 初始化那次渲染不寫入，以免覆蓋掉待還原的紀錄 */

function saveState(){
  if(_restoring || !_initDone) return;
  try{
    const pi = QD.getElementById('patientNameInput');
    localStorage.setItem(LS_KEY, JSON.stringify({
      v: 1,
      ts: Date.now(),
      cart: cart,
      paid: paidAmount || 0,
      disc: manualDiscountOverride,
      dismissed: Array.from(dismissedDiscounts),
      patient: pi ? pi.value : ''
    }));
  }catch(e){ /* 隱私模式或容量不足時忽略 */ }
}

function readSavedState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    if(!s || !Array.isArray(s.cart) || s.cart.length === 0) return null;
    if(!s.ts || Date.now() - s.ts > RESTORE_MAX_AGE) return null;
    return s;
  }catch(e){ return null; }
}

function applySavedState(s){
  _restoring = true;
  cart = s.cart;
  paidAmount = s.paid || 0;
  manualDiscountOverride = (s.disc === null || s.disc === undefined) ? null : s.disc;
  dismissedDiscounts = new Set(s.dismissed || []);
  const pi = QD.getElementById('patientNameInput');
  if(pi && s.patient){
    pi.value = s.patient;
    pi.dispatchEvent(new Event('input', {bubbles:true}));
  }
  const pd = QD.getElementById('paidDisplay');
  if(pd && pd.tagName === 'SPAN') pd.textContent = '— NT$ ' + fmtPrice(paidAmount);
  _prevCartIds = cart.map(c=>c.id);
  _restoring = false;
  renderCart();
  if(currentCat) buildItemsGrid(currentCat);
}

(function initRestorePrompt(){
  const saved = readSavedState();
  const bar   = QD.getElementById('restoreBar');
  if(!saved || !bar) return;
  const mins = Math.round((Date.now() - saved.ts) / 60000);
  const when = mins < 1 ? '剛剛' : mins < 60 ? mins + ' 分鐘前' : Math.round(mins/60) + ' 小時前';
  QD.getElementById('restoreText').textContent =
    `有 ${when}未完成的清單（${saved.cart.length} 個項目${saved.patient ? '．' + saved.patient : ''}）`;
  bar.classList.add('show');
  QD.getElementById('restoreBtn').addEventListener('click', function(){
    bar.classList.remove('show');
    applySavedState(saved);
    showToast('已還原上次的清單');
  });
  QD.getElementById('restoreDismiss').addEventListener('click', function(){
    bar.classList.remove('show');
    try{ localStorage.removeItem(LS_KEY); }catch(e){}
  });
})();

/* 稱謂變更時一併保存 */
(function(){
  const pi = QD.getElementById('patientNameInput');
  if(pi) pi.addEventListener('input', saveState);
})();

/* ═══════════════════════════════════════════════════════════════════
   鍵盤操作：Ctrl/⌘+K 或 / 叫出搜尋、Esc 返回選單
   ═══════════════════════════════════════════════════════════════════ */
function isTypingTarget(el){
  if(!el) return false;
  const t = el.tagName;
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable;
}

function focusSearch(){
  if(currentCat||currentDoc) goHome();
  setTimeout(function(){
    const el = QD.getElementById('searchInput');
    if(el){ el.focus(); el.select(); }
  }, currentCat ? 0 : 60);
}

QD.addEventListener('keydown', function(e){
  if((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')){
    e.preventDefault(); focusSearch(); return;
  }
  if(e.key === '/' && !isTypingTarget(e.target)){
    e.preventDefault(); focusSearch(); return;
  }
  if(e.key === 'Escape' && !isTypingTarget(e.target) && currentCat){
    goHome();
  }
});

/* 卡片支援鍵盤操作（Enter／空白鍵＝點選，方向鍵移動）
   採 roving tabindex：每個卡片區只留一個 Tab 停駐點。
   否則檢驗有 288 張卡，要按 288 次 Tab 才能離開卡片區到右側清單。 */
const CARD_BOXES = '#catGrid, #catExtraGrid, #itemsGrid';
function applyCardA11y(){
  QD.querySelectorAll('.cat-card, .item-card').forEach(function(el){
    if(!el.hasAttribute('role')) el.setAttribute('role','button');
    el.setAttribute('tabindex','-1');
  });
  QD.querySelectorAll(CARD_BOXES).forEach(function(box){
    const first = box.querySelector('.cat-card, .item-card');
    if(first) first.setAttribute('tabindex','0');
  });
}

/* 方向鍵在卡片區內移動焦點（僅在焦點已落在卡片上時作用，
   不會干擾一般瀏覽或文件檢視器的方向鍵） */
QD.addEventListener('keydown', function(e){
  if(currentDoc) return;
  if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'&&e.key!=='ArrowUp'&&e.key!=='ArrowDown') return;
  const cur=QD.activeElement;
  if(!cur||!cur.matches||!cur.matches('.cat-card, .item-card')) return;
  const box=cur.closest(CARD_BOXES);
  if(!box) return;
  const cards=[...box.querySelectorAll('.cat-card, .item-card')];
  const i=cards.indexOf(cur);
  if(i<0) return;
  const cols=Math.max(1,getComputedStyle(box).gridTemplateColumns.split(' ').filter(Boolean).length);
  let j=i;
  if(e.key==='ArrowRight') j=i+1;
  else if(e.key==='ArrowLeft') j=i-1;
  else if(e.key==='ArrowDown') j=i+cols;
  else j=i-cols;
  if(j<0||j>=cards.length) return;
  e.preventDefault();
  cards.forEach(c=>c.setAttribute('tabindex','-1'));
  cards[j].setAttribute('tabindex','0');
  cards[j].focus();
  cards[j].scrollIntoView({block:'nearest'});
});
QD.addEventListener('keydown', function(e){
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest && e.target.closest('.cat-card, .item-card');
  if(!card || isTypingTarget(e.target)) return;
  e.preventDefault();
  card.click();
});

/* 觸控裝置：長按 = 右鍵（切換自費／免自費）。滑鼠操作完全不受影響。 */
(function(){
  let lpTimer = null, lpFired = false;
  QD.addEventListener('pointerdown', function(e){
    if(e.pointerType !== 'touch') return;
    const card = e.target.closest('.item-card[data-id], .cart-item');
    if(!card) return;
    lpFired = false;
    lpTimer = setTimeout(function(){
      lpFired = true;
      card.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true, cancelable:true}));
      if(navigator.vibrate) navigator.vibrate(12);
    }, 550);
  }, {passive:true});
  ['pointerup','pointermove','pointercancel','pointerleave'].forEach(function(ev){
    QD.addEventListener(ev, function(){ clearTimeout(lpTimer); }, {passive:true});
  });
  /* 長按已處理過，攔掉隨後的 click 以免又被切換一次 */
  QD.addEventListener('click', function(e){
    if(!lpFired) return;
    lpFired = false;
    e.preventDefault(); e.stopPropagation();
  }, true);
})();

/* 捲動時同步搜尋下拉位置 */
QD.addEventListener('scroll', function(){
  if(QD.getElementById('searchResults').classList.contains('open'))
    positionSearchResults();
}, true);

/* ═══════════════════════════════════════════════════════════════════
   說明文件檢視器
   首頁按 X 顯示入口。圖片為 repo 內的獨立 .jpg，隨選載入並預抓鄰頁，
   主程式不內嵌圖檔，容量與載入速度不受影響。
   ═══════════════════════════════════════════════════════════════════ */
const DOC_ICONS = {
  docs: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M14 2.5H7.5A2 2 0 0 0 5.5 4.5v15a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M14 2.5V7h4.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M9 12h6M9 15.5h6M9 8.5h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
};

const DOC_SETS = [
  { id:'docs', label:'說明文件', desc:'診間說明與費用明細',
    items:[
      { label:'腸胃鏡費用明細', pages:['img/doc-endoscopy-fee.webp'] },
      { label:'檢測幽門桿菌',   pages:['img/doc-hp-test.jpg'] },
      { label:'營養點滴成分', pages:['img/doc-iv-nutrition.jpg'] },
      { label:'健檢方案比較', pages:['img/doc-health-check.jpg?v=20261028'] }
    ]
  }
];

let currentDoc = null;      /* 目前開啟的文件組 */
let docIdx = 0;             /* 目前項目索引 */
let docZoom = 'fit';        /* 'fit' 或倍率數值，換項目時沿用 */
const DOC_ZOOM_STEPS = [0.3,0.4,0.5,0.6,0.75,0.9,1,1.25,1.5,2,2.5,3];
const DOC_GAP = 12;         /* 兩頁並列的間距，需與 .doc-canvas 的 gap 一致 */

/* 首頁隱藏入口 */
function buildExtraCards(){
  const grid=QD.getElementById('catExtraGrid');
  if(!grid) return;
  grid.innerHTML='';
  DOC_SETS.forEach(set=>{
    const card=document.createElement('div');
    card.className='cat-card';
    card.innerHTML=`
      <div class="cat-icon">${DOC_ICONS[set.id]}</div>
      <div class="cat-label">${esc(set.label)}</div>
      <div class="cat-count-badge">${set.items.length} 份</div>`;
    card.addEventListener('click',()=>openDocSet(set.id));
    grid.appendChild(card);
  });
}

function toggleExtraCards(force){
  const box=QD.getElementById('catExtra');
  if(!box) return;
  const show = (force===undefined) ? !box.classList.contains('show') : !!force;
  box.classList.toggle('show', show);
  if(show){ applyCardA11y(); showToast('已顯示：說明文件'); }
}

function openDocSet(id){
  const set=DOC_SETS.find(s=>s.id===id);
  if(!set) return;
  currentDoc=set; docIdx=0; docZoom='fit';
  QD.getElementById('docIconEl').innerHTML=DOC_ICONS[set.id]||'';
  QD.getElementById('docTitleEl').textContent=set.label;
  QD.getElementById('docDescEl').textContent=set.desc;
  const home=QD.getElementById('screen-home');
  const docScreen=QD.getElementById('screen-doc');
  home.classList.remove('active'); home.classList.add('exit');
  setTimeout(()=>home.classList.remove('exit'),320);
  docScreen.classList.add('active');
  renderDocViewer(); renderDocRail();
}

function renderDocViewer(){
  const box=QD.getElementById('docCanvas');
  if(!box||!currentDoc) return;
  const item=currentDoc.items[docIdx];
  if(!item){ box.innerHTML=''; return; }
  QD.getElementById('docTopic').textContent=
    item.label + (item.pages.length>1 ? `（共 ${item.pages.length} 頁）` : '');
  /* 顯示中的圖片優先取得，並讓解碼在主執行緒外進行 */
  box.innerHTML = item.pages.map((src,i)=>
      `<img src="${src}" alt="${esc(item.label)} 第 ${i+1} 頁" data-loading="1"`
      + ` decoding="async" fetchpriority="high">`
    ).join('') + `<div class="doc-loading">載入中…</div>`;
  const imgs=[...box.querySelectorAll('img')];
  let left=imgs.length;
  const done=()=>{
    if(--left>0) return;
    imgs.forEach(im=>im.removeAttribute('data-loading'));
    const tip=box.querySelector('.doc-loading'); if(tip) tip.remove();
    applyDocZoom();
    /* 目前這一份顯示完成後才預抓下一份，不與它搶頻寬 */
    preloadDocNeighbours();
  };
  imgs.forEach(im=>{
    if(im.complete && im.naturalWidth) done();
    else{
      im.addEventListener('load',done,{once:true});
      im.addEventListener('error',()=>{
        const tip=box.querySelector('.doc-loading');
        if(tip) tip.textContent='圖片載入失敗，請確認 img 資料夾與 index.html 放在一起';
        done();
      },{once:true});
    }
  });
}

/* 兩頁並列時，fit 需把間距一併算進可用寬度，兩頁才會同時完整顯示 */
function applyDocZoom(){
  const box=QD.getElementById('docCanvas');
  if(!box) return;
  const imgs=[...box.querySelectorAll('img')].filter(im=>im.naturalWidth);
  if(!imgs.length) return;
  const label=QD.getElementById('docZoomVal');
  const sumW=imgs.reduce((s,im)=>s+im.naturalWidth,0);
  const maxH=Math.max(...imgs.map(im=>im.naturalHeight));
  let scale;
  if(docZoom==='fit'){
    const availW=box.clientWidth-20-DOC_GAP*(imgs.length-1);
    const availH=box.clientHeight-20;
    scale=Math.min(availW/sumW, availH/maxH);
    if(label) label.textContent='整頁 '+Math.round(scale*100)+'%';
  } else {
    scale=docZoom;
    if(label) label.textContent=Math.round(scale*100)+'%';
  }
  imgs.forEach(im=>{
    im.style.width=Math.max(80,Math.floor(im.naturalWidth*scale))+'px';
    im.style.height='auto'; im.style.maxWidth='none';
  });
}

function docCurrentScale(){
  const box=QD.getElementById('docCanvas');
  const im=box&&box.querySelector('img');
  if(!im||!im.naturalWidth) return 1;
  return im.getBoundingClientRect().width/im.naturalWidth;
}
function docZoomStep(dir){
  const cur=(docZoom==='fit')?docCurrentScale():docZoom;
  let next;
  if(dir>0) next=DOC_ZOOM_STEPS.find(z=>z>cur+0.01);
  else next=[...DOC_ZOOM_STEPS].reverse().find(z=>z<cur-0.01);
  if(next===undefined) return;
  docZoom=next; applyDocZoom();
}
function docFit(){ docZoom='fit'; applyDocZoom(); }

/* 頁面內最大化：不使用瀏覽器全螢幕 API，避免跳出系統提示列 */
/* 工作台切到別的分頁時，先結束最大化 */
window.Q_EXIT_MAX = function(){ if(QB.classList.contains('doc-max')) docToggleMax(); };
function docToggleMax(){
  const on=QB.classList.toggle('doc-max');
  document.body.classList.toggle('q-max', on);   /* 工作台的頂端列與底列一起收起 */
  const btn=QD.getElementById('docMaxBtn');
  if(btn){ btn.textContent = on?'還原':'最大化'; btn.title = on?'結束最大化（按 F 或 Esc 鍵）':'最大化（按 F 鍵）'; }
  setTimeout(applyDocZoom,0);
}

function renderDocRail(){
  const rail=QD.getElementById('docRail');
  if(!rail||!currentDoc) return;
  rail.innerHTML='';
  currentDoc.items.forEach((it,i)=>{
    const tab=document.createElement('div');
    tab.className='doc-tab'+(i===docIdx?' current':'');
    tab.innerHTML=`<span>${esc(it.label)}</span><span class="doc-tab-pages">${it.pages.length} 頁</span>`;
    tab.onclick=()=>selectDocItem(i);
    rail.appendChild(tab);
  });
  const cur=rail.querySelector('.doc-tab.current');
  if(cur&&cur.scrollIntoView) cur.scrollIntoView({block:'nearest'});
}

function selectDocItem(i){
  if(!currentDoc) return;
  docIdx=i;
  renderDocViewer(); renderDocRail();
  const box=QD.getElementById('docCanvas');
  if(box){ box.scrollTop=0; box.scrollLeft=0; }
}

/* 預抓鄰近項目：改為「顯示完成 → 瀏覽器閒置 → 一張一張抓」，
   且標記低優先度。原本是切換項目時立刻同時抓前後兩份，
   一次湧入約 1 MB，會拖慢正在看的那一頁。 */
const docPreloaded=new Set();
let _docPreloadTimer=null;
/* 帶 timeout：瀏覽器若一直不閒置（或分頁在背景被節流），
   仍保證在時限內執行，預抓不會永遠不發生 */
const _idle = window.requestIdleCallback
  ? (cb)=>window.requestIdleCallback(cb,{timeout:1200})
  : (cb)=>setTimeout(cb,200);

function preloadDocNeighbours(){
  if(!currentDoc) return;
  clearTimeout(_docPreloadTimer);
  /* 省流量或 2G 時不預抓 */
  const c=navigator.connection;
  if(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType||''))) return;
  const n=currentDoc.items.length;
  if(n<2) return;
  const queue=[];
  [(docIdx+1)%n,(docIdx-1+n)%n].forEach(i=>{
    (currentDoc.items[i].pages||[]).forEach(src=>{
      if(!docPreloaded.has(src) && queue.indexOf(src)===-1) queue.push(src);
    });
  });
  if(!queue.length) return;
  const step=()=>{
    if(!currentDoc) return;              /* 已離開檢視器就停止 */
    const src=queue.shift();
    if(!src) return;
    docPreloaded.add(src);
    const im=new Image();
    if('fetchPriority' in im) im.fetchPriority='low';
    im.decoding='async';
    im.onload=im.onerror=()=>_idle(step);
    im.src=src;
  };
  _docPreloadTimer=setTimeout(()=>_idle(step),300);
}

/* ─── 右鍵列印 ──────────────────────────────────────────────────────
   以隱藏 iframe 列印，只跳出列印對話框、不另開分頁。
   每一頁各自成為一張 A4，多頁文件會分張列印，不並列。
   ─────────────────────────────────────────────────────────────────── */
function printDocPages(srcs, title, landscape){
  const list = Array.isArray(srcs) ? srcs : [srcs];
  const body = list.map(src =>
    `<div class="pp"><img src="${esc(src)}" alt=""></div>`).join('');
  const pageW = landscape ? '297mm' : '210mm';
  const pageH = landscape ? '210mm' : '297mm';

  const frame=document.createElement('iframe');
  frame.setAttribute('aria-hidden','true');
  frame.style.cssText='position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0;opacity:0;';
  QB.appendChild(frame);

  const win=frame.contentWindow, doc=win.document;
  doc.open();
  doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+esc(title)+'</title>'
    /* 圖片是外部檔案，需要 base 才能解析 img/ 相對路徑 */
    +'<base href="'+location.href+'">'
    +'<style>'
    +'html,body{margin:0;padding:0;background:#fff;}'
    +'@page{margin:0;size:A4 '+(landscape?'landscape':'portrait')+';}'
    +'.pp{width:'+pageW+';height:'+pageH+';overflow:hidden;'
    +'display:flex;align-items:center;justify-content:center;'
    +'page-break-after:always;break-after:page;}'
    +'.pp:last-child{page-break-after:auto;break-after:auto;}'
    +'.pp img{max-width:100%;max-height:100%;display:block;}'
    +'</style></head><body>'+body+'</body></html>');
  doc.close();

  const originalTitle=document.title;
  let done=false;

  /* win.focus() 會把焦點移進隱藏 iframe，之後鍵盤事件只送到 iframe 的
     document，父文件的方向鍵／快捷鍵就全部失效。列印結束後必須把焦點交回。 */
  const restoreFocus=()=>{
    try{
      window.focus();
      const cv=QD.getElementById('docCanvas');
      if(currentDoc && cv) cv.focus({preventScroll:true});
      else if(QB && QB.focus) QB.focus({preventScroll:true});
    }catch(e){}
  };

  const cleanup=()=>{
    if(done) return; done=true;
    if(document.title===title) document.title=originalTitle;
    window.removeEventListener('afterprint',cleanup);
    try{ win.removeEventListener('afterprint',cleanup); }catch(e){}
    setTimeout(()=>{
      if(frame.parentNode) frame.parentNode.removeChild(frame);
      restoreFocus();
    },800);
  };
  const run=()=>{
    try{
      document.title=title;          /* 另存 PDF 的預設檔名 */
      /* afterprint 不保證在父視窗觸發，iframe 的 window 才是實際列印者，
         兩邊都掛才不會讓 iframe 滯留到 120 秒逾時 */
      window.addEventListener('afterprint',cleanup);
      try{ win.addEventListener('afterprint',cleanup); }catch(e){}
      win.focus(); win.print();
      restoreFocus();                /* print() 為同步阻塞，對話框關閉後立即收回焦點 */
      setTimeout(cleanup,120000);
    }catch(err){ cleanup(); restoreFocus(); showToast('列印失敗：'+err.message); }
  };
  /* 等圖片載完再列印，否則會印出空白頁 */
  const pending=[...doc.images].filter(im=>!im.complete)
    .map(im=>new Promise(r=>{ im.onload=im.onerror=r; }));
  Promise.all(pending).then(()=>setTimeout(run,80));
}

/* 依目前顯示的圖片判斷紙張方向（說明文件多為橫式） */
function docIsLandscape(){
  const imgs=[...QD.querySelectorAll('#docCanvas img')].filter(i=>i.naturalWidth);
  return imgs.length ? imgs.every(i=>i.naturalWidth>i.naturalHeight) : false;
}
function printDocItem(pageIdx){
  if(!currentDoc) return;
  const item=currentDoc.items[docIdx];
  if(!item) return;
  const landscape=docIsLandscape();
  if(pageIdx===undefined){
    printDocPages(item.pages, currentDoc.label+'_'+item.label, landscape);
  } else {
    printDocPages([item.pages[pageIdx]],
      currentDoc.label+'_'+item.label+'_第'+(pageIdx+1)+'頁', landscape);
  }
}

/* ─── 複製圖片／另存圖片 ────────────────────────────────────────────
   另存：直接下載原始圖檔，不經過 canvas。
   複製：fetch 取得原始圖檔 bytes 後寫入剪貼簿，同樣不經過 canvas——
   本機以 file:// 開啟時，canvas 讀取跨「檔案」的圖片像素會被瀏覽器視為
   tainted 而擋下，fetch 同一份檔案則不受此限制。
   ─────────────────────────────────────────────────────────────────── */
function docImageFileName(item,pageIdx){
  const src=item.pages[pageIdx];
  const ext=(src.split('?')[0].split('.').pop()||'jpg').toLowerCase();
  const n=item.pages.length;
  return currentDoc.label+'_'+item.label+(n>1?'_第'+(pageIdx+1)+'頁':'')+'.'+ext;
}
function saveDocImage(pageIdx){
  const item=currentDoc && currentDoc.items[docIdx];
  if(!item) return;
  const a=document.createElement('a');
  a.href=item.pages[pageIdx];
  a.download=docImageFileName(item,pageIdx);
  QB.appendChild(a); a.click(); a.remove();
}
async function copyDocImage(pageIdx){
  const item=currentDoc && currentDoc.items[docIdx];
  if(!item) return;
  if(!navigator.clipboard || !window.ClipboardItem){ showToast('此瀏覽器不支援複製圖片'); return; }
  try{
    const res=await fetch(item.pages[pageIdx]);
    const blob=await res.blob();
    await navigator.clipboard.write([new ClipboardItem({[blob.type||'image/jpeg']:blob})]);
    showToast('已複製圖片到剪貼簿');
  }catch(err){ showToast('複製失敗：'+err.message); }
}

function closeDocMenu(){
  const old=QD.getElementById('docCtxMenu');
  if(old) old.remove();
}
function showDocMenu(e){
  if(!currentDoc) return;
  const item=currentDoc.items[docIdx];
  if(!item) return;
  e.preventDefault();
  closeDocMenu();
  const menu=document.createElement('div');
  menu.id='docCtxMenu'; menu.className='doc-ctx-menu';
  const add=(label,fn)=>{
    const b=document.createElement('button');
    b.type='button'; b.className='doc-ctx-item'; b.textContent=label;
    b.onclick=()=>{ closeDocMenu(); fn(); };
    menu.appendChild(b);
  };
  const sep=()=>{ const s=document.createElement('div'); s.className='doc-ctx-sep'; menu.appendChild(s); };
  const n=item.pages.length;
  add(n>1 ? `列印這一份（${n} 頁）` : '列印這一份', ()=>printDocItem());
  if(n>1){
    sep();
    item.pages.forEach((_,i)=>add('只印第 '+(i+1)+' 頁', ()=>printDocItem(i)));
  }
  sep();
  if(n>1){
    item.pages.forEach((_,i)=>add('複製第 '+(i+1)+' 頁的圖片', ()=>copyDocImage(i)));
  } else {
    add('複製圖片', ()=>copyDocImage(0));
  }
  sep();
  if(n>1){
    item.pages.forEach((_,i)=>add('另存第 '+(i+1)+' 頁為圖片', ()=>saveDocImage(i)));
  } else {
    add('另存圖片', ()=>saveDocImage(0));
  }
  QB.appendChild(menu);
  const r=menu.getBoundingClientRect();
  menu.style.left=Math.max(8,Math.min(e.clientX, window.innerWidth  - r.width  - 8))+'px';
  menu.style.top =Math.max(8,Math.min(e.clientY, window.innerHeight - r.height - 8))+'px';
}
QD.getElementById('docCanvas').addEventListener('contextmenu',showDocMenu);
QD.addEventListener('click',closeDocMenu);
QD.addEventListener('scroll',closeDocMenu,true);
window.addEventListener('resize',closeDocMenu);

QD.getElementById('docBackBtn').addEventListener('click',goHome);
QD.getElementById('docZoomIn').addEventListener('click',()=>docZoomStep(1));
QD.getElementById('docZoomOut').addEventListener('click',()=>docZoomStep(-1));
QD.getElementById('docFitBtn').addEventListener('click',docFit);
QD.getElementById('docMaxBtn').addEventListener('click',docToggleMax);
QD.getElementById('docPrintBtn').addEventListener('click',()=>printDocItem());
window.addEventListener('resize',()=>{ if(currentDoc) applyDocZoom(); });

/* 文件檢視器鍵盤操作 */
QD.addEventListener('keydown',function(e){
  if(!currentDoc||isTypingTarget(e.target)) return;
  const n=currentDoc.items.length;
  if(e.key==='ArrowLeft'||e.key==='ArrowUp'){ e.preventDefault(); selectDocItem((docIdx-1+n)%n); }
  else if(e.key==='ArrowRight'||e.key==='ArrowDown'){ e.preventDefault(); selectDocItem((docIdx+1)%n); }
  else if(e.key==='+'||e.key==='='){ e.preventDefault(); docZoomStep(1); }
  else if(e.key==='-'||e.key==='_'){ e.preventDefault(); docZoomStep(-1); }
  else if(e.key==='0'){ e.preventDefault(); docFit(); }
  else if(e.key==='f'||e.key==='F'){ e.preventDefault(); docToggleMax(); }
  else if(e.key==='Escape'){
    e.preventDefault();
    /* 右鍵選單開著時，Esc 先關選單，不要直接離開 */
    if(QD.getElementById('docCtxMenu')) closeDocMenu();
    else if(QB.classList.contains('doc-max')) docToggleMax();
    else goHome();
  }
});

/* 首頁按 X（不分大小寫）顯示／收起隱藏功能區 */
QD.addEventListener('keydown',function(e){
  if(e.key!=='x'&&e.key!=='X') return;
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(isTypingTarget(e.target)) return;
  if(currentCat||currentDoc) return;          /* 僅限主畫面 */
  e.preventDefault();
  toggleExtraCards();
});

/* Init */
buildHome(); buildExtraCards(); renderCart(); applyCardA11y();
_initDone = true;
})();
