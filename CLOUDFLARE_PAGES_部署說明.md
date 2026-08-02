# Cloudflare Pages 部署說明

## 不透過 GitHub（最快）

1. 登入 Cloudflare Dashboard。
2. 進入 Workers & Pages，選擇 Create application / Pages。
3. 選擇 Direct Upload（直接上傳）。
4. 上傳 `cloudflare-pages-deploy.zip`，或將部署資料夾內的檔案拖入上傳區。
5. 完成部署後，Cloudflare 會提供 `*.pages.dev` 網址。

此專案是純靜態網站，不需要設定 Build command、Framework preset 或環境變數。

## 透過 GitHub（適合長期維護）

GitHub 不是必要條件。若連接 GitHub，之後每次 push 都能自動重新部署。設定如下：

- Framework preset：None
- Build command：留空
- Build output directory：`/`（若網站檔案放在 repository 根目錄）

## Supabase 設定

部署後請在 Supabase Dashboard 的 Authentication / URL Configuration 加入：

- Site URL：Cloudflare Pages 的正式網址
- Redirect URLs：`https://你的網址/?mode=reset-password`

若之後綁定自訂網域，也要把自訂網域的重設密碼網址加入 Redirect URLs。

`supabase-config.js` 使用的是瀏覽器端 anon key；不要把 `service_role` key 放入任何前端檔案。
