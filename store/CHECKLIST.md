# Chrome Web Store Publication Checklist

## Pre-submission (code & build)

- [x] `manifest_version: 3`
- [x] `name` ≤ 75 chars (23)
- [x] `short_name` ≤ 12 chars (12)
- [x] `description` ≤ 132 chars (124)
- [x] `version` valid format (1.0.0)
- [x] `version_name` set
- [x] Icons at 16/32/48/128 px (PNG)
- [x] `host_permissions` in `host_permissions` (not `permissions`)
- [x] Permissions minimal: `storage`, `tabs`
- [x] Service worker (`background.js`)
- [x] No `eval`, `new Function`, dynamic `import()`
- [x] No inline scripts in HTML
- [x] No remote resources in HTML/JS
- [x] No `content_security_policy` override
- [x] Bundle size well under 32 MB (31 KB)
- [x] ZIP contains only extension files (no .ts, node_modules, .git)
- [x] `npm run check` passes (typecheck + tests + build + validate)
- [x] 112 tests passing

## Developer account

- [ ] Register at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
- [ ] Pay one-time registration fee (~$5 USD — verify current amount)
- [ ] Enable 2-step verification on the account
- [ ] Note: new publishers are capped at 2 published extensions

## Store listing

- [ ] Upload `cookie-consent-dismisser.zip`
- [ ] **Category**: Productivity
- [ ] **Language**: English (add others if desired)

### Store page content

Use `store/listing.md` for:
- **Name**: Cookie Consent Dismisser
- **Summary** (≤ 132 chars): Auto-accept or auto-reject cookie banners on every site. Your choice, applied everywhere. Asks before acting on unsure ones.
- **Description**: Full description from listing.md

### Screenshots & graphics

- [ ] **Small promo tile** (440 × 280 px)
- [ ] **Large promo tile** (920 × 680 px) — optional but recommended
- [ ] **Marquee banner** (1400 × 560 px) — optional, for featured placement
- [ ] **Screenshots** (1280 × 800 or 640 × 480 px) — at least one, up to 5
  - Recommended: a before/after of a banner being dismissed, the popup, the options page, the confirmation prompt

## Privacy & permissions (developer dashboard)

### Single-purpose description
> Automatically answers (accepts or rejects) cookie-consent banners on web pages the user visits.

### Permission justifications (fill in dashboard)

| Permission | Justification |
|---|---|
| `storage` | Stores the user's chosen mode (accept/reject), per-site overrides, and local statistics about how many banners have been handled. |
| `tabs` | Reads the active tab's URL so a per-site override also applies inside third-party consent iframes; pushes setting changes to open tabs so they take effect without a reload. |
| `<all_urls>` (host permission) | Cookie-consent banners appear on arbitrary websites. The extension must run on any http/https page to detect and answer them. This is the core, single purpose of the extension. |

### Privacy tab disclosures

- [ ] **Does not collect or transmit user data** — select "No" for all data collection questions, OR disclose accurately:
  - **Browsing history**: Not collected. (The extension reads the active tab URL locally to resolve per-site overrides, but does not record or transmit it.)
  - **Personally identifiable information**: Not collected.
  - **User activity**: Handled locally only (banner detection runs in-page; statistics stored locally).
- [ ] **Privacy policy URL**: Required because the extension handles user data (settings). Publish `store/privacy-policy.md` to a public URL (e.g., GitHub Pages) and enter the link.
- [ ] **Does not sell data**: Check the certification.
- [ ] **Uses data only for single purpose**: Check the certification.

## Test instructions (dashboard "Test instructions" tab)

Paste the content of `store/note-to-reviewer.md`. Key points for the reviewer:
- How to trigger the feature (visit a site with a banner)
- Permission justifications
- No login required
- No data collection

## Before submitting

- [ ] Review the [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [ ] Ensure no third-party brand names imply endorsement (we mention CMP names only descriptively — acceptable, but be aware)
- [ ] Verify the privacy policy URL is live and accessible
- [ ] Test the uploaded ZIP in a fresh Chrome profile via "Load unpacked"
- [ ] Consider enabling "Defer publish" to review the approved listing before it goes live

## After submission

- [ ] Watch email for review notifications (typically hours to a few days)
- [ ] If rejected, read the reason carefully, fix, and resubmit
- [ ] Once approved, publish (or it auto-publishes unless defer is on)
