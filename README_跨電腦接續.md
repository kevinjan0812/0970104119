# 禮儀案件管理系統－跨電腦接續懶人包

## 新電腦第一次使用

1. 將整個 ZIP 複製到新電腦。
2. 解壓縮到一個固定資料夾，例如：`C:\Users\你的名字\Documents\禮儀案件管理系統`。
3. 確認電腦已安裝 Python；若未安裝，可從 Python 官方網站安裝，安裝時勾選「Add Python to PATH」。
4. 雙擊 `啟動本機網站.cmd`。
5. 瀏覽器會開啟：`http://127.0.0.1:8765/index.html`。
6. 使用原本的帳號登入；案件資料儲存在 Supabase，使用相同公司與帳號即可讀取同一批雲端資料。

## 繼續修改程式

主要檔案：

- `index.html`：網頁結構。
- `styles.css`：所有畫面與手機版樣式。
- `script.js`：案件表單與本機功能。
- `supabase-config.js`：Supabase 公開連線設定。
- `supabase-integration.js`：登入、雲端資料同步、權限與 LINE 整合。
- `禮儀案件管理系統.html`：與 `index.html` 相同的中文檔名入口，保留相容性。

若要交給 Codex 繼續開發，請直接開啟解壓縮後的整個資料夾，不要只提供單一 HTML 檔。

## 每次本機測試

雙擊 `啟動本機網站.cmd` 即可。伺服器視窗需要保持開啟；測試完成後可直接關閉該視窗。

不要直接雙擊 HTML 使用 `file:///` 開啟，因為瀏覽器可能阻擋外部 JavaScript、Supabase 登入或跨檔案載入。

## 更新 Netlify

將以下 6 個正式網頁檔案一起上傳到 Netlify：

- `index.html`
- `styles.css`
- `script.js`
- `supabase-config.js`
- `supabase-integration.js`
- `禮儀案件管理系統.html`

`README_跨電腦接續.md` 與 `啟動本機網站.cmd` 只供本機使用，不上傳也可以。

## 注意事項

- 不要把 Supabase 的 `service_role` 金鑰、密碼或私人 Token 寫進這個資料夾。
- `supabase-config.js` 使用的是可放在瀏覽器端的公開金鑰。
- 新電腦若登入後看不到案件，先確認登入的是相同帳號、相同公司，而不是複製本機瀏覽器資料。
