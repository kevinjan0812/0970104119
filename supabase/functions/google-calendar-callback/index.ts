import {
  GOOGLE_CALENDAR_SCOPE,
  HttpError,
  clean,
  createAdminClient,
  encryptRefreshToken,
  errorResponse,
  googleRedirectUri,
  loadCompanyGoogleOAuthClient,
  validateReturnUrl,
  verifyOAuthState,
} from "../_shared/google-calendar.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function callbackPage(returnUrl: string, ok: boolean, message: string): Response {
  const targetOrigin = new URL(returnUrl).origin;
  const payload = JSON.stringify({
    type: "funeral-google-calendar-oauth",
    ok,
    message,
  }).replaceAll("<", "\\u003c");
  return new Response(`<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Google 行事曆授權</title></head><body style="font-family:system-ui,sans-serif;padding:32px">
<h1>${ok ? "Google 行事曆已連結" : "Google 行事曆連結失敗"}</h1>
<p>${escapeHtml(message)}</p>
<p><a href="${escapeHtml(returnUrl)}">返回禮儀案件管理系統</a></p>
<script>
if (window.opener) {
  window.opener.postMessage(${payload}, ${JSON.stringify(targetOrigin)});
  window.close();
}
</script></body></html>`, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request) => {
  let returnUrl = "";
  try {
    if (request.method !== "GET") throw new HttpError(405, "只接受 Google 授權回呼。", "method_not_allowed");
    const url = new URL(request.url);
    const state = await verifyOAuthState(clean(url.searchParams.get("state")));
    returnUrl = validateReturnUrl(state.returnUrl);

    const oauthError = clean(url.searchParams.get("error"));
    if (oauthError) {
      throw new HttpError(400, oauthError === "access_denied" ? "你已取消 Google 授權。" : `Google 授權失敗：${oauthError}`, "oauth_denied");
    }
    const code = clean(url.searchParams.get("code"));
    if (!code) throw new HttpError(400, "Google 未回傳授權碼。", "missing_code");

    const admin = createAdminClient();
    const { data: membership, error: membershipError } = await admin
      .from("company_members")
      .select("company_id, role, active, read_only")
      .eq("user_id", state.userId)
      .eq("company_id", state.companyId)
      .eq("active", true)
      .maybeSingle();
    if (membershipError || !membership) throw new HttpError(403, "此帳號已無公司權限。", "membership_required");
    if (membership.read_only) throw new HttpError(403, "此帳號只有瀏覽權限。", "read_only");
    if (membership.role !== "owner") {
      throw new HttpError(403, "只有公司老闆可以連結 Google Cloud 專案。", "owner_required");
    }

    const { data: existingConnection, error: existingConnectionError } = await admin
      .from("google_calendar_connections")
      .select("refresh_token_ciphertext")
      .eq("company_id", state.companyId)
      .maybeSingle();
    if (existingConnectionError) throw existingConnectionError;
    const oauthClient = await loadCompanyGoogleOAuthClient(admin, state.companyId, Boolean(existingConnection));

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: oauthClient.clientId,
        client_secret: oauthClient.clientSecret,
        redirect_uri: googleRedirectUri(),
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) {
      throw new HttpError(400, `Google 權杖交換失敗：${clean(tokens.error_description || tokens.error || tokenResponse.status)}`, "token_exchange_failed");
    }

    let refreshToken = clean(tokens.refresh_token);
    if (!refreshToken) {
      if (state.requireFreshToken || !existingConnection?.refresh_token_ciphertext) {
        throw new HttpError(400, "Google 未回傳長期授權，請移除舊授權後重新連結。", "refresh_token_missing");
      }
      return callbackPage(returnUrl, true, "原有 Google 行事曆授權仍然有效，可以返回系統繼續同步。");
    }

    const { error: saveError } = await admin
      .from("google_calendar_connections")
      .upsert({
        company_id: state.companyId,
        refresh_token_ciphertext: await encryptRefreshToken(refreshToken),
        scope: clean(tokens.scope) || GOOGLE_CALENDAR_SCOPE,
        connected_by: state.userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id" });
    refreshToken = "";
    if (saveError) throw saveError;

    return callbackPage(returnUrl, true, "授權完成，系統會自動繼續同步這筆法事排程。");
  } catch (error) {
    if (returnUrl) {
      const message = error instanceof Error ? error.message : "Google 行事曆授權失敗。";
      return callbackPage(returnUrl, false, message);
    }
    return errorResponse(error);
  }
});
