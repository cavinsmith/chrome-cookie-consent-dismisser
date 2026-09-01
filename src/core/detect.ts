/**
 * Generic (rule-free) banner detection.
 *
 * Strategy is button-first: find controls whose label reads like an
 * accept/reject action, then walk up to the block that contains them and
 * require that block to talk about cookies/consent.
 *
 * The hard part is not finding banners — it is *not* firing on ordinary
 * application UI. Two gates do that work:
 *
 *  - context strength. "Cookie"/"consent"/"GDPR" is STRONG evidence; "privacy"
 *    or "personal data" is WEAK, because the footer of any account-settings
 *    modal links to a privacy policy.
 *  - generic labels. "OK", "Got it", "Done" and friends are only treated as
 *    consent buttons inside a STRONG block.
 *
 * Whatever survives both gates still carries a confidence score, so the caller
 * can ask the user instead of acting on a thin match.
 */

import {
  CONSENT_ID_HINTS,
  GENERIC_ACCEPT_PHRASES,
  REJECT_PHRASES,
  ACCEPT_PHRASES,
  SAVE_PHRASES,
  SETTINGS_PHRASES,
  STRONG_CONSENT_CONTEXT,
  WEAK_CONSENT_CONTEXT,
} from './phrases.js';
import {
  collectClickables,
  containsClickable,
  elementLabel,
  elementSignature,
  isOurUi,
  isVisible,
  visibleText,
} from './dom.js';
import { countPhraseHits, matchesAny, normalize, scorePhrases, tokenize } from './text.js';

export type ButtonKind = 'accept' | 'reject' | 'settings' | 'save';
export type ContextStrength = 'none' | 'weak' | 'strong';

export interface Classification {
  kind: ButtonKind;
  score: number;
  /** The label matched a phrase exactly, rather than merely containing one. */
  exact: boolean;
  /** The label is common in ordinary UI and needs STRONG context to count. */
  generic: boolean;
}

export interface Candidate {
  kind: ButtonKind;
  button: Element;
  container: Element;
  /** Ranking within a page; higher wins. */
  score: number;
  /** How much we trust this to be a real consent control, 0–9. */
  confidence: number;
  contextStrength: ContextStrength;
  label: string;
}

/**
 * Candidates at or above this are acted on without asking. Set above the score
 * a weak-context match can reach (weak + exact + specific + overlay = 5) so
 * that anything short of strong consent context, a named container, or a
 * signature match always goes through the prompt.
 */
export const CONFIDENT_THRESHOLD = 6;
/** Below this a candidate is discarded rather than queried. */
export const MINIMUM_THRESHOLD = 3;

/** Longest label still plausible for a button rather than a paragraph. */
const MAX_LABEL_LEN = 120;
/**
 * How much text a block may hold and still be read as a consent banner.
 *
 * The limit exists because an anonymous block is credited purely from its
 * wording: without it, a page wrapper that mentions cookies once in its footer
 * would become "the banner" for every button on the page.
 *
 * That reasoning does not apply once the block has identified itself some
 * other way — it names a CMP in its own attributes, it floats above the page,
 * or the whole document it lives in is a consent frame. Those get the larger
 * limit, because a real preferences pane with every category expanded runs to
 * thousands of characters: Fiat's is ~4 900, gaspedaal.nl's overshot the plain
 * limit by fifty characters, and a OneTrust pane is larger still.
 */
const MAX_CONTAINER_TEXT = 4000;
/** The same, for a block that has identified itself as consent UI. */
const MAX_NAMED_CONTAINER_TEXT = 40_000;
/** How long a `isDedicatedConsentFrame` answer is reused, in milliseconds. */
const FRAME_CACHE_MS = 2000;
/**
 * Above this size, an anonymous block must be *about* consent rather than
 * merely mention it: one more consent term is required per this many
 * characters. Otherwise any long page with "Cookie policy" in its footer
 * becomes a banner, and every "OK" button on it becomes a candidate.
 */
const DENSE_CONTEXT_FROM = 1500;
const MIN_CONTAINER_TEXT = 12;
const MAX_ANCESTOR_WALK = 15;

/**
 * Buckets a control label.
 *
 * REJECT is tested first on purpose: labels such as "Continue without
 * accepting" or "We do not accept" contain accept vocabulary, and testing accept
 * first would misfile them.
 */
