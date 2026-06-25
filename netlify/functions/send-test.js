// ─────────────────────────────────────────────────────────────────────────
//  Admin-triggered TEST email. Sends a sample of any template to your inbox
//  so you can preview exactly what customers receive. Protected by ADMIN_TOKEN.
//  POST body: { type }  where type is one of:
//    received | shipped | contact_confirm | contact_notify | welcome | reply | newsletter
// ─────────────────────────────────────────────────────────────────────────

const {
  sendEmail,
  orderReceivedEmail,
  orderShippedEmail,
  contactConfirmationEmail,
  contactNotificationEmail,
  welcomeEmail,
  newsletterEmail,
  weeklyPromoCode,
} = require("./lib/brevo");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cryonix.research@gmail.com";

function buildSample(type) {
  switch (type) {
    case "received":
      return {
        subject: "[TEST] Order received",
        html: orderReceivedEmail({ orderNumber: "CRY-10042", customerName: "Jane Smith", items: "BPC-157 5mg x2, NAD+ 100mg x1", total: "$84.97", promo: "NEWS10" }),
      };
    case "shipped":
      return {
        subject: "[TEST] Order shipped",
        html: orderShippedEmail({ orderNumber: "CRY-10042", customerName: "Jane Smith", carrier: "USPS", tracking: "9400 1000 0000 0000 0000 00", eta: "Jun 30" }),
      };
    case "contact_confirm":
      return {
        subject: "[TEST] Contact confirmation (to customer)",
        html: contactConfirmationEmail({ name: "Jane Smith", subject: "COA Request", message: "Could you send the COA for BPC-157 batch 240115?\nThanks." }),
      };
    case "contact_notify":
      return {
        subject: "[TEST] Contact notification (to you)",
        html: contactNotificationEmail({ name: "Jane Smith", email: "jane@lab.com", subject: "COA Request", message: "Could you send the COA for BPC-157 batch 240115?" }),
      };
    case "welcome":
      return { subject: "[TEST] Newsletter welcome", html: welcomeEmail({ promoCode: weeklyPromoCode() }) };
    case "newsletter":
      return {
        subject: "[TEST] Newsletter",
        html: newsletterEmail({ headline: "This week in research peptides", bodyHtml: "<p>Sample newsletter body. Product spotlights and a short research roundup go here.</p>", promoCode: weeklyPromoCode(), discountPct: 10 }),
      };
    case "reply":
      return {
        subject: "[TEST] Contact reply (to customer)",
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0b2545;">
          <div style="background:#031c3d;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-weight:700;">Cryonix. Research</div>
          <div style="background:#fff;border:1px solid #d6e6fb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
          <p>Hi Jane,</p><p>Thanks for reaching out. Here is a sample templated reply showing the branded format your customers receive.</p>
          <p>Best regards,<br>The Cryonix Research Team</p></div></div>`,
      };
    default:
      return null;
  }
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

  const sample = buildSample(body.type);
  if (!sample) return json(400, { ok: false, error: "unknown type" });

  try {
    await sendEmail({ to: ADMIN_EMAIL, subject: sample.subject + " — Cryonix Research", html: sample.html });
    return json(200, { ok: true, sent: ADMIN_EMAIL, type: body.type });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(obj) };
}
