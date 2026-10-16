# hyunjunghoon.github.io

Static GitHub Pages site (no build, `.nojekyll`).

- `sizescan/` — SizeScan privacy policy
- `dayframe/` — Dayframe "Ask someone" fallback pages
  - `dayframe/a/#<payload>` question page, `dayframe/r/#<payload>` reply page, `dayframe/` landing
  - All data is in the URL fragment (after `#`), so it is never sent to the server. Payload format: see
    `dayframe/app.js` (same as `util/AskLinks.kt` in the app).
- `.well-known/assetlinks.json` — Android App Links verification for `com.tallowbird.dayframe`

## TODO when Play App Signing is on

`assetlinks.json` currently lists only the **upload key** SHA-256. After the first release with Play App
Signing, copy the **app signing key** SHA-256 from Play Console → Test and release → App integrity →
App signing, and **append** it to `sha256_cert_fingerprints` (keep the upload key entry). Without it, links
open in the browser instead of the Play-installed app.

Check: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://hyunjunghoon.github.io&relation=delegate_permission/common.handle_all_urls
