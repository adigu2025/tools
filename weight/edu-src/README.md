# 減重衛教單版面原始檔

`weight/img/` 裡 13 張減重衛教圖（11 張衛教圖卡＋地中海飲食 2 頁）的版面原始檔。改文字或排版時改這裡，再輸出成 WebP 覆蓋 `weight/img/` 的同名檔案。

## 檔案

| 檔案 | 用途 |
|---|---|
| `pages.html` | 13 頁版面（A4 直式 794 × 1123，針劑注射與保存為兩頁並列） |
| `crop/` | 版面用到的圖片：診所標誌、藥品照片、餐盤、胃部示意圖 |
| `serve.ps1` | 本機輸出用的伺服器（連接埠 8767），接收瀏覽器輸出的圖片並存進 `out/` |

## 輸出步驟

1. 在這個資料夾執行 `serve.ps1`（PowerShell）。
2. 用瀏覽器打開 `http://localhost:8767/pages.html`。
3. 在瀏覽器主控台執行 `await renderAll()`，13 張 WebP 會存進 `out/`。只輸出其中幾張：`await renderAll(['edu-medication-options'])`。
4. 執行 `fitReport()` 確認每頁數字都大於 0（代表內容沒有壓到頁尾）。
5. 把 `out/` 的檔案複製到 `weight/img/`，並更新 `weight/app.js` 的 `APP_REVISION`。

## 排版規則

- 標題與短句一律手動斷行（`<br>`），斷在標點或語意完整處，不從詞語中間切斷。
- 數字與單位之間用 `&nbsp;`（例：`2.4&nbsp;mg`），避免單位被擠到下一行。
- 風格：刊頭雙線、金色 01／02 段落編號、細線分段、頁尾診所地址電話；不用 AI 生成的插圖。

## 圖片來源

- `crop/wegovy-official.png`：Novo Nordisk 官方 Wegovy media kit 的 FlexTouch 圖（wegovy-flextouch-group-lr.png），取 0.25 mg 與 2.4 mg 兩支並調成米色底。頁面已註明「週纖達筆型圖片：Novo Nordisk」。
- `crop/rybelsus.png`、`crop/mounjaro.png`：沿用舊版衛教圖裁切，待換成診所自拍的藥盒照片。
- 其餘裁切自舊版衛教圖；胃部示意圖已轉成品牌色單色。
