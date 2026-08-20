import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "request_failed") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

export function requiredEnv(name: string): string {
  const value = clean(Deno.env.get(name));
  if (!value) throw new HttpError(500, `伺服器尚未設定 ${name}。`, "server_not_configured");
  return value;
}

export function createAdminClient(): SupabaseClient {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function authenticateCompanyMember(
  request: Request,
  options: { requireWrite?: boolean; requireOwner?: boolean; companyId?: string } = {},
): Promise<{
  admin: SupabaseClient;
  userId: string;
  companyId: string;
  role: string;
  readOnly: boolean;
}> {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "請先登入後再使用 Google 行事曆。", "not_authenticated");

  const admin = createAdminClient();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    throw new HttpError(401, "登入狀態已失效，請重新登入。", "not_authenticated");
  }

  let membershipQuery = admin
    .from("company_members")
    .select("company_id, role, read_only, active")
    .eq("user_id", userData.user.id)
    .eq("active", true);
  if (clean(options.companyId)) membershipQuery = membershipQuery.eq("company_id", clean(options.companyId));
  const { data: membership, error: membershipError } = await membershipQuery
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.company_id) {
    throw new HttpError(403, "此帳號尚未加入可用公司。", "membership_required");
  }
  if (options.requireWrite && membership.read_only) {
    throw new HttpError(403, "此帳號只有瀏覽權限，不能同步 Google 行事曆。", "read_only");
  }
  if (options.requireOwner && membership.role !== "owner") {
    throw new HttpError(403, "只有公司老闆可以設定或連結 Google Cloud 專案。", "owner_required");
  }

  return {
    admin,
    userId: userData.user.id,
    companyId: membership.company_id,
    role: clean(membership.role),
    readOnly: Boolean(membership.read_only),
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(requiredEnv("GOOGLE_OAUTH_STATE_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export type OAuthState = {
  userId: string;
  companyId: string;
  returnUrl: string;
  exp: number;
  nonce: string;
  requireFreshToken?: boolean;
};

export async function signOAuthState(payload: OAuthState): Promise<string> {
  const encoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importHmacKey(),
    new TextEncoder().encode(encoded),
  );
  return `${encoded}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyOAuthState(value: string): Promise<OAuthState> {
  const [encoded, signature] = clean(value).split(".");
  if (!encoded || !signature) throw new HttpError(400, "Google 授權狀態無效。", "invalid_state");
  const valid = await crypto.subtle.verify(
    "HMAC",
    await importHmacKey(),
    base64UrlToBytes(signature),
    new TextEncoder().encode(encoded),
  );
  if (!valid) throw new HttpError(400, "Google 授權狀態驗證失敗。", "invalid_state");

  let payload: OAuthState;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded)));
  } catch {
    throw new HttpError(400, "Google 授權狀態格式錯誤。", "invalid_state");
  }
  if (!payload?.userId || !payload.companyId || !payload.returnUrl || payload.exp < Date.now()) {
    throw new HttpError(400, "Google 授權要求已過期，請重新操作。", "expired_state");
  }
  return payload;
}

export function validateReturnUrl(value: unknown): string {
  const candidate = clean(value);
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new HttpError(400, "無法辨識目前系統網址。", "invalid_return_url");
  }
  const isLocalHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new HttpError(400, "Google 授權請使用 HTTPS 網址或本機測試網址。", "invalid_return_url");
  }

  const allowedOrigins = requiredEnv("GOOGLE_CALENDAR_ALLOWED_APP_URLS")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => new URL(item).origin);
  if (!allowedOrigins.includes(url.origin)) {
    throw new HttpError(403, "目前網址不在 Google 行事曆允許清單中。", "return_url_not_allowed");
  }
  url.hash = "";
  return url.toString();
}

async function importEncryptionKey(usages: KeyUsage[]): Promise<CryptoKey> {
  let keyBytes: Uint8Array;
  try {
    keyBytes = Uint8Array.from(atob(requiredEnv("GOOGLE_TOKEN_ENCRYPTION_KEY")), (c) => c.charCodeAt(0));
  } catch {
    throw new HttpError(500, "GOOGLE_TOKEN_ENCRYPTION_KEY 必須是 Base64。", "invalid_encryption_key");
  }
  if (keyBytes.byteLength !== 32) {
    throw new HttpError(500, "GOOGLE_TOKEN_ENCRYPTION_KEY 解碼後必須是 32 bytes。", "invalid_encryption_key");
  }
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, usages);
}

export async function encryptGoogleCredential(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await importEncryptionKey(["encrypt"]),
    new TextEncoder().encode(value),
  );
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptGoogleCredential(ciphertext: string): Promise<string> {
  const [version, iv, encrypted] = clean(ciphertext).split(".");
  if (version !== "v1" || !iv || !encrypted) {
    throw new HttpError(500, "Google 加密資料格式不正確，請重新設定。", "invalid_credential_data");
  }
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(iv) },
      await importEncryptionKey(["decrypt"]),
      base64UrlToBytes(encrypted),
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new HttpError(500, "無法讀取 Google 加密資料，請重新設定。", "credential_decryption_failed");
  }
}

export const encryptRefreshToken = encryptGoogleCredential;
export const decryptRefreshToken = decryptGoogleCredential;

export type GoogleOAuthClient = {
  clientId: string;
  clientSecret: string;
  source: "company" | "legacy";
};

export async function loadCompanyGoogleOAuthClient(
  admin: SupabaseClient,
  companyId: string,
  allowLegacy = false,
): Promise<GoogleOAuthClient> {
  const { data, error } = await admin
    .from("google_calendar_oauth_configs")
    .select("client_id, client_secret_ciphertext")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (data?.client_id && data?.client_secret_ciphertext) {
    return {
      clientId: clean(data.client_id),
      clientSecret: await decryptGoogleCredential(data.client_secret_ciphertext),
      source: "company",
    };
  }

  if (allowLegacy) {
    const clientId = clean(Deno.env.get("GOOGLE_CLIENT_ID"));
    const clientSecret = clean(Deno.env.get("GOOGLE_CLIENT_SECRET"));
    if (clientId && clientSecret) return { clientId, clientSecret, source: "legacy" };
  }
  throw new HttpError(
    409,
    "公司尚未設定自己的 Google Cloud 專案，請由老闆到員工管理完成設定。",
    "google_project_not_configured",
  );
}

export function googleRedirectUri(): string {
  return `${requiredEnv("SUPABASE_URL").replace(/\/$/, "")}/functions/v1/google-calendar-callback`;
}

export async function exchangeRefreshToken(
  refreshToken: string,
  oauthClient: GoogleOAuthClient,
): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: oauthClient.clientId,
      client_secret: oauthClient.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    const message = result.error === "invalid_grant"
      ? "Google 授權已失效，請重新連結 Google 行事曆。"
      : `Google 存取權杖更新失敗：${clean(result.error_description || result.error || response.status)}`;
    throw new HttpError(401, message, "google_reconnect_required");
  }
  return result.access_token;
}

export async function deterministicGoogleEventId(
  companyId: string,
  caseNo: string,
  scheduleKey: string,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${companyId}:${caseNo}:${scheduleKey}`),
  );
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `funeral${hex.slice(0, 48)}`;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.message, code: error.code }, error.status);
  }
  console.error(error);
  return jsonResponse({ error: "Google 行事曆服務發生未預期錯誤。", code: "unexpected_error" }, 500);
}