export function classifyLabel(label: string): Classification | null {
  const text = label.trim();
  if (!text || text.length > MAX_LABEL_LEN) return null;

  const generic = matchesAny(text, GENERIC_ACCEPT_PHRASES);
  const build = (kind: ButtonKind, score: number): Classification => ({
    kind,
    score,
    exact: score >= 100,
    // A reject label is only "generic" when it is a bare word such as "No":
    // "Continue without accepting" contains the generic word "continue" but
    // says exactly one thing, and should not need strong context to count.
    generic: kind === 'reject' ? tokenize(normalize(text)).length < 2 : generic,
  });

  const reject = scorePhrases(text, REJECT_PHRASES);
  if (reject > 0) return build('reject', reject);

  const accept = scorePhrases(text, ACCEPT_PHRASES);
  const settings = scorePhrases(text, SETTINGS_PHRASES);
  const save = scorePhrases(text, SAVE_PHRASES);

  // "Save settings" is both; the save action is the one that closes the pane.
  if (save > 0 && save >= settings && save >= accept) return build('save', save);
  if (accept > 0 && accept >= settings) return build('accept', accept);
  if (settings > 0) return build('settings', settings);
  return null;
}

/**
 * How strongly a block's text signals a cookie-consent UI.
 *
 * Two distinct weak terms are not promoted to strong: a privacy-settings page
 * legitimately mentions "privacy" and "personal data" together.
 */
export function evaluateContext(text: string): ContextStrength {
  if (matchesAny(text, STRONG_CONSENT_CONTEXT)) return 'strong';
  if (matchesAny(text, WEAK_CONSENT_CONTEXT)) return 'weak';
  return 'none';
}

/** Kept for readability at call sites; any strength above `none`. */
export function hasConsentContext(text: string): boolean {
  return evaluateContext(text) !== 'none';
}

/** True when id/class/testid attributes name a consent widget. */
export function hasConsentSignature(el: Element): boolean {
  const sig = elementSignature(el);
  return CONSENT_ID_HINTS.some((hint) => sig.includes(hint));
}

/** True when the element floats above the page rather than sitting in the flow. */
export function isOverlay(el: Element): boolean {
  if (el.tagName === 'DIALOG') return true;
  const role = el.getAttribute('role');
  if (role === 'dialog' || role === 'alertdialog') return true;

  const win = el.ownerDocument?.defaultView;
  if (!win) return false;
  const position = win.getComputedStyle(el).position;
  return position === 'fixed' || position === 'sticky';
}

const frameCache = new WeakMap<Document, { value: boolean; at: number }>();

/**
 * True when `doc` is a sub-frame whose entire content is a consent UI — the
 * shape every iframe-hosted CMP takes (Fiat and the other Stellantis sites
 * load theirs from `cookielaw.emea.fcagroup.com`).
 *
 * Inside such a frame nothing needs to look like an overlay: the *frame* is
 * the overlay, and its wrappers are plain, unnamed `<div>`s. The answer is
 * cached briefly because it is asked once per candidate button.
 */
export function isDedicatedConsentFrame(doc: Document): boolean {
  const win = doc.defaultView;
  if (!win || win.top === win) return false;

  const now = Date.now();
  const cached = frameCache.get(doc);
  if (cached && now - cached.at < FRAME_CACHE_MS) return cached.value;

  const body = doc.body;
  let value = false;
  if (body) {
    const text = visibleText(body, MAX_NAMED_CONTAINER_TEXT + 1);
    value = text.length <= MAX_NAMED_CONTAINER_TEXT && evaluateContext(text) === 'strong';
  }
  frameCache.set(doc, { value, at: now });
  return value;
}

/** Crosses shadow boundaries on the way up. */
function parentOf(node: Element): Element | null {
  if (node.parentElement) return node.parentElement;
  const root = node.getRootNode();
  if (root && (root as ShadowRoot).host) return (root as ShadowRoot).host as Element;
  return null;
}

export interface ConsentContainer {
  element: Element;
  strength: ContextStrength;
}

/**
 * Finds the consent block that owns `button`: the nearest ancestor that talks
 * about cookies and is not the whole page.
 *
 * The walk prefers the closest match but keeps climbing while the context is
 * only weak, so a button sitting in a bare `<div>` inside a proper cookie
 * banner is still credited with the banner's strong context.
 */
export function findConsentContainer(button: Element): ConsentContainer | null {
  let node: Element | null = button;
  let depth = 0;
  let best: ConsentContainer | null = null;

  const doc = button.ownerDocument;
  const inConsentFrame = doc ? isDedicatedConsentFrame(doc) : false;

  const selfLabel = elementLabel(button);
  const selfStrength = evaluateContext(selfLabel);
  const selfContext = selfStrength !== 'none' || hasConsentSignature(button);

  while (node && depth < MAX_ANCESTOR_WALK) {
    const tag = node.tagName;
    if (tag === 'BODY' || tag === 'HTML') break;

    const signature = hasConsentSignature(node);
    const identified = signature || inConsentFrame || isOverlay(node);
    const limit = identified ? MAX_NAMED_CONTAINER_TEXT : MAX_CONTAINER_TEXT;
    const text = visibleText(node, limit + 1);
    if (text.length <= limit) {
      const longEnough = text.length >= MIN_CONTAINER_TEXT;
      const strength = evaluateContext(text);
      const contextual = strength !== 'none' || signature;

      if (contextual && !identified && !isDenseEnough(text, strength)) {
        node = parentOf(node);
        depth++;
        continue;
      }

      if (contextual && (longEnough || selfContext)) {
        const effective: ContextStrength = signature && strength === 'none' ? 'weak' : strength;
        if (!best || rank(effective) > rank(best.strength)) {
          best = { element: node, strength: effective };
        }
        if (effective === 'strong') return best;
      }
    }

    node = parentOf(node);
    depth++;
  }

  if (best) return best;
  if (selfContext && button.parentElement) {
    return { element: button.parentElement, strength: selfStrength };
  }
  return null;
}

