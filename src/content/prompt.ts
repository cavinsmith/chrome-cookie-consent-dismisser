/**
 * The extension's own confirmation prompt.
 *
 * Shown inside an open shadow root so the page's styles cannot leak in or
 * reposition it. The host element is tagged `data-cbac-ui`, which the detector
 * recognises via `dom.isOurUi` — without that, the prompt itself would be
 * detected as a cookie banner and the engine would try to close it.
 */

import type { PendingAction } from '../common/types.js';

const HOST_ATTR = 'data-cbac-ui';
const HIGHLIGHT_ATTR = 'data-cbac-highlight';

let host: HTMLElement | null = null;
let highlight: HTMLElement | null = null;

const STYLE = `
:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color-scheme: light dark;
  pointer-events: none;
}
.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  pointer-events: auto;
}
.card {
  position: relative;
  width: min(420px, 100%);
  background: #ffffff;
  color: #16181d;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
  padding: 16px;
  pointer-events: auto;
}
@media (prefers-color-scheme: dark) {
  .card { background: #1e2127; color: #f2f3f5; }
}
h1 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}
p { margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #444; }
@media (prefers-color-scheme: dark) { p { color: #c7ccd4; } }
.row { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 12px; }
.row input { margin: 0; }
.actions { display: flex; gap: 8px; justify-content: flex-end; }
button {
  font: inherit;
  font-size: 13px;
  padding: 7px 14px;
  border-radius: 7px;
  border: 1px solid #d4d7dc;
  background: #f4f5f7;
  color: #16181d;
  cursor: pointer;
}
button:hover { border-color: #2f6fed; }
button.primary { background: #2f6fed; border-color: #2f6fed; color: #fff; }
button.primary:hover { background: #265fd4; }
@media (prefers-color-scheme: dark) {
  button { background: #2a2e36; border-color: #3a3f49; color: #f2f3f5; }
  button.primary { background: #4d83f5; border-color: #4d83f5; color: #fff; }
}
.preview {
  font-size: 12px;
  color: #6b7280;
  background: #f4f5f7;
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (prefers-color-scheme: dark) { .preview { background: #2a2e36; color: #c7ccd4; } }
`;

export function showConfirmPrompt(
  pending: PendingAction,
  onConfirm: (pending: PendingAction, always: boolean) => void,
  onDismiss: (pending: PendingAction) => void,
): void {
  dismissConfirmPrompt();

  highlight = pending.container as HTMLElement;
  if (highlight && highlight.style) {
    highlight.setAttribute(HIGHLIGHT_ATTR, '1');
    highlight.style.setProperty('outline', '3px solid #2f6fed', 'important');
    highlight.style.setProperty('outline-offset', '2px', 'important');
    highlight.style.setProperty('transition', 'outline 0.15s ease', 'important');
  }

  host = document.createElement('div');
  host.setAttribute(HOST_ATTR, '1');
  document.body.append(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = STYLE;
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Cookie banner confirmation');

  const title = document.createElement('h1');
  title.textContent = pending.kind === 'click' ? 'Close this cookie banner?' : 'Hide this cookie notice?';

  const body = document.createElement('p');
  body.textContent =
    'This extension thinks the highlighted box is a cookie consent banner, ' +
    'but it is not completely sure. If it is, the button below will be pressed ' +
    'and the banner will go away.';

  const preview = document.createElement('div');
  preview.className = 'preview';
  preview.textContent = pending.label ? `Button: “${pending.label}”` : 'No button label detected';

  const alwaysRow = document.createElement('div');
  alwaysRow.className = 'row';
  const alwaysCheck = document.createElement('input');
  alwaysCheck.type = 'checkbox';
  alwaysCheck.id = 'cbac-always';
  const alwaysLabel = document.createElement('label');
  alwaysLabel.htmlFor = 'cbac-always';
  alwaysLabel.textContent = 'Always do this on this site';
  alwaysRow.append(alwaysCheck, alwaysLabel);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Leave it';
  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'primary';
  confirm.textContent = pending.kind === 'click' ? 'Close banner' : 'Hide it';

  cancel.addEventListener('click', () => onDismiss(pending));
  confirm.addEventListener('click', () => onConfirm(pending, alwaysCheck.checked));
  backdrop.addEventListener('click', () => onDismiss(pending));

  actions.append(cancel, confirm);
  card.append(title, body, preview, alwaysRow, actions);
  shadow.append(style, backdrop, card);
}

export function dismissConfirmPrompt(): void {
  if (highlight && highlight.style) {
    highlight.removeAttribute(HIGHLIGHT_ATTR);
    highlight.style.removeProperty('outline');
    highlight.style.removeProperty('outline-offset');
    highlight.style.removeProperty('transition');
  }
  highlight = null;
  host?.remove();
  host = null;
}
