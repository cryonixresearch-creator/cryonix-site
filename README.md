# Cryonix — Deployment & Setup Guide

## Folder Structure
```
/
├── index.html                          ← your website
├── netlify/functions/
│   ├── get-products.js                 ← fetches stock/prices from Google Sheets
│   └── validate-promo.js              ← validates promo codes (hidden from browser)
├── products-sheet-template.csv        ← import this into Google Sheets
└── README.md
```

---

## Step 1 — Deploy to Netlify

1. Zip this entire folder
2. Go to netlify.com → Add new site → Deploy manually → drag the zip in
3. Your site will be live at a `.netlify.app` URL

---

## Step 2 — Set Up Google Sheets (manage stock & prices)

1. Go to **Google Sheets** → create a new blank spreadsheet
2. Go to **File → Import** → upload `products-sheet-template.csv`
3. Select "Replace spreadsheet" → Import

Your sheet now has all your products. The columns are:
| Column | What it does |
|--------|-------------|
| name | Product name |
| mg | Dosage/size |
| sub | Subtitle shown on card |
| price | Current price (numbers only, no $) |
| orig | Original price for strikethrough (leave blank if no sale) |
| badge | `hot`, `new`, `sale` — or leave blank |
| cat | Category — must match exactly: `Metabolic`, `Recovery & Repair`, `Growth Factors`, `Blends`, `Anti-Aging`, `Research Water` |
| desc | Full product description for the modal |
| stock | **Quantity in stock** (number). `0` or `out` = Out of Stock. `1–4` = Low Stock (orange badge). `5+` = normal |

4. Go to **File → Share → Publish to web**
5. Under "Link", select **Sheet1** and **Comma-separated values (.csv)**
6. Click **Publish** → copy the URL

---

## Step 3 — Add the Sheets URL to Netlify

1. In Netlify dashboard → **Site configuration → Environment variables**
2. Click **Add a variable**:
   - Key: `SHEETS_CSV_URL`
   - Value: *(paste the CSV URL from Step 2)*
3. Click **Save** → go to **Deploys** → **Trigger deploy**

That's it — your site now pulls live data from the sheet.

---

## Step 4 — Add / Edit Promo Codes

Open `netlify/functions/validate-promo.js` and edit the `PROMO_CODES` object:

```js
const PROMO_CODES = {
  'MYCODE20': { type: 'percent', value: 20, label: '20% off', affiliate: 'name' },
  'FREESHIP': { type: 'shipping', value: 0, label: 'Free shipping', affiliate: null },
};
```

- `type: 'percent'` → percentage discount on subtotal
- `type: 'shipping'` → makes shipping free
- `value` → the percentage (ignored for shipping type)
- `affiliate` → internal label for your tracking (never shown to customers)

After editing, re-deploy on Netlify.

---

## Step 5 — Contact Form Email Notifications

1. In Netlify dashboard → **Forms** → click `contact`
2. → **Form notifications** → **Add notification** → **Email notification**
3. Set "To" to `cryonix.research@gmail.com`
4. Netlify will send a plain-text email for every submission

---

## Day-to-Day: Updating Stock & Prices

Just open your Google Sheet and edit the `stock`, `price`, or `orig` columns.
Changes appear on the site within ~60 seconds (one cache cycle). No code, no deploys needed.

### Stock quick reference:
- Type `0` or `out` → **Out of Stock** (grey, can't add to cart)
- Type `1`, `2`, `3`, or `4` → **Low Stock** (orange badge + pulsing dot in sidebar)
- Type `5` or more → **In Stock** (normal)
