# Chrome Web Store listing

## Name (max 45 chars)
Cookie Consent Dismisser

## Summary (max 132 chars)
Automatically accept or reject cookie-consent banners on every site. Your choice, applied everywhere.

## Description
Cookie Consent Dismisser answers cookie-consent banners for you, on every site, in every frame.

Pick your answer once — reject everything optional, or accept everything — and the extension applies it everywhere. Override per site from the toolbar popup.

**How it works**
- Recognises 26 widely used consent platforms by name (OneTrust, Cookiebot, Didomi, Usercentrics, Quantcast, Sourcepoint, TrustArc, Osano, Termly, CookieYes, Complianz, Borlabs, Klaro, CookieScript, Iubenda, Axeptio, tarteaucitron, CookieFirst, CookieHub, Google Funding Choices, consentmanager.net, Cookie Information, Securiti, HubSpot, Moove GDPR, Insites CookieConsent).
- Falls back to a multilingual heuristic for everything else, matching button labels in over 40 languages.
- When a banner hides its reject button behind "Manage options", the extension opens the preferences pane and switches every optional category off.
- Reaches banners inside shadow DOM and inside cross-origin iframes.

**When it is not sure**
If the extension thinks something is a cookie banner but is not confident, it shows its own prompt asking whether to close it — instead of guessing. You can tell it to always act, always skip, or keep asking, per site.

**Privacy**
- No data leaves the browser. Settings and statistics are stored locally.
- No remote code, no analytics, no tracking.
- No external network requests.

## Category
Productivity

## Privacy practices (developer dashboard)

### Single-purpose description
Automatically answers (accepts or rejects) cookie-consent banners on web pages.

### Permission justifications

**storage**
Stores your chosen mode (accept/reject), per-site overrides, and local statistics about how many banners have been handled.

**tabs**
Reads the active tab's URL so a per-site override also applies inside third-party consent iframes that the page embeds. Pushes setting changes to open tabs so they take effect without a reload.

**host_permissions (`<all_urls>`)**
Cookie-consent banners appear on arbitrary websites. The extension must run on any http/https page to detect and answer them. This is the core, single purpose of the extension.

### Data usage
- **Does not collect or transmit user data.** All data (settings, per-site overrides, statistics) is stored locally via `chrome.storage.sync` and `chrome.storage.local`.
- **Does not use remote code.** The extension contains no external scripts, no eval, no dynamic code loading.
- **Does not sell data, does not use data for any purpose other than the single purpose above.**

### User controls
Users can disable the extension entirely, disable it per site, and clear all statistics from the options page.
