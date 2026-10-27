# tools

木子澄安診所　工作台：臨床計算、減重報告、健檢報告、衛教圖卡、列印表單整合在同一個頁面。

線上版：<https://adigu2025.github.io/tools/>

| 路徑 | 內容 | 單獨開啟 |
|---|---|---|
| `index.html` | 工作台（四個分頁、衛教圖卡、列印表單），臨床計算與減重報告直接載入這一頁 | <https://adigu2025.github.io/tools/> |
| `calc/` | 臨床計算與自我評估（原 muzi-calc repo）：`view.html`（畫面與樣式）、`app.js`；`index.html` 是病人版，與工作台載入同一份畫面，`hub.css` 只在工作台加上 | <https://adigu2025.github.io/tools/calc/> |
| `weight/` | 減重報告：`view.html`（畫面與樣式）、`app.js`、`report.js`；`index.html` 只轉址到工作台 | |
| `checkup/` | 健檢報告：`view.html`（畫面與樣式）、`app.js`（優品 PDF 擷取、判讀規則）、`report.js`（A4 報告排版）。報告樣式與排版函式借用 `weight/report.js`，所以工作台等減重報告載入後才載入 | |
| `mount.js` | `mountView()`：把各工具的 view.html 裝進 shadow root，再依序載入程式 | |
| `forms/` | 減重門診評估問卷、健康紀錄表的題目、版面與樣式（列印表單與減重報告共用） | |
| `img/` | 所有衛教、表單與同意書圖片 | |
| `consent-src/` | 檢查治療同意書的版面原始檔 | |

臨床計算與減重報告的畫面分別放在 `#calc-host`、`#weight-host` 的 shadow root 裡，樣式與 id 不會和工作台互相影響。
程式一律用 shadow root 找元素與掛事件（計算 `CD`、減重 `WD`），用取代 body 的捲動區處理捲動（計算 `CB` 是 `.c-body`、減重 `WB` 是 `.w-body`），不可直接用 `document`。
兩個子資料夾 2026-10-15 以 git subtree 併入，原本的修改紀錄都保留在這個 repo。

## 整合進度（逐步改成單一工作台，不再依賴 iframe）

1. 列印表單：問卷與健康紀錄表改由 `forms/forms.js` 產生，工作台直接載入，不再向減重系統借用（2026-10-27）。減重系統也載入同一個檔案。
2. 減重報告：不再用 iframe，畫面直接放進工作台（2026-10-27）。圖片移到工作台 `img/`，舊網址 `tools/weight/` 轉到工作台。
3. 臨床計算：不再用 iframe，畫面直接放進工作台（2026-10-27）。病人版 `calc/` 也改成載入同一份 `view.html`，原 `styles.css` 已併入。減重系統刪除工作台用不到的首頁、衛教檢視器、列印單張與 13 張舊 JPG。
