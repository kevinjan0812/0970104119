import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8" },
  });
const secretKey = () => {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  return String(keys.default || Object.values(keys)[0] || "");
};
const clean = (value: unknown) => String(value ?? "").trim();

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization") || "";
  const jwt = authorization.replace(/^Bearer\s+/i, "");
  if (!jwt) return respond({ error: "請先登入" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey());
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond({ error: "登入已失效，請重新登入" }, 401);

  const { data: membership } = await admin
    .from("company_members")
    .select("company_id, role, read_only, active")
    .eq("user_id", userData.user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (membership?.role === "staff" && membership.read_only) {
    return respond({ error: "此帳號僅可瀏覽，不能使用自動下單。" }, 403);
  }
  if (!membership?.company_id) return respond({ error: "找不到有效的公司權限" }, 403);

  const input = await request.json();
  const isVendorOrder = clean(input?.event) === "funeral_vendor_auto_order";
  const schedules = Array.isArray(input?.schedules)
    ? input.schedules.filter((row: Record<string, unknown>) =>
        clean(row.item) || clean(row.date) || clean(row.time) || clean(row.people) || clean(row.note) || clean(row.remark)
      )
    : [];
  const vendors = Array.isArray(input?.vendors)
    ? input.vendors.filter((row: Record<string, unknown>) =>
        clean(row.item) || clean(row.vendor) || clean(row.note)
      )
    : [];
  if (isVendorOrder && !vendors.length) return respond({ error: "請先填寫至少一筆廠商項目" }, 400);
  if (!isVendorOrder && !schedules.length) return respond({ error: "請先填寫至少一筆功德法事排程" }, 400);

  const requestedGroupId = clean(input?.line_group_id);
  if (!requestedGroupId) return respond({ error: "請先選擇要傳送的 LINE 群組" }, 400);

  const { data: group, error: groupError } = await admin
    .from("line_groups")
    .select("group_id, group_name")
    .eq("company_id", membership.company_id)
    .eq("active", true)
    .eq("group_id", requestedGroupId)
    .maybeSingle();
  if (groupError) return respond({ error: groupError.message }, 500);
  if (!group) return respond({ error: "選擇的 LINE 群組不可用" }, 400);

  const sentAt = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const message = isVendorOrder
    ? [
        "【廠商自動下單】",
        `案名：${clean(input.case_name)}`,
        `日期：${clean(input.date)}`,
        `時間：${clean(input.time)}`,
        `地點：${clean(input.location)}`,
        `人數：${clean(input.people)}`,
        `備註：${clean(input.note) || clean(vendors[0]?.note)}`,
      ].join("\n").slice(0, 5000)
    : [
        "【功德法事自動下單】",
        ...schedules.map((row: Record<string, unknown>, index: number) => [
          `${index + 1}.`,
          `案名：${clean(input.case_name)}`,
          `項目：${clean(row.item)}`,
          `日期：${clean(row.date)}`,
          `時間：${clean(row.time)}`,
          `人數：${clean(row.people)}`,
          `地點：${clean(row.note)}`,
          `備註：${clean(row.remark)}`,
        ].join("\n")),
      ].join("\n\n").slice(0, 5000);
  const token = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "";
  if (!token) return respond({ error: "LINE 權杖尚未設定" }, 500);

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Line-Retry-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ to: group.group_id, messages: [{ type: "text", text: message }] }),
  });
  const resultText = await response.text();
  const status = response.ok ? "sent" : "failed";
  await admin.from("line_order_logs").insert({
    company_id: membership.company_id,
    case_no: clean(input.case_no) || null,
    case_name: clean(input.case_name) || null,
    group_id: group.group_id,
    message,
    status,
    error_message: response.ok ? null : resultText,
    sent_by: userData.user.id,
  });

  if (!response.ok) {
    return respond({ error: `${group.group_name || "LINE 群組"}：${resultText || response.status}` }, 502);
  }
  return respond({ ok: true, sent: 1, failures: [] });
});
