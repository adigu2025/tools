# 院內作業指引原始檔

工作台「管藥與麻醉」分類的院內指引（`img/guide-*.webp`）版面原始檔。改文字時改這裡，再重新輸出圖片。

| 檔案 | 內容 |
|---|---|
| `sedation-guide.html` | 內視鏡輕中度鎮靜用藥指引，A4 直式 2 頁 |

## 輸出步驟

1. 執行 `consent-src/serve.ps1`（PowerShell），用瀏覽器打開 `http://localhost:8769/guide-src/sedation-guide.html`。
2. 主控台執行 `fitReport()`，每頁數字都要大於 0（等於 0 代表內容壓到頁尾）。
3. 執行 `await renderAll()`，WebP 存進 `consent-src/out/tools/`。
4. 複製到工作台的 `img/`，`sw.js` 的快取版號加一，頁數有變時改 `edu/edu.js` 的 `FORMS`，並更新 `revision.js`。

詞語不跨行由 `kit/keep-words.js` 的 `keepWords()` 在載入後自動處理，規則見 `consent-src/README.md`。
