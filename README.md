# tools

木子澄安診所　工作台：報價、臨床計算、減重報告、健檢報告、衛教與表單（衛教圖卡＋列印表單）整合在同一個頁面。

線上版：<https://adigu2025.github.io/tools/>

| 路徑 | 內容 | 單獨開啟 |
|---|---|---|
| `index.html`、`hub.js` | 工作台（四個分頁：報價、臨床計算、衛教與表單、製作報告）。`index.html` 是版面與樣式，主程式（載入各工具、分頁切換、快捷鍵、`QUOTE_PRINT`／`CALC_PRINT` 列印）在 `hub.js`（2026-11-18 從 index.html 拆出）；衛教與表單的清單在 `edu/edu.js`、表單預覽在 `forms/view.js` | <https://adigu2025.github.io/tools/> |
| `quote/` | 報價（醫療費用規劃，原 clinic-planner repo）：`view.html`（畫面與樣式）、`data.js`（價目資料：品項與價格、內視鏡選單、備註、優惠金額、套組成分 `PANEL_PARTS`，改價格只改這一份）、`app.js`（畫面與計算）；`hub.css` 是工作台外觀（只套螢幕，列印的報價單維持品牌配色）；`index.html` 只轉址到工作台 | |
| `calc/` | 臨床計算與自我評估（原 muzi-calc repo）：`view.html`（畫面與樣式）、`app.js`（BMI、TDEE、FIB-4、R Factor、Child-Pugh、MELD-Na、Glasgow-Blatchford、降血脂與 B 肝給付判定）、`assess.js`（自我評估題組的題目、計分與建議）；`index.html` 是病人版，與工作台載入同一份畫面，`hub.css` 只在工作台加上；`rules.js` 是降血脂與 B 肝判定頁「給付規定」按鈕的條文摘要、生效日與最後查核日（aria 每週查健保署新公告，有新修訂時改判讀邏輯並同步改這份；最後查核超過 35 天，畫面會提醒、`tests/calc.test.js` 會擋下） | <https://adigu2025.github.io/tools/calc/> |
| `weight/` | 減重報告：`view.html`（畫面與樣式）、`app.js`、`report.js`；`index.html` 只轉址到工作台 | |
| `checkup/` | 健檢報告：`view.html`（畫面與樣式）、`app.js`（優品 PDF 擷取、判讀規則、加選模組、PREVENT 與 TwCCCC 心血管風險、大腸鏡間隔、公費篩檢資格、貼上英文超音波報告；上傳 TANITA、超音波、胃腸鏡與病理報告會自動判讀並附在報告後面，圖片與掃描檔用 Tesseract.js 在瀏覽器裡辨識英文；追蹤時程可由醫師修改；Esc 回報告種類）、`report.js`（A4 報告、歷年趨勢圖、LINE 摘要圖）。報告樣式、排版函式與判讀標準在共用的 `kit/report-kit.js`，不依賴減重報告 | |
| `kit/` | `report-kit.js`：減重與健檢報告共用的 A4 排版、Logo、PDF 函式庫載入、TANITA 擷取、運動處方，以及 BMI、腰圍、血壓（130/80）判讀標準；`keep-words.js`：詞語不跨行；`render-images.js`：衛教單、同意書、院內指引圖片一鍵重新產生（見下方「檢查與圖片」） | |
| `edu/` | `edu.js`：衛教圖卡與列印表單的資料、合併的側欄清單（ITEMS）、圖卡縮放、單份列印 | |
| `revision.js` | 各工具的最後改版日期與這次改版的簡短說明（`REVISION_NOTE`），工作台左下角顯示最晚的日期、點一下看說明；報價單的價目版本另見 `quote/app.js` 的 `Q_PRICE_VERSION` | |
| `mount.js` | `mountView()`：把各工具的 view.html 裝進 shadow root，再依序載入程式 | |
| `forms/` | `forms.js`：減重門診評估問卷、健康紀錄表的題目、版面與樣式（列印表單與減重報告共用）；`view.js`：表單的多頁並排預覽與共用列印 | |
| `img/` | 所有衛教、表單與同意書圖片 | |
| `edu-src/`、`guide-src/` | 衛教單（A5、A4）與院內指引的版面原始檔，說明在各自的 README | |
| `consent-src/` | 檢查治療同意書的版面原始檔 | |
| `tests/` | 自動檢查（見下方「檢查與圖片」） | |

