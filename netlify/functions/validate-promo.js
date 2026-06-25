// Promo / affiliate codes.
//
// Primary source: a "Promos" tab in the Cryonix Products Google Sheet,
// published to the web as CSV. This lets codes be added/edited in the sheet
// with NO redeploy. Set the published CSV link as the Netlify env var
// PROMO_CSV_URL, or paste it into PROMO_CSV_URL_FALLBACK below.
//
// Expected columns (header row, case-insensitive): code, percent
//   optional: label, active   (active = no/false/0/off disables a row)
//
// If the sheet is unreachable or not configured, the built-in STATIC_CODES
// list is used, so existing codes keep working no matter what.

const PROMO_CSV_URL = process.env.PROMO_CSV_URL || "";
const PROMO_CSV_URL_FALLBACK = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOVDkP0WwK7fOiaKw7i5pnFYJb9P5RBDkyZ9KMfXHOCQ7eGlD81BlXtvm3r0ArpVhnp8TjKlmH5_6O/pub?gid=782770332&single=true&output=csv"; // Published "Promos" tab CSV

const STATIC_CODES = {
  "DEXFIT20": { value: 20, label: "20% off" },
  "CRYO20":   { value: 20, label: "20% off" },
  "FRAN15":   { value: 15, label: "15% off" },
  "NICK15":   { value: 15, label: "15% off" },
  "JONES15":  { value: 15, label: "15% off" },
  "FISHY20":  { value: 20, label: "20% off" },
  "EDDIE15":  { value: 15, label: "15% off" },
};

// In-memory cache (per warm Lambda container) so we don't refetch every call.
let _cache = { at: 0, codes: null };
const CACHE_MS = 60 * 1000;

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  text = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(function (r) { return r.length && !(r.length === 1 && r[0] === ""); });
}

async function fetchSheetCodes(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, 4000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const csv = await res.text();
    const rows = parseCsv(csv);
    if (!rows.length) return null;
    const header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    const ci = header.indexOf("code");
    let pi = header.indexOf("percent");
    if (pi === -1) pi = header.indexOf("value");
    if (pi === -1) pi = header.indexOf("off");
    const li = header.indexOf("label");
    const ai = header.indexOf("active");
    if (ci === -1 || pi === -1) return null;
    const codes = {};
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const code = (cells[ci] || "").trim().toUpperCase();
      if (!code) continue;
      if (ai !== -1) {
        const a = (cells[ai] || "").trim().toLowerCase();
        if (a === "no" || a === "false" || a === "0" || a === "off") continue;
      }
      const pct = parseFloat(String(cells[pi] || "").replace(/[^0-9.]/g, ""));
      if (!pct || pct <= 0) continue;
      const label = (li !== -1 && cells[li] && cells[li].trim()) ? cells[li].trim() : (pct + "% off");
      codes[code] = { value: pct, label: label };
    }
    return Object.keys(codes).length ? codes : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getCodes() {
  const url = PROMO_CSV_URL || PROMO_CSV_URL_FALLBACK;
  if (!url) return STATIC_CODES;
  const now = Date.now();
  if (_cache.codes && (now - _cache.at) < CACHE_MS) return _cache.codes;
  const sheet = await fetchSheetCodes(url);
  // Sheet codes extend / override the built-in list.
  const codes = sheet ? Object.assign({}, STATIC_CODES, sheet) : STATIC_CODES;
  _cache = { at: now, codes: codes };
  return codes;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false }) };
  }
  let code = "";
  try { code = (JSON.parse(event.body || "{}").code || "").toString().trim().toUpperCase(); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ ok: false }) }; }

  const codes = await getCodes();
  const match = codes[code];
  if (!match) return { statusCode: 200, body: JSON.stringify({ ok: false }) };
  return { statusCode: 200, body: JSON.stringify({ ok: true, type: "percent", value: match.value, label: match.label }) };
};
