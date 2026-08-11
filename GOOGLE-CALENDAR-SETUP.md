# Google Calendar 設定說明

此專案已使用 Google Calendar API 與 Supabase Edge Functions。瀏覽器只會取得 Supabase 登入權杖；Google Client Secret、refresh token 與加密金鑰不會出現在前端程式。

## 1. Google Cloud Console

1. 開啟 Google Cloud Console，建立或選擇專案。
2. 在「API 和服務 → 程式庫」啟用 **Google Calendar API**。
3. 設定 OAuth 同意畫面；若仍為測試模式，請把實際使用者加入測試使用者。
4. 在「憑證」建立 **OAuth 2.0 用戶端 ID → 網頁應用程式**。
5. 加入以下「已授權的重新導向 URI」（必須完全一致）：

   `https://ydiuzewutkfxbrcnsvdx.supabase.co/functions/v1/google-calendar-callback`

6. 保存 Google Client ID 與 Client Secret。

## 2. Supabase Edge Function Secrets

在 Supabase 專案 `ydiuzewutkfxbrcnsvdx` 的 Edge Functions Secrets 新增：

- `GOOGLE_CLIENT_ID`：Google OAuth Client ID。
- `GOOGLE_CLIENT_SECRET`：Google OAuth Client Secret。
- `GOOGLE_OAUTH_STATE_SECRET`：至少 32 字元的隨機字串，用來簽署 OAuth state。
- `GOOGLE_TOKEN_ENCRYPTION_KEY`：32 bytes 隨機資料的 Base64 字串，用來加密 refresh token。
- `GOOGLE_CALENDAR_ALLOWED_APP_URLS`：允許返回的系統網址，以逗號分隔，例如：

  `http://127.0.0.1:8765,https://你的正式網站網址`

PowerShell 可用下列方式產生 32 bytes Base64 加密金鑰：

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

`GOOGLE_OAUTH_STATE_SECRET` 請另外產生，不要與加密金鑰共用。Supabase 內建的 `SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY` 不需自行放進前端。

## 3. 資料庫 SQL

本專案已套用下列 migration；新環境可執行 [supabase/google-calendar-setup.sql](supabase/google-calendar-setup.sql)：

```sql
create table if not exists public.google_calendar_connections (
  company_id uuid primary key references public.companies(id) on delete cascade,
  refresh_token_ciphertext text not null,
  scope text not null default 'https://www.googleapis.com/auth/calendar.events',
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;
revoke all on table public.google_calendar_connections from anon, authenticated;
grant all on table public.google_calendar_connections to service_role;
create policy "browser clients cannot access google calendar credentials"
on public.google_calendar_connections
for all
to anon, authenticated
using (false)
with check (false);

create index if not exists google_calendar_connections_connected_by_idx
  on public.google_calendar_connections (connected_by);
```

前端使用者不能直接讀取這張表；只有 Edge Function 的 service role 可以讀寫，refresh token 寫入前還會經過 AES-GCM 加密。

## 4. 使用方式

1. 透過 `http://127.0.0.1:8765` 或正式 HTTPS 網址開啟系統，不要用 `file://` 直接開啟。
2. 登入後填寫案名、案件編號及該排程的項目、日期、時間。
3. 第一次按「加入 Google 行事曆」時，允許瀏覽器開啟 Google 授權視窗。
4. 完成授權後，系統會自動繼續新增事件並儲存案件。
5. 同一列之後會顯示「更新 Google 行事曆」；再次按下只會更新原事件。

事件固定使用 `Asia/Taipei`，預設時長由後端常數 `DEFAULT_EVENT_DURATION_MINUTES = 60` 統一控制。
