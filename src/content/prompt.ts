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

/** Fallback name, used only if the manifest is somehow unreadable. */
const FALLBACK_NAME = 'Cookie Consent Dismisser';

/**
 * The extension's mark, inlined as SVG rather than loaded from `icons/`.
 * A packaged icon would have to be listed in `web_accessible_resources`, which
 * lets any page probe for the extension; this draws the same cookie disc (same
 * geometry and colours as `scripts/make-icons.mjs`) with no such exposure.
 */
const MARK_SVG = `
<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
  <circle cx="50" cy="50" r="46" fill="#b07a3a"/>
  <circle cx="50" cy="50" r="41" fill="#d69e58"/>
  <g fill="#4a2e1a">
    <circle cx="36" cy="34" r="10"/>
    <circle cx="64" cy="42" r="8.5"/>
    <circle cx="44" cy="66" r="9.5"/>
    <circle cx="70" cy="68" r="7"/>
  </g>
</svg>`;

function extensionName(): string {
  try {
    return chrome.runtime.getManifest().name || FALLBACK_NAME;
  } catch {
    return FALLBACK_NAME;
  }
}

let host: HTMLElement | null = null;
let highlight: HTMLElement | null = null;

interface OpenPrompt {
  shadow: ShadowRoot;
  card: HTMLElement;
  backdrop: HTMLElement;
  confirm: HTMLElement;
  cancel: HTMLElement;
  alwaysRow: HTMLElement;
  alwaysCheck: HTMLInputElement;
  pending: PendingAction;
  onConfirm: (pending: PendingAction, always: boolean) => void;
  onDismiss: (pending: PendingAction) => void;
}

let open: OpenPrompt | null = null;
let listening = false;

/**
 * Finds which of the prompt's own controls a click landed on.
 *
 * The event path is checked first. When it does not mention the prompt at all
 * — a page overlay stacked above us swallowed the hit — the pointer position
 * is resolved inside the shadow root instead, so the dialog still answers to
 * clicks that visually landed on it.
 */
function controlFor(event: MouseEvent): Element | null {
  // A page that sweeps unknown nodes can rip the prompt out of the document;
  // once that happens it owns its clicks again.
  if (!open || !open.card.isConnected) return null;

  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  for (const node of path) {
    if (node === open.card) return null; // the card itself, not one of its controls
    if (node === open.backdrop) return open.backdrop;
    if (node instanceof Element && open.shadow.contains(node)) return node;
  }

  const rect = open.card.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  const { clientX: x, clientY: y } = event;
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
  const root = open.shadow as unknown as { elementFromPoint?: (x: number, y: number) => Element | null };
  return root.elementFromPoint?.(x, y) ?? null;
}

/**
 * Handles clicks on the prompt from `window`'s capture phase.
 *
 * Consent walls routinely install a capture listener that cancels every click
 * outside their own dialog; that silently disabled this prompt — even the
 * checkbox stopped ticking. Listening on `window` from the content script,
 * which runs before any page script, puts this handler first in the capture
 * order, and the click is consumed here so the page never sees it.
 */
function onWindowClick(event: MouseEvent): void {
  if (!open) return;
  const control = controlFor(event);
  if (!control) return;

  const state = open;
  // The page never sees this click, so its listeners cannot cancel it.
  event.stopImmediatePropagation();

  if (state.alwaysRow.contains(control)) {
    // The tick box and its label are left to their own default behaviour —
    // cancelling the click here would undo the toggle the browser has already
    // applied.
    return;
  }

  event.preventDefault();

  if (state.confirm.contains(control)) {
    const always = state.alwaysCheck.checked;
    open = null;
    state.onConfirm(state.pending, always);
    return;
  }
  if (state.cancel.contains(control) || control === state.backdrop) {
    open = null;
    state.onDismiss(state.pending);
  }
}

/** Escape leaves the banner alone, the same as "Leave it". */
function onWindowKeydown(event: KeyboardEvent): void {
  if (!open || !open.card.isConnected || event.key !== 'Escape') return;
  const state = open;
  event.stopImmediatePropagation();
  open = null;
  state.onDismiss(state.pending);
}

/**
 * Claims the first slot in `window`'s capture phase.
 *
 * Called as the module loads — at `document_start`, before any page script has
 * run — so that a consent wall registering its own window listener cannot get
 * ahead of us and cancel the prompt's clicks with `stopImmediatePropagation`.
 * Both handlers return immediately while no prompt is open.
 */
function startListening(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('click', onWindowClick, true);
  window.addEventListener('keydown', onWindowKeydown, true);
}

startListening();

const STYLE = `
:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: 2147483647;
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
.brand {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #6b7280;
}
.brand .mark { display: flex; flex: none; }
.brand svg { width: 16px; height: 16px; display: block; }
@media (prefers-color-scheme: dark) { .brand { color: #9aa2ae; } }
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
  card.setAttribute('aria-label', `${extensionName()}: cookie banner confirmation`);

  const brand = document.createElement('div');
  brand.className = 'brand';
  const mark = document.createElement('span');
  mark.className = 'mark';
  // Static markup defined in this file — no page-controlled data reaches it.
  mark.innerHTML = MARK_SVG;
  const brandName = document.createElement('span');
  brandName.textContent = extensionName();
  brand.append(mark, brandName);

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

  actions.append(cancel, confirm);
  card.append(brand, title, body, preview, alwaysRow, actions);
  shadow.append(style, backdrop, card);

  open = {
    shadow,
    card,
    backdrop,
    confirm,
    cancel,
    alwaysRow,
    alwaysCheck,
    pending,
    onConfirm,
    onDismiss,
  };
}

export function dismissConfirmPrompt(): void {
  open = null;
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
