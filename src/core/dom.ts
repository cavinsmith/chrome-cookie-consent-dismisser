/** DOM helpers shared by detection and the content script. */

export type SearchRoot = Document | ShadowRoot | Element;

/**
 * True when the document has a real layout engine (a browser), false under
 * jsdom where every rect is zero. Detection then skips geometry-based checks
 * instead of rejecting everything.
 */
export function hasLayout(doc: Document): boolean {
  const el = doc.documentElement;
  if (!el || typeof el.getBoundingClientRect !== 'function') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

function ownerWindow(el: Element): (Window & typeof globalThis) | null {
  return (el.ownerDocument?.defaultView as (Window & typeof globalThis) | null) ?? null;
}

/**
 * Conservative visibility test: an element counts as visible unless it is
 * explicitly hidden. Geometry is only consulted when the document actually has
 * a layout.
 */
export function isVisible(el: Element): boolean {
  if (!el.isConnected) return false;
  if (el.hasAttribute('hidden')) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;

  const win = ownerWindow(el);
  if (win) {
    let node: Element | null = el;
    let depth = 0;
    while (node && depth < 40) {
      const style = win.getComputedStyle(node);
      if (style.display === 'none') return false;
      if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
      if (style.opacity !== '' && Number(style.opacity) === 0) return false;
      node = node.parentElement;
      depth++;
    }
  }

  const doc = el.ownerDocument;
  if (doc && hasLayout(doc)) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
  }
  return true;
}

/**
 * Collects `root` plus every reachable shadow root, breadth-first.
 *
 * Only open roots are visible from here; `content/shadow-hook.ts` runs in the
 * page's own world and forces `attachShadow` to open mode so CMPs that would
 * otherwise be closed (Usercentrics, some Sourcepoint builds) still show up.
 */
export function collectRoots(root: Document | ShadowRoot, maxRoots = 200): (Document | ShadowRoot)[] {
  const out: (Document | ShadowRoot)[] = [root];
  const queue: (Document | ShadowRoot)[] = [root];

  while (queue.length > 0 && out.length < maxRoots) {
    const current = queue.shift()!;
    let hosts: Element[];
    try {
      hosts = Array.from(current.querySelectorAll('*'));
    } catch {
      continue;
    }
    for (const host of hosts) {
      const shadow = host.shadowRoot;
      if (shadow && !out.includes(shadow)) {
        out.push(shadow);
        queue.push(shadow);
        if (out.length >= maxRoots) break;
      }
    }
  }
  return out;
}

const CLICKABLE_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="link"]',
  'input[type="button"]',
  'input[type="submit"]',
  '[onclick]',
  '[data-testid]',
  '[class*="btn" i]',
  '[class*="button" i]',
].join(',');

/** Controls that unambiguously are controls, used to spot wrapper elements. */
const REAL_CONTROL_SELECTOR = 'button,a[href],[role="button"],[role="link"],input';

/**
 * True when `el` wraps other controls, which makes it a container rather than
 * a button — `collectClickables` casts a wide net (`[data-testid]`, anything
 * with "button" in its class), and without this a toolbar or a row of links
 * would be offered as a single control whose label is every link's text
 * concatenated.
 */
export function containsClickable(el: Element): boolean {
  try {
    return el.querySelector(REAL_CONTROL_SELECTOR) !== null;
  } catch {
    return false;
  }
}

/** Every plausibly clickable element inside `root`, capped for safety. */
export function collectClickables(root: Document | ShadowRoot, limit = 400): Element[] {
  let found: Element[];
  try {
    found = Array.from(root.querySelectorAll(CLICKABLE_SELECTOR));
  } catch {
    return [];
  }
  return found.slice(0, limit);
}

/**
 * The user-visible label of a control: its text, or the accessible name when
 * the control is icon-only.
 */
export function elementLabel(el: Element): string {
  const parts = [
    el.textContent ?? '',
    el.getAttribute('aria-label') ?? '',
    el.getAttribute('title') ?? '',
    el.getAttribute('value') ?? '',
  ];
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 300);
}

/** Tags whose text is code or markup, never something the user reads. */
const CODE_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT']);

