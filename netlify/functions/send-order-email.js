// ─────────────────────────────────────────────────────────────────────────
//  Admin-triggered "order shipped" email.
//  Called from admin.html (or curl) with an x-admin-token header.
//  POST body: { orderNumber, email, customerName?, carrier?, tracking?, eta? }
//  Protected by ADMIN_TOKEN env var so the public cannot trigger emails.
// ─────────────────────────────────────────────────────────────────────────

const { sendEmail, orderShippedEmail } = require("./lib/brevo");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cryonix.research@gmail.com";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "POST only" });
  }

  // Auth
  const token = event.headers["x-admin-token"] || event.headers["X-Admin-Token"];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { ok: false, error: "bad json" });
  }

  const { orderNumber, email, customerName, carrier, tracking, eta } = body;
  if (!orderNumber || !email) {
    return json(400, { ok: false, error: "orderNumber and email are required" });
  }

  try {
    await sendEmail({
      to: email,
      toName: customerName,
      subject: `Order ${orderNumber} has shipped 📦 — Cryonix Research`,
      html: orderShippedEmail({ orderNumber, customerName, carrier, tracking, eta }),
      replyTo: ADMIN_EMAIL,
    });
    return json(200, { ok: true, sent: email, orderNumber });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(obj),
  };
}
