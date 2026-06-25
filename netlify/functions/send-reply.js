// ─────────────────────────────────────────────────────────────────────────
//  Admin-triggered reply to a customer's contact message.
//  Sends a branded email to the customer. Protected by ADMIN_TOKEN.
//  POST body: { to, name?, subject?, replyText }
// ─────────────────────────────────────────────────────────────────────────

const { sendEmail, BRAND, escapeHtml } = require("./lib/brevo");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cryonix.research@gmail.com";

function replyHtml({ name, replyText }) {
  const paras = String(replyText || "")
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:${BRAND.ink};">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const inner = `
    <p style="font-size:14px;line-height:1.7;color:${BRAND.ink};margin:0 0 14px;">Hi${name ? " " + escapeHtml(name) : ""},</p>
    ${paras}
    <p style="font-size:14px;line-height:1.7;color:${BRAND.ink};margin:18px 0 0;">Best regards,<br>The Cryonix Research Team</p>
    <p style="font-size:12px;color:${BRAND.muted};line-height:1.6;margin:18px 0 0;border-top:1px solid #e3edf9;padding-top:12px;">Reply to this email if you have any further questions.</p>`;
  return `<!doctype html><html><body style="margin:0;background:#eef5ff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:${BRAND.navy};border-radius:14px 14px 0 0;padding:22px 26px;">
      <span style="color:#fff;font-size:20px;font-weight:700;">Cryonix<span style="color:#6aa6ff;">.</span> Research</span>
    </div>
    <div style="background:#fff;border:1px solid #d6e6fb;border-top:none;border-radius:0 0 14px 14px;padding:28px 26px;">${inner}</div>
    <p style="text-align:center;color:${BRAND.muted};font-size:11px;line-height:1.7;margin:18px 8px;">Cryonix Research · For in-vitro research and laboratory use only (RUO).</p>
  </div></body></html>`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "POST only" });

  const token = event.headers["x-admin-token"] || event.headers["X-Admin-Token"];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return json(400, { ok: false, error: "bad json" }); }

  const { to, name, subject, replyText } = body;
  if (!to || !replyText) return json(400, { ok: false, error: "to and replyText are required" });

  try {
    await sendEmail({
      to,
      toName: name,
      subject: subject ? `Re: ${subject} — Cryonix Research` : "Re: your message — Cryonix Research",
      html: replyHtml({ name, replyText }),
      replyTo: ADMIN_EMAIL,
    });
    return json(200, { ok: true, sent: to });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(obj) };
}