/**
 * The text a reader actually sees inside `el`, capped at `cap` characters.
 *
 * `textContent` is not usable for sizing a block: CMPs routinely ship their
 * whole configuration as an inline `<script>` JSON blob, which made one real
 * banner's body measure 850 000 characters of "text". Reading stops as soon as
 * `cap` is reached, so this stays cheap on huge documents.
 */
export function visibleText(el: Element, cap = 50_000): string {
  let hasCode = false;
  try {
    hasCode = el.querySelector('script,style,template,noscript') !== null;
  } catch {
    hasCode = false;
  }
  if (!hasCode) {
    const raw = el.textContent ?? '';
    return raw.length > cap ? raw.slice(0, cap) : raw;
  }

  const parts: string[] = [];
  let length = 0;
  const visit = (node: Node): void => {
    if (length >= cap) return;
    if (node.nodeType === 3) {
      const value = node.nodeValue ?? '';
      parts.push(value);
      length += value.length;
      return;
    }
    if (node.nodeType !== 1) return;
    if (CODE_TAGS.has((node as Element).tagName)) return;
    for (const child of Array.from(node.childNodes)) {
      if (length >= cap) return;
      visit(child);
    }
  };
  visit(el);
  return parts.join('').slice(0, cap);
}

/**
 * True when the element belongs to this extension's own confirmation prompt.
 * That UI necessarily contains the word "cookie", so without this guard the
 * engine would happily detect itself.
 */
export function isOurUi(el: Element): boolean {
  if (typeof el.closest !== 'function') return false;
  if (el.closest('[data-cbac-ui]')) return true;
  const root = el.getRootNode();
  const host = (root as ShadowRoot).host;
  return host ? host.hasAttribute('data-cbac-ui') : false;
}

/** Identifying attributes, used for CMP-name hints. */
export function elementSignature(el: Element): string {
  return [
    el.id,
    typeof el.className === 'string' ? el.className : '',
    el.getAttribute('data-testid') ?? '',
    el.getAttribute('data-cy') ?? '',
    el.getAttribute('name') ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * Dispatches a realistic click. Some CMPs listen for `pointerdown` or
 * `mouseup` rather than `click`, so the full sequence is sent before falling
 * back to `HTMLElement.click()`.
 */
export function simulateClick(el: Element): void {
  const win = ownerWindow(el);
  const MouseEventCtor = win?.MouseEvent ?? globalThis.MouseEvent;
  // `view` is deliberately omitted: it adds nothing for listeners and some
  // engines reject a cross-realm window there.
  const opts = { bubbles: true, cancelable: true, composed: true };

  if (typeof MouseEventCtor === 'function') {
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup'] as const) {
      try {
        el.dispatchEvent(new MouseEventCtor(type, opts));
      } catch {
        /* pointer events are optional; ignore environments without them */
      }
    }
  }

  if (typeof (el as HTMLElement).click === 'function') {
    (el as HTMLElement).click();
  } else if (typeof MouseEventCtor === 'function') {
    el.dispatchEvent(new MouseEventCtor('click', opts));
  }
}

/** Hides an element without removing it, so page scripts keep working. */
export function hideElement(el: Element): void {
  const style = (el as HTMLElement).style;
  if (!style) return;
  style.setProperty('display', 'none', 'important');
  style.setProperty('visibility', 'hidden', 'important');
  style.setProperty('opacity', '0', 'important');
  style.setProperty('pointer-events', 'none', 'important');
  el.setAttribute('data-cbac-hidden', '1');
}

/**
 * Undoes a scroll lock left behind by a banner. Only touches the properties a
 * lock actually uses, and only when they are currently locking.
 */
export function unblockScroll(doc: Document): boolean {
  const win = doc.defaultView;
  let changed = false;
  for (const el of [doc.documentElement, doc.body]) {
    if (!el) continue;
    const style = win ? win.getComputedStyle(el) : null;
    const locked =
      style?.overflow === 'hidden' ||
      style?.overflowY === 'hidden' ||
      style?.position === 'fixed' ||
      el.style.overflow === 'hidden' ||
      el.style.position === 'fixed';
    if (!locked) continue;
    el.style.setProperty('overflow', 'auto', 'important');
    el.style.setProperty('overflow-y', 'auto', 'important');
    if (style?.position === 'fixed' || el.style.position === 'fixed') {
      el.style.setProperty('position', 'static', 'important');
    }
    changed = true;
  }
  return changed;
}