/**
 * True when consent vocabulary runs through the whole block rather than
 * appearing once. Short blocks are exempt: a two-line banner says "cookies"
 * once and that is enough.
 */
function isDenseEnough(text: string, strength: ContextStrength): boolean {
  if (strength === 'none') return false;
  if (text.length <= DENSE_CONTEXT_FROM) return true;
  const needed = Math.ceil(text.length / DENSE_CONTEXT_FROM);
  const phrases = strength === 'strong' ? STRONG_CONSENT_CONTEXT : WEAK_CONSENT_CONTEXT;
  return countPhraseHits(text, phrases, needed) >= needed;
}

function rank(strength: ContextStrength): number {
  return strength === 'strong' ? 2 : strength === 'weak' ? 1 : 0;
}

/**
 * How much to trust a candidate, 0–9. Fed by independent signals so that no
 * single one can carry a match on its own.
 */
export function scoreConfidence(
  classification: Classification,
  container: ConsentContainer,
): number {
  let confidence = 0;
  if (container.strength === 'strong') confidence += 3;
  else if (container.strength === 'weak') confidence += 1;

  if (hasConsentSignature(container.element)) confidence += 2;
  if (classification.exact) confidence += 2;
  if (!classification.generic) confidence += 1;
  if (isOverlay(container.element)) confidence += 1;
  return confidence;
}

export interface DetectOptions {
  /** Ignore elements inside this set (already handled containers). */
  skip?: ReadonlySet<Element>;
}

/** All accept/reject/settings/save candidates inside one root, best first. */
export function findCandidates(
  root: Document | ShadowRoot,
  options: DetectOptions = {},
): Candidate[] {
  const skip = options.skip;
  const candidates: Candidate[] = [];

  for (const button of collectClickables(root)) {
    if (isOurUi(button)) continue;
    if (skip && [...skip].some((c) => c.contains(button))) continue;
    if (!isVisible(button)) continue;
    if (containsClickable(button)) continue;

    const label = elementLabel(button);
    const classified = classifyLabel(label);
    if (!classified) continue;

    const container = findConsentContainer(button);
    if (!container) continue;
    if (!isVisible(container.element)) continue;

    // Hard gate: an "OK"/"Got it"/"Done" button is only a consent button when
    // the block it lives in unambiguously talks about cookies.
    if (classified.generic && container.strength !== 'strong') continue;

    const confidence = scoreConfidence(classified, container);
    if (confidence < MINIMUM_THRESHOLD) continue;

    candidates.push({
      kind: classified.kind,
      button,
      container: container.element,
      contextStrength: container.strength,
      label: label.slice(0, 80),
      confidence,
      score: classified.score + confidence * 10,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Consent blocks with no usable button — the input for cosmetic hiding.
 *
 * The strictest path in the extension, because hiding the wrong element breaks
 * a page outright. All four conditions must hold: the element names a consent
 * widget in its own attributes, its text uses STRONG consent vocabulary, it
 * floats above the page, and it is a banner-sized block. `[role="dialog"]`
 * alone is explicitly not enough — that matches every modal ever written.
 */
export function findOrphanBanners(root: Document | ShadowRoot, limit = 5): Element[] {
  const out: Element[] = [];
  let nodes: Element[];
  try {
    nodes = Array.from(
      root.querySelectorAll<Element>(
        '[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],' +
          '[id*="gdpr" i],[class*="gdpr" i],[id*="cmp" i],[class*="cmp" i],' +
          '[role="dialog"],[role="alertdialog"],dialog[open]',
      ),
    );
  } catch {
    return out;
  }

  for (const el of nodes) {
    if (out.length >= limit) break;
    if (isOurUi(el)) continue;
    if (out.some((existing) => existing.contains(el))) continue;

    const text = visibleText(el, MAX_NAMED_CONTAINER_TEXT + 1);
    if (text.length < MIN_CONTAINER_TEXT || text.length > MAX_NAMED_CONTAINER_TEXT) continue;
    if (evaluateContext(text) !== 'strong') continue;
    if (!hasConsentSignature(el)) continue;
    if (!isOverlay(el)) continue;
    if (!isVisible(el)) continue;
    // A block that only links to the policy page is not a banner.
    if (normalize(text).split(' ').length < 4) continue;

    out.push(el);
  }
  return out;
}
