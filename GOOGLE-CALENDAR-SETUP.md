# 每家公司獨立 Google Calendar 設定

此專案使用 Google Calendar API 與 Supabase Edge Functions。每家公司必須建立自己的 Google Cloud 專案及 OAuth 憑證；Client Secret、refresh token 與加密金鑰都不會出現在前端程式。

## 1. 每家公司在 Google Cloud Console 建立專案

1. 由該公司老闆登入 Google Cloud Console，建立或選擇該公司的專案。
2. 在「API 和服務 → 程式庫」啟用 **Google Calendar API**。
3. 設定 OAuth 同意畫面。若仍為測試模式，請把實際授權的 Google 帳號加入測試使用者。
4. 在「憑證」建立 **OAuth 2.0 用戶端 ID → 網頁應用程式**。
5. 在「已授權的重新導向 URI」貼上系統「員工管理 → 本公司 Google Cloud 專案」顯示的網址。現有 Supabase 專案為：

   `https://ydiuzewutkfxbrcnsvdx.supabase.co/functions/v1/google-calendar-callback`

6. 保存 Google Client ID 與 Client Secret。

所有公司可以登記相同的 Supabase 回呼網址，但 Client ID、Client Secret、Google 授權帳號及行事曆都分開。

## 2. 公司老闆在系統內設定

1. 使用正式 HTTPS 網址或 `http://127.0.0.1:8765` 開啟系統，不要使用 `file://`。
2. 以該公司的老闆帳號登入。
3. 開啟「員工管理 → 本公司 Google Cloud 專案」。
4. 輸入該公司自己的 Client ID 與 Client Secret，按「儲存 Google Cloud 設定」。
5. 到功德法事排程按「加入GOOGLE日曆」，使用該公司的 Google 帳號完成授權。

Client Secret 會由 Edge Function 使用 AES-GCM 加密後保存，瀏覽器無法直接讀取。更新 Client ID 或 Client Secret 時，系統會清除舊的 Google 行事曆授權，必須重新授權一次。

## 3. Supabase Edge Function Secrets

Supabase 專案只保留全系統安全用途的 Secrets：

- `GOOGLE_OAUTH_STATE_SECRET`：至少 32 字元的隨機字串，用來簽署 OAuth state。
- `GOOGLE_TOKEN_ENCRYPTION_KEY`：32 bytes 隨機資料的 Base64 字串，用來加密各公司的 Client Secret 與 refresh token。
- `GOOGLE_CALENDAR_ALLOWED_APP_URLS`：允許返回的系統網址，以逗號分隔，例如：

  `http://127.0.0.1:8765,https://你的正式網站網址`

舊版的 `GOOGLE_CLIENT_ID` 與 `GOOGLE_CLIENT_SECRET` 僅供已經完成連結的既有公司過渡使用；新公司不會使用這組共用憑證。

PowerShell 可用下列方式產生 32 bytes Base64 加密金鑰：

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

`GOOGLE_OAUTH_STATE_SECRET` 請另外產生，不要與加密金鑰共用。Supabase 的服務端密鑰不得放入前端。

## 4. 資料庫

執行 [supabase/google-calendar-setup.sql](supabase/google-calendar-setup.sql)。主要資料表：

- `google_calendar_oauth_configs`：每家公司一組加密的 Client ID／Client Secret 設定。
- `google_calendar_connections`：每家公司授權後的加密 refresh token。

兩張表都啟用 RLS，並撤銷 `anon` 與 `authenticated` 的直接權限，只有 Edge Function 的服務端權限可以存取。

## 5. 日常使用

- 每家公司只有一組 Google Cloud 專案設定及一個已連結的 Google 行事曆。
- 只有老闆可以設定 Google Cloud 憑證及進行第一次 Google 授權。
- 設定完成後，該公司具有編輯權限的員工可以新增或更新 Google 行事曆事件。
- 僅可瀏覽的員工不能同步 Google 行事曆。
- 不同公司的憑證、refresh token、案件及行事曆事件都依 `company_id` 隔離。

事件固定使用 `Asia/Taipei`，預設時長由後端常數 `DEFAULT_EVENT_DURATION_MINUTES = 60` 控制。
