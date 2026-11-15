# hyunjunghoon.github.io

Static GitHub Pages site (no build, `.nojekyll`). This is the Play developer website: `index.html` lists the
Tallowbird apps (name, the store short description, Play link).

- `sizescan/` — SizeScan privacy policy
- `dayframe/` — Dayframe "Ask someone" fallback pages
  - `dayframe/a/#<payload>` question page, `dayframe/r/#<payload>` reply page, `dayframe/` landing
  - All data is in the URL fragment (after `#`), so it is never sent to the server. Payload format: see
    `dayframe/app.js` (same as `util/AskLinks.kt` in the app).
- `dayframe/questions/` — question-list pages built from the app's packs (kids, me × en, ko), each with Play links
  carrying `referrer=utm_source=hyunjunghoon.github.io&utm_campaign=questions_<pack>_<lang>_<mid|end>`
  (Play Console → store analysis shows these). Generator: Dayframe repo `docs/web/gen_questions.py`.
- `sitemap.xml`, `robots.txt` — for Search Console
- `.well-known/assetlinks.json` — Android App Links verification for `com.tallowbird.dayframe`
  (app signing key SHA-256 added 2026-11-08, upload key kept)

## TODO when Play App Signing is on

`assetlinks.json` currently lists only the **upload key** SHA-256. After the first release with Play App
Signing, copy the **app signing key** SHA-256 from Play Console → Test and release → App integrity →
App signing, and **append** it to `sha256_cert_fingerprints` (keep the upload key entry). Without it, links
open in the browser instead of the Play-installed app.

Check: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://hyunjunghoon.github.io&relation=delegate_permission/common.handle_all_urls
