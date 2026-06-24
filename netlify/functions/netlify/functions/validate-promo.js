// Promo / affiliate codes live ONLY here on the server. Never sent to the browser.
// To add, edit, or remove a code, change this object and re-deploy.
const CODES = {
  "DEXFIT20": { value: 20, label: "20% off" },
  "CRYO20":   { value: 20, label: "20% off" },
  "FRAN15":   { value: 15, label: "15% off" },
  "NICK15":   { value: 15, label: "15% off" },
  "JONES15":  { value: 15, label: "15% off" },
  "FISHY20":  { value: 20, label: "20% off" },
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false }) };
  }
  let code = "";
  try { code = (JSON.parse(event.body || "{}").code || "").toString().trim().toUpperCase(); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ ok: false }) }; }
  const match = CODES[code];
  if (!match) return { statusCode: 200, body: JSON.stringify({ ok: false }) };
  return { statusCode: 200, body: JSON.stringify({ ok: true, type: "percent", value: match.value, label: match.label }) };
};
