# Privacy Policy — Cookie Consent Dismisser

**Effective date:** 2026-09-01

Cookie Consent Dismisser is a Chrome extension that automatically answers cookie-consent banners on websites you visit. We built it to be private by default: the extension does not collect, store, or transmit any personal information.

## Information we do not collect

The extension does **not**:

- Collect your name, email address, or any account information.
- Collect your browsing history.
- Transmit any data to any server.
- Use any analytics, crash reporting, or telemetry.
- Load any remote code.

## Information stored locally

The following information is stored **only on your device**, using Chrome's built-in `storage` APIs. It never leaves your browser:

- **Your settings**: your chosen default answer (accept or reject), behaviour toggles, and per-site overrides.
- **Local statistics**: the number of banners handled, broken down by site (stored in `chrome.storage.local`).

You can reset statistics at any time from the extension's options page. Uninstalling the extension removes all stored data.

## How permissions are used

| Permission | Why it is needed |
|---|---|
| `storage` | To remember your settings, per-site overrides, and local statistics. |
| `tabs` | To read the active tab's URL so a per-site override also applies inside third-party consent iframes; and to push setting changes to open tabs. |
| `<all_urls>` (host permission) | Cookie-consent banners appear on arbitrary websites, so the extension must run on any http/https page to fulfil its single purpose. |

## Remote code

The extension does not load or execute any remote code. It contains no calls to `eval`, `new Function`, or equivalent, and makes no network requests.

## Changes to this policy

If this policy changes, we will update the extension and note the new effective date.

## Contact

For questions about this policy, open an issue in the [project repository](https://github.com/cavinsmith/chrome-cookie-consent-dismisser) or contact the developer through the Chrome Web Store developer page.
