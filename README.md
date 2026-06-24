# Cryonix Research - site files

## What's here
- index.html ............ the whole storefront (one file)
- netlify.toml .......... tells Netlify where the function lives
- netlify/functions/validate-promo.js .. checks promo codes on the server (codes are NOT in the page)

## Deploy (GitHub method - makes promo codes work)
1. Create a free account at github.com.
2. Click the + (top right) > New repository. Name it (e.g. cryonix-site), keep it Public or Private, click Create.
3. On the new repo page click "uploading an existing file".
4. Drag in the CONTENTS of this folder (index.html, netlify.toml, and the netlify folder)
   so index.html sits at the top level of the repo. Click Commit changes.
5. Go to app.netlify.com > Add new site > Import an existing project > GitHub > pick this repo.
6. Leave build settings blank, click Deploy. Done. Every future edit you commit auto-deploys.

## Send form submissions to your email
After the first deploy and first test submission:
Netlify site > Forms (you'll see gate-signup, order, contact)
Site configuration > Notifications > Form notifications > Add notification > Email notification
Enter: cryonix.research@gmail.com   (or whichever address you want)

## Edit promo codes
Open netlify/functions/validate-promo.js, edit the CODES list, commit. Never appears in the page.

## Edit stock
In index.html find a product line and set stock to:
  'in'  = normal,  'low' = "Low Stock" badge,  'out' = greyed out + disabled
Commit to update.

## Still to do later
- Real payment processor (checkout is a placeholder)
- A mail tool (Mailchimp/Brevo) to actually send the newsletter to your opt-in list
