// ─────────────────────────────────────────────────────────────────────────
//  Fires AUTOMATICALLY whenever any Netlify Form is submitted.
//  - "order" form        -> emails customer an order-received confirmation
//                           + emails you (admin) a copy.
//  - "contact" form      -> branded auto-reply to the customer + a clean,
//                           website-styled notification to you.
//  - "gate-signup" form  -> if newsletter-optin = yes, adds them to your
//                           Brevo list AND sends a branded welcome email.
//  No secrets in this file. Reads BREVO_API_KEY etc. from Netlify env vars.
// ─────────────────────────────────────────────────────────────────────────

const {
  sendEmail,
  upsertContact,
  orderReceivedEmail,
  contactConfirmationEmail,
  contactNotificationEmail,
  welcomeEmail,
  weeklyPromoCode,
  BRAND,
} = require("./lib/brevo");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cryonix.research@gmail.com";
const NEWSLETTER_LIST_ID = process.env.BREVO_LIST_ID;

exports.handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body || "{}").payload || {};
  } catch (e) {
    return { statusCode: 400, body: "bad payload" };
  }

  const formName = payload.form_name || "";
  const data = payload.data || {};

  try {
    // ── ORDERS ────────────────────────────────────────────────────────────
    if (formName === "order") {
      const orderNumber = (data["order-number"] || genOrderNumber()).toString();
      const customerName = data["customer-name"] || "";
      const email = data["email"] || "";
      const items = data["items"] || "";
      const total = data["total"] || "";
      const promo = data["promo"] || "";

      const html = orderReceivedEmail({ orderNumber, customerName, items, total, promo });

      if (email) {
        await sendEmail({
          to: email,
          toName: customerName,
          subject: `Order ${orderNumber} received — Cryonix Research`,
          html,
          replyTo: ADMIN_EMAIL,
        });
      }

      await sendEmail({
        to: ADMIN_EMAIL,
        toName: "Cryonix Admin",
        subject: `🛒 New order ${orderNumber} — ${customerName || email}`,
        html:
          `<p style="font-family:sans-serif">New order received.</p>` +
          `<ul style="font-family:sans-serif">` +
          `<li><b>Order:</b> ${esc(orderNumber)}</li>` +
          `<li><b>Name:</b> ${esc(customerName)}</li>` +
          `<li><b>Email:</b> ${esc(email)}</li>` +
          `<li><b>Address:</b> ${esc(data["address"] || "")}</li>` +
          `<li><b>Items:</b> ${esc(items)}</li>` +
          `<li><b>Total:</b> ${esc(total)}</li>` +
          `<li><b>Promo:</b> ${esc(promo)}</li>` +
          `</ul>`,
      });

      return { statusCode: 200, body: "order processed" };
    }

    // ── CONTACT FORM ──────────────────────────────────────────────────────
    if (formName === "contact") {
      const first = data["first-name"] || "";
      const last = data["last-name"] || "";
      const name = (data["full-name"] || `${first} ${last}`).trim();
      const email = data["email"] || "";
      const subject = data["subject"] || "";
      const message = data["message"] || "";

      if (email) {
        await sendEmail({
          to: email,
          toName: name,
          subject: "We received your message — Cryonix Research",
          html: contactConfirmationEmail({ name, subject, message }),
          replyTo: ADMIN_EMAIL,
        });
      }

      await sendEmail({
        to: ADMIN_EMAIL,
        toName: "Cryonix Admin",
        subject: `📨 Contact: ${subject || "New message"} — ${name || email}`,
        html: contactNotificationEmail({ name, email, subject, message }),
        replyTo: email || undefined,
      });

      return { statusCode: 200, body: "contact processed" };
    }

    // ── NEWSLETTER OPT-INS (from the entry gate) ───────────────────────────
    if (formName === "gate-signup") {
      const email = data["email"] || "";
      const optedIn = (data["newsletter-optin"] || "").toLowerCase() === "yes";
      if (email && optedIn && NEWSLETTER_LIST_ID) {
        await upsertContact({
          email,
          listId: NEWSLETTER_LIST_ID,
          attributes: { COMPANY: data["company"] || "" },
        });
        await sendEmail({
          to: email,
          subject: "Welcome to Cryonix Research 🧬",
          html: welcomeEmail({ promoCode: weeklyPromoCode() }),
          replyTo: ADMIN_EMAIL,
        });
      }
      return { statusCode: 200, body: "signup processed" };
    }

    return { statusCode: 200, body: "ignored" };
  } catch (err) {
    console.error("submission-created error:", err.message);
    return { statusCode: 200, body: "logged-error" };
  }
};

function genOrderNumber() {
  return "CRY-" + (10000 + Math.floor(Math.random() * 89999));
}
function esc(s) {
  return String(s == null ? "" : s).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
