import {
  GOOGLE_CALENDAR_SCOPE,
  HttpError,
  authenticateCompanyMember,
  clean,
  corsHeaders,
  decryptRefreshToken,
  deterministicGoogleEventId,
  encryptGoogleCredential,
  errorResponse,
  exchangeRefreshToken,
  googleRedirectUri,
  jsonResponse,
  loadCompanyGoogleOAuthClient,
  signOAuthState,
  validateReturnUrl,
} from "../_shared/google-calendar.ts";

const DEFAULT_EVENT_DURATION_MINUTES = 60;
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

type CalendarEventInput = {
  case_name?: unknown;
  case_no?: unknown;
  item?: unknown;
  date?: unknown;
  time?: unknown;
  people?: unknown;
  location?: unknown;
  remark?: unknown;
  offerings?: unknown;
  event_id?: unknown;
  schedule_key?: unknown;
};

function normalizeDate(value: unknown): string {
  const match = clean(value).match(/^(\d{3,4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (!match) throw new HttpError(400, "法事日期格式不正確，請使用民國年/月/日或西元年/月/日。", "invalid_date");
  const inputYear = Number(match[1]);
  const year = match[1].length === 3 ? inputYear + 1911 : inputYear;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new HttpError(400, "法事日期不存在，請重新確認。", "invalid_date");
  }
  return `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeTime(value: unknown): string {
  const match = clean(value).match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new HttpError(400, "法事時間格式不正確，請使用 24 小時制 HH:mm。", "invalid_time");
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function taipeiDateTime(date: string, time: string, extraMinutes = 0): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day, hour - 8, minute + extraMinutes));
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utc).reduce<Record<string, string>>((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`;
}

function checkedOfferings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(clean).filter(Boolean);
}

function buildEvent(input: CalendarEventInput, deterministicId: string) {
  const caseName = clean(input.case_name);
  const item = clean(input.item);
  const rawDate = clean(input.date);
  const rawTime = clean(input.time);
  if (!caseName) throw new HttpError(400, "請先填寫案名。", "case_name_required");
  if (!item) throw new HttpError(400, "請先填寫法事項目。", "item_required");
  if (!rawDate) throw new HttpError(400, "請先填寫法事日期。", "date_required");
  if (!rawTime) throw new HttpError(400, "請先填寫法事時間。", "time_required");

  const date = normalizeDate(rawDate);
  const time = normalizeTime(rawTime);
  const people = clean(input.people);
  const location = clean(input.location);
  const remark = clean(input.remark);
  const offerings = checkedOfferings(input.offerings);
  const peopleLabel = people ? `${people}名` : "";
  const summary = [caseName, item, peopleLabel, ...offerings].filter(Boolean).join("、");
  const description = [
    `案名：${caseName}`,
    `法事項目：${item}`,
    `人數：${people || "未填"}`,
    `供品：${offerings.length ? offerings.join("、") : "未選擇"}`,
    remark ? `備註：${remark}` : "",
  ].filter(Boolean).join("\n");

  return {
    id: deterministicId,
    summary,
    description,
    location,
    start: {
      dateTime: taipeiDateTime(date, time),
      timeZone: "Asia/Taipei",
    },
    end: {
      dateTime: taipeiDateTime(date, time, DEFAULT_EVENT_DURATION_MINUTES),
      timeZone: "Asia/Taipei",
    },
  };
}

async function googleEventRequest(
  accessToken: string,
  method: "POST" | "PUT",
  eventId: string,
  event: Record<string, unknown>,
): Promise<{ response: Response; result: Record<string, unknown> }> {
  const url = method === "POST" ? GOOGLE_EVENTS_URL : `${GOOGLE_EVENTS_URL}/${encodeURIComponent(eventId)}`;
  const payload = method === "POST" ? event : { ...event, id: eventId };
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  return { response, result };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "只接受 POST 請求。" }, 405);

  try {
    const input = await request.json().catch(() => ({}));
    const action = clean(input.action);
    const ownerActions = new Set(["save_config", "authorize"]);
    const member = await authenticateCompanyMember(request, {
      requireWrite: !["status", "config_status"].includes(action),
      requireOwner: ownerActions.has(action),
      companyId: clean(input.company_id),
    });

    if (action === "config_status") {
      const [{ data: config, error: configError }, { data: connection, error: connectionError }] = await Promise.all([
        member.admin
          .from("google_calendar_oauth_configs")
          .select("company_id, updated_at")
          .eq("company_id", member.companyId)
          .maybeSingle(),
        member.admin
          .from("google_calendar_connections")
          .select("company_id")
          .eq("company_id", member.companyId)
          .maybeSingle(),
      ]);
      if (configError || connectionError) throw configError || connectionError;
      return jsonResponse({
        configured: Boolean(config),
        legacy: !config && Boolean(connection),
        connected: Boolean(connection),
        updated_at: config?.updated_at || null,
        redirect_uri: googleRedirectUri(),
      });
    }

    if (action === "save_config") {
      const clientId = clean(input.client_id);
      const clientSecret = clean(input.client_secret);
      if (!clientId) throw new HttpError(400, "請輸入 Google OAuth Client ID。", "client_id_required");
      if (!clientSecret) throw new HttpError(400, "請輸入 Google OAuth Client Secret。", "client_secret_required");
      if (!clientId.endsWith(".apps.googleusercontent.com")) {
        throw new HttpError(400, "Google Client ID 格式不正確。", "invalid_client_id");
      }
      const { error: saveConfigError } = await member.admin
        .from("google_calendar_oauth_configs")
        .upsert({
          company_id: member.companyId,
          client_id: clientId,
          client_secret_ciphertext: await encryptGoogleCredential(clientSecret),
          configured_by: member.userId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id" });
      if (saveConfigError) throw saveConfigError;

      const { error: clearConnectionError } = await member.admin
        .from("google_calendar_connections")
        .delete()
        .eq("company_id", member.companyId);
      if (clearConnectionError) throw clearConnectionError;
      return jsonResponse({ configured: true, connected: false, redirect_uri: googleRedirectUri() });
    }

    if (action === "status") {
      const { data, error } = await member.admin
        .from("google_calendar_connections")
        .select("company_id, updated_at")
        .eq("company_id", member.companyId)
        .maybeSingle();
      if (error) throw error;
      return jsonResponse({ connected: Boolean(data), updated_at: data?.updated_at || null });
    }

    if (action === "authorize") {
      const returnUrl = validateReturnUrl(input.return_url);
      const { data: existingConnection, error: existingConnectionError } = await member.admin
        .from("google_calendar_connections")
        .select("company_id")
        .eq("company_id", member.companyId)
        .maybeSingle();
      if (existingConnectionError) throw existingConnectionError;
      const oauthClient = await loadCompanyGoogleOAuthClient(
        member.admin,
        member.companyId,
        Boolean(existingConnection),
      );
      const state = await signOAuthState({
        userId: member.userId,
        companyId: member.companyId,
        returnUrl,
        exp: Date.now() + 10 * 60 * 1000,
        nonce: crypto.randomUUID(),
        requireFreshToken: Boolean(input.force_reconnect),
      });
      const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authorizationUrl.search = new URLSearchParams({
        client_id: oauthClient.clientId,
        redirect_uri: googleRedirectUri(),
        response_type: "code",
        scope: GOOGLE_CALENDAR_SCOPE,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
      }).toString();
      return jsonResponse({ authorization_url: authorizationUrl.toString() });
    }

    if (action !== "upsert_event") {
      throw new HttpError(400, "不支援的 Google 行事曆操作。", "invalid_action");
    }

    const scheduleKey = clean(input.schedule_key);
    if (!scheduleKey) throw new HttpError(400, "此排程缺少同步識別碼，請重新整理後再試。", "schedule_key_required");

    const { data: connection, error: connectionError } = await member.admin
      .from("google_calendar_connections")
      .select("refresh_token_ciphertext")
      .eq("company_id", member.companyId)
      .maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection?.refresh_token_ciphertext) {
      throw new HttpError(409, "尚未連結 Google 行事曆。", "google_not_connected");
    }

    const deterministicId = await deterministicGoogleEventId(
      member.companyId,
      clean(input.case_no),
      scheduleKey,
    );
    const event = buildEvent(input, deterministicId);
    const existingEventId = clean(input.event_id);
    const oauthClient = await loadCompanyGoogleOAuthClient(member.admin, member.companyId, true);
    const accessToken = await exchangeRefreshToken(
      await decryptRefreshToken(connection.refresh_token_ciphertext),
      oauthClient,
    );

    let method: "POST" | "PUT" = existingEventId ? "PUT" : "POST";
    let targetEventId = existingEventId || deterministicId;
    let { response, result } = await googleEventRequest(accessToken, method, targetEventId, event);

    // A retry before the local case finishes saving receives 409. Update the same
    // deterministic event instead of creating a duplicate.
    if (method === "POST" && response.status === 409) {
      method = "PUT";
      ({ response, result } = await googleEventRequest(accessToken, method, deterministicId, event));
    }

    if (!response.ok) {
      const googleMessage = clean((result.error as Record<string, unknown> | undefined)?.message);
      if (response.status === 404 && existingEventId) {
        throw new HttpError(404, "找不到原本的 Google 行事曆事件，請勿重複按新增；請聯絡管理者確認。", "event_not_found");
      }
      throw new HttpError(
        response.status >= 500 ? 502 : 400,
        `Google 行事曆同步失敗${googleMessage ? `：${googleMessage}` : "。"}`,
        "google_api_error",
      );
    }

    targetEventId = clean(result.id) || targetEventId;
    return jsonResponse({
      event_id: targetEventId,
      html_link: clean(result.htmlLink),
      operation: existingEventId ? "updated" : "created",
      duration_minutes: DEFAULT_EVENT_DURATION_MINUTES,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
