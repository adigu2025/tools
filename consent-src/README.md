# 同意書版面原始檔

`img/consent-*.webp` 七份同意書（14 頁）的版面原始檔，同一份輸出也給報價系統（clinic-planner 的 `img/consent-*.jpg`）。改文字或排版時改這裡，兩邊一起換圖。

## 檔案

| 檔案 | 用途 |
|---|---|
| `p-gastro.html` 等 `p-*.html` | 每份同意書一個檔案：胃鏡、大腸鏡、膠囊、輕中度鎮靜、靜脈麻醉、冷凝刀、甲狀腺穿刺 |
| `head.html`、`tail.html` | 共用樣式；頁首、頁尾與簽名欄（`.final[data-kind]`）由 `tail.html` 的程式填入 |
| `pages.html` | 由上面檔案串接而成，實際打開輸出的頁面 |
| `crop/` | 診所標誌與插圖（灰階），多數裁切自舊版同意書，裁切座標見 `crop.html` |
| `serve.ps1` | 本機輸出用的伺服器（連接埠 8769），接收瀏覽器輸出的圖片並存進 `out/` |

## 輸出步驟

1. 改完 `p-*.html` 後重新串接：`cat head.html p-gastro.html p-colon.html p-capsule.html p-sedation.html p-anesthesia.html p-het.html p-thyroid.html tail.html > pages.html`
2. 執行 `serve.ps1`（PowerShell），用瀏覽器打開 `http://localhost:8769/consent-src/pages.html`。
3. 主控台執行 `fitReport()`，每頁數字都要大於 0（等於 0 代表內容壓到頁尾）。
4. 執行 `await renderAll()`：工作台用的 WebP 存進 `out/tools/`，報價系統用的 JPG 存進 `out/planner/`。只輸出其中幾頁：`await renderAll(['consent-het-2'])`。
5. 複製到兩邊的 `img/`。工作台要把 `sw.js` 的快取版號加一（同名圖片換內容），頁數有變時改 `index.html` 的 `FORMS`；報價系統頁數有變時改同意書的頁面陣列。兩邊都更新 `APP_REVISION`。

## 規則

- 黑白列印版，A4 直式；第 1 頁說明，最後一頁費用、同意與簽名。
- 版本標示在 `tail.html` 的 `VER`，改版時一起改。
- 麻醉同意書依衛福部範本的項目編排（擬實施之麻醉、副作用與併發症、簽署身分、醫師之聲明、病人之聲明），文字改寫為白話。
