# Note to reviewer

Thank you for reviewing Cookie Consent Dismisser.

## Single purpose

The extension automatically answers (accepts or rejects) cookie-consent banners on web pages the user visits.

## How to test

1. Install the extension and load any major news or SaaS site (e.g. theguardian.com, bbc.com, atlassian.com). Most will show a cookie-consent banner within a few seconds.
2. With the default mode "Reject all", the banner should disappear automatically. The toolbar badge shows a checkmark.
3. Open the toolbar popup to switch to "Accept all", override the answer per site, or trigger a run manually.
4. On a site that hides the reject button behind "Manage options" (many OneTrust deployments do), the extension opens the preferences pane and switches optional categories off.
5. When the extension is unsure about a block, it shows its own confirmation prompt (inside a shadow-DOM overlay tagged `data-cbac-ui`) instead of acting.

## Permission justifications

- **storage**: stores the user's chosen mode, per-site overrides, and local statistics.
- **tabs**: reads the active tab URL so a per-site override applies inside third-party consent iframes; pushes setting changes to open tabs.
- **host_permissions (`<all_urls>`)**: required because cookie-consent banners appear on arbitrary websites and the extension's single purpose is to answer them everywhere. No data is read from the page beyond what is needed to detect and dismiss consent UI.

## Privacy & security

- The extension makes **no network requests** and loads **no remote code**.
- It contains no `eval` or `new Function`, and no inline scripts.
- All data is stored locally via `chrome.storage.sync`/`chrome.storage.local`. Nothing is transmitted.
- No ads, no analytics, no tracking.

## Code

All source is bundled from TypeScript into IIFE content scripts (`shadow-hook.js`, `content.js`, `prompt.js`), a service worker (`background.js`), and popup/options pages. There is no dynamic code execution.