報價、臨床計算與減重報告的畫面分別放在 `#quote-host`、`#calc-host`、`#weight-host` 的 shadow root 裡，樣式與 id 不會和工作台互相影響。
程式一律用 shadow root 找元素與掛事件（報價 `QD`、計算 `CD`、減重 `WD`），用取代 body 的區塊處理捲動（報價 `QB` 是 `.q-body`、計算 `CB` 是 `.c-body`、減重 `WB` 是 `.w-body`），不可直接用 `document`。
兩個子資料夾 2026-10-15 以 git subtree 併入，原本的修改紀錄都保留在這個 repo。

## 整合進度（逐步改成單一工作台，不再依賴 iframe）

1. 列印表單：問卷與健康紀錄表改由 `forms/forms.js` 產生，工作台直接載入，不再向減重系統借用（2026-10-27）。減重系統也載入同一個檔案。
2. 減重報告：不再用 iframe，畫面直接放進工作台（2026-10-27）。圖片移到工作台 `img/`，舊網址 `tools/weight/` 轉到工作台。
3. 臨床計算：不再用 iframe，畫面直接放進工作台（2026-10-27）。病人版 `calc/` 也改成載入同一份 `view.html`，原 `styles.css` 已併入。減重系統刪除工作台用不到的首頁、衛教檢視器、列印單張與 13 張舊 JPG。
4. 報價：原 clinic-planner repo 併入（2026-10-31），排在第一個分頁。分頁順序改為報價、臨床計算、衛教圖卡、製作報告、列印表單（Alt+1 至 Alt+5）。報價程式整段包在函式裡，事件掛在 shadow root，Ctrl+K 等快捷鍵只在報價分頁作用；列印由工作台 `QUOTE_PRINT` 只印報價區。說明文件圖片移到工作台 `img/`。
5. 共用報告元件：減重與健檢報告共用的排版與判讀標準抽成 `kit/report-kit.js`，健檢報告不再依賴減重報告；衛教圖卡與列印表單的程式移出 `index.html`；改版日期集中在 `revision.js`（2026-11-04）。
6. 拆檔（2026-11-18）：報價價目資料移到 `quote/data.js`、臨床計算自我評估題組移到 `calc/assess.js`、工作台主程式移到 `hub.js`；拆之前先補上報價與檢驗判讀的測試。

## 檢查與圖片

改完任何工具，在主 repo 執行 `node 檢查全部.js`（會跑下面每一項）。個別執行時在 tools 資料夾：

| 指令 | 檢查什麼 |
|---|---|
| `node tests/quote.test.js` | 報價：價目資料（id 不重複、價格是數字、套組成分都指到存在的品項）、優惠規則、重複計費與前提條件提醒 |
| `node tests/calc.test.js` | 臨床計算：FIB-4、BMI、R Factor、Child-Pugh、MELD-Na、Glasgow-Blatchford、檢驗截圖辨識、降血脂給付、給付規定最後查核日 |
| `node tests/lab.test.js` | 減重與健檢報告共用的檢驗判讀（lab/lab.js）：數值與日期、代碼對照、參考區間、各項判讀、報告逐列擷取、TwCCCC |
| `node tests/print.test.js` | 列印與 PDF：@page 邊界都是 0（不印網址與日期）、每條列印路徑都有、報告列印前執行斷詞 |
| `node tests/ux.test.js` | 工作台畫面：注音 Enter、文字對比、金色小字、字級、label、alert、數字鍵盤、placeholder |
| `node kit/keep-words.test.js` | 詞語不跨行 |

改了衛教單、同意書或院內指引的原始檔，用一個指令重新產生圖片（需要電腦上有 Chrome 或 Edge，並連網載入字型）：

```
node kit/render-images.js a5 edu-a5-gerd     # 只產生指定的幾張
node kit/render-images.js consent            # 同意書全部（會先重新串接 pages.html）
node kit/render-images.js all                # 全部
```

它會先檢查內容有沒有壓到頁尾，再輸出、把有變的圖片複製到 `img/`，並把 `sw.js` 的快取版號加一。新增的圖片仍要自己加進 `edu/edu.js` 的側欄清單，並更新 `revision.js`。
