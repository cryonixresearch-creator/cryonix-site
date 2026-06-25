// ─────────────────────────────────────────────────────────────────────────
//  Admin-triggered AI draft of a contact reply (Claude API).
//  Returns a draft you edit before sending. Protected by ADMIN_TOKEN.
//  POST body: { question, topic?, customerName? }
//  Needs env var ANTHROPIC_API_KEY (server-side only, never public).
//  Optional env ANTHROPIC_MODEL (defaults to a Haiku model for low cost).
// ─────────────────────────────────────────────────────────────────────────

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

const SYSTEM = [
  "You are a customer-support assistant for Cryonix Research, a supplier of research peptides.",
  "All products are sold strictly for in-vitro research and laboratory use only (RUO) — never for human or animal use.",
  "Write the BODY of a professional, warm, concise email reply to the customer's message.",
  "Rules:",
  "- Do NOT include a greeting (no 'Hi ...') or sign-off (no 'Best regards') — those are added automatically.",
  "- Use short paragraphs separated by a blank line. Plain text only, no markdown, no bullet symbols.",
  "- Stay accurate and helpful. If you don't have a specific detail (an order status, a COA link, a price), say you'll follow up with it or ask for the order number, rather than inventing it. Use a bracketed placeholder like [order status] or [COA link] where the human should fill in specifics.",
  "- Never give human/animal dosing, medical, or usage advice. Keep everything in an RUO research context.",
  "- Keep it under ~150 words unless the question clearly needs more.",
].join("\n");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "POST only" });

  const token = event.headers["x-admin-token"] || event.headers["X-Admin-Token"];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return json(401, { ok: false, error: "unauthorized" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(500, { ok: false, error: "ANTHROPIC_API_KEY env var is not set" });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return json(400, { ok: false, error: "bad json" }); }

  const { question, topic, customerName } = body;
  if (!question) return json(400, { ok: false, error: "question is required" });

  const userMsg =
    (topic ? `Topic: ${topic}\n` : "") +
    (customerName ? `Customer name: ${customerName}\n` : "") +
    `Customer's message:\n"""\n${question}\n"""\n\n` +
    "Write the reply body now.";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    const text = await res.text();
    if (!res.ok) return json(502, { ok: false, error: `Anthropic ${res.status}: ${text.slice(0, 300)}` });

    const data = JSON.parse(text);
    const draft = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!draft) return json(502, { ok: false, error: "empty draft" });
    return json(200, { ok: true, draft });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(obj) };
}
