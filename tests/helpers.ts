/** Shared fixtures for the DOM-level tests. */

export function mountHtml(html: string): void {
  document.body.innerHTML = html;
}

/** Records every element that receives a click during a test. */
export function trackClicks(): { clicked: string[]; stop: () => void } {
  const clicked: string[] = [];
  const handler = (event: Event): void => {
    const target = event.target as Element | null;
    if (!target) return;
    const id = target.id || target.className || target.tagName;
    clicked.push(String(id));
  };
  document.addEventListener('click', handler, true);
  return { clicked, stop: () => document.removeEventListener('click', handler, true) };
}

/** A minimal OneTrust banner. */
export const ONETRUST_HTML = `
  <div id="onetrust-consent-sdk">
    <div id="onetrust-banner-sdk">
      <p>We use cookies to personalise content and analyse our traffic.</p>
      <button id="onetrust-pc-btn-handler">Cookie Settings</button>
      <button id="onetrust-reject-all-handler">Reject All</button>
      <button id="onetrust-accept-btn-handler">Accept All Cookies</button>
    </div>
  </div>`;

/** A generic, unbranded banner in a given language. */
export function genericBanner(opts: {
  text: string;
  accept: string;
  reject?: string;
  settings?: string;
}): string {
  return `
    <div class="notice-bar" style="position: fixed; z-index: 9999">
      <p>${opts.text}</p>
      ${opts.reject ? `<button id="btn-reject">${opts.reject}</button>` : ''}
      ${opts.settings ? `<button id="btn-settings">${opts.settings}</button>` : ''}
      <button id="btn-accept">${opts.accept}</button>
    </div>`;
}
