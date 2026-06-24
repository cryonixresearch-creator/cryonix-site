// ─────────────────────────────────────────────────────────────────────────
//  Admin/schedule-triggered newsletter send.
//  Creates a Brevo campaign to your opt-in list and sends it immediately.
//  Protected by ADMIN_TOKEN.
//
//  Two ways to call:
//   A) Provide ready HTML:   { subject, headline, bodyHtml, includePromo? }
//   B) Provide a test send:  { ...above, testEmail: "you@x.com" }  -> sends only to you
//
//  The weekly 10% promo code is computed server-side and injected, so it always
//  matches what validate-promo.js will accept that week.
// ─────────────────────────────────────────────────────────────────────────

const {
  sendEmail,
  sendCampaignToList,
  newsletterEmail,
  weeklyPromoCode,
} = require("./lib/brevo");

const NEWSLETTER_LIST_ID = process.env.BREVO_LIST_ID;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "POST only" });

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

  const { subject, headline, bodyHtml, includePromo = true, testEmail } = body;
  if (!subject || !headline || !bodyHtml) {
    return json(400, { ok: false, error: "subject, headline and bodyHtml are required" });
  }

  const promoCode = includePromo ? weeklyPromoCode() : null;
  const html = newsletterEmail({ headline, bodyHtml, promoCode, discountPct: 10 });

  try {
    // Test send goes only to the given address (uses transactional API).
    if (testEmail) {
      await sendEmail({ to: testEmail, subject: `[TEST] ${subject}`, html });
      return json(200, { ok: true, mode: "test", sentTo: testEmail, promoCode });
    }

    if (!NEWSLETTER_LIST_ID) {
      return json(400, { ok: false, error: "BREVO_LIST_ID not set — cannot send to list" });
    }

    const { campaignId } = await sendCampaignToList({
      subject,
      html,
      listId: NEWSLETTER_LIST_ID,
    });
    return json(200, { ok: true, mode: "campaign", campaignId, promoCode });
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
