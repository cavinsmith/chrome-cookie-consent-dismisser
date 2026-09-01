/**
 * Runs in the page's own JavaScript world at `document_start`.
 *
 * Consent widgets increasingly render inside `mode: 'closed'` shadow roots,
 * which are invisible to an isolated-world content script — `host.shadowRoot`
 * returns `null` and the banner simply cannot be found. Forcing every shadow
 * root open makes them reachable again.
 *
 * The two worlds do not share JavaScript globals, only the DOM, so patching
 * `attachShadow` here is the only way to hand those roots to the content
 * script. The patch is transparent to well-behaved pages: `mode: 'closed'` is
 * an encapsulation hint, not a security boundary, and the returned root
 * behaves identically for the page that created it.
 */

const proto = Element.prototype as Element & {
  attachShadow: (init: ShadowRootInit) => ShadowRoot;
};
const original = proto.attachShadow;

interface Patched {
  (this: Element, init: ShadowRootInit): ShadowRoot;
  __cbacPatched?: boolean;
}

if (typeof original === 'function' && !(original as Patched).__cbacPatched) {
  const patched: Patched = function (this: Element, init: ShadowRootInit): ShadowRoot {
    const forced: ShadowRootInit = init?.mode === 'closed' ? { ...init, mode: 'open' } : init;
    return original.call(this, forced);
  };
  patched.__cbacPatched = true;

  try {
    Object.defineProperty(proto, 'attachShadow', {
      value: patched,
      writable: true,
      configurable: true,
    });
  } catch {
    /* A page that froze the prototype keeps its closed roots; nothing to do. */
  }
}

// Marks the file as a module so it is compiled in isolation; esbuild still
// emits a plain IIFE for the MAIN-world content script.
export {};
