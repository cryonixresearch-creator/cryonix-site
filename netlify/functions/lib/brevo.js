// ──────────────────────────────────────────────────────────────────────────
//  Shared Brevo + email helpers. Lives in /lib so Netlify does NOT treat it
//  as its own function endpoint. Required by the real functions.
//  NOTHING secret is hard-coded here — keys are read from process.env only.
// ─────────────────────────────────────────────────────────────────────────

const BREVO_API = "https://api.brevo.com/v3";

const BRAND = {
  name: "Cryonix Research",
  site: "https://cryonixpeptides.netlify.app",
  senderEmail: process.env.SENDER_EMAIL || "cryonix.research@gmail.com",
  senderName: process.env.SENDER_NAME || "Cryonix Research",
  navy: "#031c3d",
  blue: "#0d5fcf",
  ink: "#0b2545",
  muted: "#5b7290",
};

function apiKey() {
  const k = process.env.BREVO_API_KEY;
  if (!k) throw new Error("BREVO_API_KEY env var is not set");
  return k;
}

async function sendEmail({ to, toName, subject, html, replyTo }) {
  const res = await fetch(`${BREVO_API}/smtp/email`, {
    method: "POST",
    headers: { "api-key": apiKey(), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: BRAND.senderName, email: BRAND.senderEmail },
      to: [{ email: to, name: toName || to }],
      replyTo: replyTo ? { email: replyTo } : undefined,
      subject,
      htmlContent: html,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Brevo sendEmail ${res.status}: ${text}`);
  return JSON.parse(text || "{}");
}

async function upsertContact({ email, listId, attributes }) {
  const res = await fetch(`${BREVO_API}/contacts`, {
    method: "POST",
    headers: { "api-key": apiKey(), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      email,
      updateEnabled: true,
      listIds: listId ? [Number(listId)] : undefined,
      attributes: attributes || {},
    }),
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Brevo upsertContact ${res.status}: ${text}`);
  }
  return true;
}

async function sendCampaignToList({ subject, html, listId, name }) {
  const createRes = await fetch(`${BREVO_API}/emailCampaigns`, {
    method: "POST",
    headers: { "api-key": apiKey(), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name: name || `${BRAND.name} Newsletter ${new Date().toISOString().slice(0, 10)}`,
      subject,
      sender: { name: BRAND.senderName, email: BRAND.senderEmail },
      type: "classic",
      htmlContent: html,
      recipients: { listIds: [Number(listId)] },
    }),
  });
  const createText = await createRes.text();
  if (!createRes.ok) throw new Error(`Brevo createCampaign ${createRes.status}: ${createText}`);
  const campaignId = JSON.parse(createText).id;
  const sendRes = await fetch(`${BREVO_API}/emailCampaigns/${campaignId}/sendNow`, {
    method: "POST",
    headers: { "api-key": apiKey(), Accept: "application/json" },
  });
  if (!sendRes.ok && sendRes.status !== 204) {
    const t = await sendRes.text();
    throw new Error(`Brevo sendNow ${sendRes.status}: ${t}`);
  }
  return { campaignId };
}

function isoYearWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return { year: date.getUTCFullYear(), week };
}

function weeklyPromoCode(d = new Date()) {
  const { year, week } = isoYearWeek(d);
  const tag = String(year).slice(-2) + String(week).padStart(2, "0");
  return `CRYO10-${tag}`;
}

function shell(inner) {
  return `<!doctype html><html><body style="margin:0;background:#eef5ff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:${BRAND.navy};border-radius:14px 14px 0 0;padding:22px 26px;">
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:.3px;">Cryonix<span style="color:#6aa6ff;">.</span> Research</span>
    </div>
    <div style="background:#fff;border:1px solid #d6e6fb;border-top:none;border-radius:0 0 14px 14px;padding:28px 26px;">
      ${inner}
    </div>
    <p style="text-align:center;color:${BRAND.muted};font-size:11px;line-height:1.7;margin:18px 8px;">
      Cryonix Research · Products sold strictly for in-vitro research and laboratory use only (RUO). Not for human or animal consumption.<br>
      <a href="${BRAND.site}" style="color:${BRAND.blue};text-decoration:none;">${BRAND.site.replace("https://", "")}</a>
    </p>
  </div></body></html>`;
}

