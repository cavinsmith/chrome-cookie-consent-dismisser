# Cookie Consent Dismisser

**Repository:** https://github.com/cavinsmith/chrome-cookie-consent-dismisser
**Download:** [latest release](https://github.com/cavinsmith/chrome-cookie-consent-dismisser/releases/latest/download/cookie-consent-dismisser.zip)

A Chrome extension (Manifest V3, TypeScript) that answers cookie-consent
banners for you on every site. You pick the answer once — **reject all** or
**accept all** — and the extension applies it everywhere, in every frame.

## What it does

- **Two modes.** Reject everything optional (default), or accept everything.
  Set globally, override per site from the toolbar popup.
- **Knows 26 consent platforms by name** — OneTrust, Cookiebot, Didomi,
  Usercentrics, Quantcast, Sourcepoint, TrustArc, Osano, Termly, CookieYes,
  Complianz, Borlabs, Klaro, CookieScript, Iubenda, Axeptio, tarteaucitron,
  CookieFirst, CookieHub, Google Funding Choices, consentmanager.net, Cookie
  Information, Securiti, HubSpot, Moove GDPR, and the Insites CookieConsent
  widget. For these it clicks the exact button, including the reject button
  that a lot of them hide one level down behind "Manage options".
- **Falls back to a multilingual heuristic** for everything else: ~40 languages
  of accept/reject/settings/save vocabulary, matched against button labels.
- **Preference-pane fallback.** When a banner offers no reject button at all,
  reject mode opens the preferences pane, switches every optional category off
  — never the "strictly necessary" one — and saves.
- **Reaches banners inside shadow DOM**, including `mode: 'closed'` roots, and
  inside cross-origin iframes (the content script runs in all frames).
- **Cleans up afterwards**: hides leftover overlays and undoes the scroll lock
  banners leave on `<body>`.

## What it deliberately does *not* do

Clicking the wrong button is worse than leaving a banner up, so:

- It never clicks anything unless the surrounding block actually talks about
  cookies, consent, tracking or privacy. An "I agree" button in a checkout flow
  or a terms dialog is left alone.
- In reject mode it never presses accept as a fallback unless you turn that on
  explicitly in the options.
- Cosmetic hiding only applies to a floating overlay (fixed/sticky/`<dialog>`)
  whose attributes name a consent widget — so a site's own cookie-policy *page*
  is never hidden.
- It never flips a toggle labelled "necessary", "essential" or "always active".
- Each element is clicked at most once, and each page gets a hard budget of six
  interactions, so a hostile banner cannot put the extension in a loop.

Hiding a banner is cosmetic only: it records no consent either way. Sites that
gate content behind a consent wall will stay gated.

## Install

```bash
npm install
npm run build
```

Then in Chrome: **chrome://extensions** → enable **Developer mode** → **Load
unpacked** → select the `dist/` directory.

`npm run zip` produces an uploadable `cookie-consent-dismisser.zip`.

## Development

| Command | What it does |
| --- | --- |
| `npm run build` | Type-safe production bundle into `dist/` |
| `npm run watch` | Rebuild on change, with inline source maps |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run coverage` | Test suite with a coverage report |
| `npm run typecheck` | `tsc --noEmit` over `src`, `tests` and `scripts` |
| `npm run check` | typecheck + tests + build — run this before committing |

98 tests cover the pure logic (`src/core`, `src/common`) against jsdom, at 100%
statement coverage of the engine.

## Layout

```
src/
  common/     settings, per-site overrides, stats, shared types
  core/       the testable heart — no extension APIs are imported here
    text.ts       normalisation and phrase matching
    phrases.ts    multilingual accept/reject/settings/save vocabulary
    rules.ts      per-CMP selector rules
    detect.ts     generic button-first banner detection
    dom.ts        visibility, shadow-root walking, clicking, scroll unlock
    engine.ts     orchestration: rules → heuristic → hide
  content/    content script + the MAIN-world shadow-root hook
  background/ service worker: storage, badge, per-tab config
  popup/      toolbar UI
  options/    settings page
scripts/      esbuild bundling, PNG icon generation
tests/        vitest suites
```

`src/core` imports no `chrome.*` API and touches no extension globals, which is
what lets the whole decision path be tested in jsdom.

## How detection works

1. **Rules first.** If a known CMP's root element is on the page and visible,
   use its selectors. This is the only reliable way to tell reject from accept
   on CMPs that label the reject path ambiguously.
2. **Heuristic second, button-first.** Collect the page's clickable elements,
   classify each label, then walk up from a matching button to find the block
   that contains it. That block must talk about cookies for the button to be
   eligible — this ordering keeps the cost proportional to the number of
   controls rather than the size of the DOM, and the context requirement is
   what prevents false positives.
3. **Reject is matched before accept**, because reject labels routinely embed
   accept vocabulary (e.g. "Continue without accepting", "We do not accept").
4. **Hide last**, and only for floating consent overlays with nothing to click.

The content script re-runs on a debounced `MutationObserver` for 30 seconds
after the last activity, on a fixed retry schedule after load, and again when a
single-page app changes its URL.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Your mode, per-site overrides and counters |
| `tabs` | Read the active tab's URL so a per-site override applies inside third-party CMP iframes; push setting changes to open tabs |
| `<all_urls>` | Banners appear on arbitrary sites |

No data leaves the browser. Statistics are stored locally and can be cleared
from the options page.
