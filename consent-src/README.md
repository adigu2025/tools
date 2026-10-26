# 同意書版面原始檔

工作台 `img/consent-*.webp` 同意書的版面原始檔。改文字或排版時改這裡，再重新輸出圖片。報價系統已不放同意書。

## 檔案

| 檔案 | 用途 |
|---|---|
| `p-gastro.html` 等 `p-*.html` | 每份同意書一個檔案：胃鏡、大腸鏡、膠囊、輕中度鎮靜、冷凝刀、甲狀腺穿刺 |
| `head.html`、`tail.html` | 共用樣式；頁首、頁尾與簽名欄（`.final[data-kind]`）由 `tail.html` 的程式填入 |
| `pages.html` | 由上面檔案串接而成，實際打開輸出的頁面 |
| `crop/` | 診所標誌與插圖（灰階），多數裁切自舊版同意書，裁切座標見 `crop.html` |
| `serve.ps1` | 本機輸出用的伺服器（連接埠 8769），接收瀏覽器輸出的圖片並存進 `out/` |

麻醉同意書（`img/consent-anesthesia-*.webp`）沿用舊版圖檔，不在這裡產生。

## 輸出步驟

1. 改完 `p-*.html` 後重新串接：`cat head.html p-gastro.html p-colon.html p-capsule.html p-sedation.html p-het.html p-thyroid.html tail.html > pages.html`
2. 執行 `serve.ps1`（PowerShell），用瀏覽器打開 `http://localhost:8769/consent-src/pages.html`。
3. 主控台執行 `fitReport()`，每頁數字都要大於 0（等於 0 代表內容壓到頁尾）。
4. 執行 `await renderAll()`，WebP 存進 `out/tools/`。只輸出其中幾頁：`await renderAll(['consent-het-2'])`。
5. 複製到工作台的 `img/`，把 `sw.js` 的快取版號加一（同名圖片換內容），頁數有變時改 `index.html` 的 `FORMS`，並更新 `APP_REVISION`。

## 規則

- 黑白列印版，A4 直式；第 1 頁說明，最後一頁費用、同意與簽名。
- 同意文字之後另起一行，縮排兩字寫「此致　木子澄安診所」（`.salute`）。簽署頁標題下方不放姓名與病歷號碼，簽名欄已有。
- 版本標示在 `tail.html` 的 `VER`，改版時一起改。