function btn(label, href) {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.blue};color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 26px;border-radius:8px;">${label}</a>`;
}

function orderReceivedEmail({ orderNumber, customerName, items, total, promo }) {
  const inner = `
    <h1 style="font-size:21px;margin:0 0 6px;">Order received 🎉</h1>
    <p style="color:${BRAND.muted};font-size:14px;margin:0 0 20px;">Thanks${customerName ? ", " + escapeHtml(customerName) : ""} — we've got your order and will confirm details before fulfillment.</p>
    <div style="background:#f3f8ff;border:1px solid #d6e6fb;border-radius:10px;padding:16px 18px;margin-bottom:18px;">
      <p style="margin:0 0 4px;font-size:12px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.05em;">Order number</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND.ink};">${escapeHtml(orderNumber)}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:8px;">
      <tr><td style="color:${BRAND.muted};padding:4px 0;">Items</td><td style="text-align:right;">${escapeHtml(items || "—")}</td></tr>
      ${promo ? `<tr><td style="color:${BRAND.muted};padding:4px 0;">Promo</td><td style="text-align:right;">${escapeHtml(promo)}</td></tr>` : ""}
      <tr><td style="padding:8px 0 0;font-weight:700;border-top:1px solid #e3edf9;">Total</td><td style="text-align:right;font-weight:700;border-top:1px solid #e3edf9;padding-top:8px;">${escapeHtml(total || "—")}</td></tr>
    </table>
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.7;margin:18px 0;">A team member will reach out to confirm payment and shipping. You'll get a second email with tracking once your order ships.</p>
    <p style="margin:6px 0 0;">${btn("Track your order", BRAND.site + "/#tracking")}</p>`;
  return shell(inner);
}

function orderShippedEmail({ orderNumber, customerName, carrier, tracking, eta }) {
  const inner = `
    <h1 style="font-size:21px;margin:0 0 6px;">Your order shipped 📦</h1>
    <p style="color:${BRAND.muted};font-size:14px;margin:0 0 20px;">Good news${customerName ? ", " + escapeHtml(customerName) : ""} — order <strong style="color:${BRAND.ink};">${escapeHtml(orderNumber)}</strong> is on its way.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px;">
      ${carrier ? `<tr><td style="color:${BRAND.muted};padding:5px 0;">Carrier</td><td style="text-align:right;">${escapeHtml(carrier)}</td></tr>` : ""}
      ${tracking ? `<tr><td style="color:${BRAND.muted};padding:5px 0;">Tracking #</td><td style="text-align:right;font-weight:700;">${escapeHtml(tracking)}</td></tr>` : ""}
      ${eta ? `<tr><td style="color:${BRAND.muted};padding:5px 0;">Est. delivery</td><td style="text-align:right;">${escapeHtml(eta)}</td></tr>` : ""}
    </table>
    <p style="margin:6px 0 0;">${btn("Track shipment", BRAND.site + "/#tracking")}</p>
    <p style="font-size:12px;color:${BRAND.muted};line-height:1.7;margin:18px 0 0;">Questions? Just reply to this email.</p>`;
  return shell(inner);
}

function newsletterEmail({ headline, bodyHtml, promoCode, discountPct }) {
  const inner = `
    <h1 style="font-size:22px;margin:0 0 14px;line-height:1.3;">${escapeHtml(headline)}</h1>
    <div style="font-size:14px;line-height:1.75;color:${BRAND.ink};">${bodyHtml}</div>
    ${
      promoCode
        ? `<div style="background:linear-gradient(135deg,#0d5fcf,#031c3d);border-radius:12px;padding:22px;margin:24px 0;text-align:center;">
             <p style="margin:0 0 6px;color:#bcd8ff;font-size:13px;letter-spacing:.05em;text-transform:uppercase;">${discountPct || 10}% off this week</p>
             <p style="margin:0 0 12px;color:#fff;font-size:26px;font-weight:800;letter-spacing:1px;">${escapeHtml(promoCode)}</p>
             <p style="margin:0;">${btn("Shop now", BRAND.site)}</p>
           </div>`
        : `<p style="margin:22px 0;">${btn("Visit the shop", BRAND.site)}</p>`
    }
    <p style="font-size:11px;color:${BRAND.muted};line-height:1.7;margin:18px 0 0;">You're receiving this because you opted in at cryonixpeptides.netlify.app. Reply "unsubscribe" to opt out.</p>`;
  return shell(inner);
}

function contactConfirmationEmail({ name, subject, message }) {
  const inner = `
    <h1 style="font-size:21px;margin:0 0 6px;">Thanks for reaching out ✅</h1>
    <p style="color:${BRAND.muted};font-size:14px;margin:0 0 18px;">Hi${name ? " " + escapeHtml(name) : ""}, we've received your message and our research support team will reply within 1 business day.</p>
    <div style="background:#f3f8ff;border:1px solid #d6e6fb;border-radius:10px;padding:16px 18px;margin-bottom:18px;">
      <p style="margin:0 0 6px;font-size:12px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.05em;">Your message</p>
      ${subject ? `<p style="margin:0 0 8px;font-weight:600;color:${BRAND.ink};">${escapeHtml(subject)}</p>` : ""}
      <p style="margin:0;font-size:14px;color:${BRAND.ink};line-height:1.7;white-space:pre-wrap;">${escapeHtml(message || "")}</p>
    </div>
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.7;margin:0 0 18px;">Need to add something? Just reply to this email and it reaches us directly.</p>
    <p style="margin:0;">${btn("Browse the catalog", BRAND.site)}</p>`;
  return shell(inner);
}

function contactNotificationEmail({ name, email, subject, message }) {
  const inner = `
    <h1 style="font-size:20px;margin:0 0 14px;">📨 New contact message</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <tr><td style="color:${BRAND.muted};padding:6px 0;width:90px;">From</td><td style="font-weight:600;">${escapeHtml(name || "—")}</td></tr>
      <tr><td style="color:${BRAND.muted};padding:6px 0;">Email</td><td><a href="mailto:${escapeHtml(email)}" style="color:${BRAND.blue};text-decoration:none;">${escapeHtml(email || "—")}</a></td></tr>
      <tr><td style="color:${BRAND.muted};padding:6px 0;">Subject</td><td>${escapeHtml(subject || "—")}</td></tr>
    </table>
    <div style="background:#f3f8ff;border:1px solid #d6e6fb;border-radius:10px;padding:16px 18px;">
      <p style="margin:0;font-size:14px;color:${BRAND.ink};line-height:1.7;white-space:pre-wrap;">${escapeHtml(message || "")}</p>
    </div>
    <p style="font-size:12px;color:${BRAND.muted};margin:16px 0 0;">Reply to this email to respond to ${escapeHtml(name || "the customer")} directly.</p>`;
  return shell(inner);
}

function welcomeEmail({ promoCode }) {
  const inner = `
    <h1 style="font-size:22px;margin:0 0 10px;">Welcome to Cryonix Research 🧬</h1>
    <p style="color:${BRAND.muted};font-size:14px;line-height:1.7;margin:0 0 14px;">You're on the list. Expect occasional updates on new research compounds, restocks, and research-use news — no spam.</p>
    ${
      promoCode
        ? `<div style="background:linear-gradient(135deg,#0d5fcf,#031c3d);border-radius:12px;padding:22px;margin:18px 0;text-align:center;">
             <p style="margin:0 0 6px;color:#bcd8ff;font-size:13px;letter-spacing:.05em;text-transform:uppercase;">A welcome gift</p>
             <p style="margin:0 0 12px;color:#fff;font-size:24px;font-weight:800;letter-spacing:1px;">${escapeHtml(promoCode)}</p>
             <p style="margin:0 0 10px;color:#bcd8ff;font-size:13px;">10% off your first order this week</p>
             <p style="margin:0;">${btn("Shop now", BRAND.site)}</p>
           </div>`
        : `<p style="margin:18px 0;">${btn("Browse the catalog", BRAND.site)}</p>`
    }`;
  return shell(inner);
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  BRAND,
  sendEmail,
  upsertContact,
  sendCampaignToList,
  weeklyPromoCode,
  orderReceivedEmail,
  orderShippedEmail,
  newsletterEmail,
  contactConfirmationEmail,
  contactNotificationEmail,
  welcomeEmail,
  escapeHtml,
};
