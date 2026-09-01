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
  LABEL_FILLER_WORDS,
  NEVER_PHRASES,
  REJECT_PHRASES,
  ACCEPT_PHRASES,
  SAVE_PHRASES,
  SETTINGS_PHRASES,
  STRONG_CONSENT_CONTEXT,
  WEAK_CONSENT_CONTEXT,
  WITHOUT_WORDS,
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
/**
 * The weakest label match still worth considering.
 *
 * `scorePhrases` pays a phrase's length and penalises every extra word around
 * it, so a short consent word buried in unrelated text lands here: GitHub's
 * own repository link, "chrome-cookie-consent-dismisser", scored 15 on the
 * word "consent" and was offered as an accept button. A real button clears
 * this easily — an exact match scores over 100, and "Cookies aanpassen"
 * (settings) scores 25.
 */
const MINIMUM_LABEL_SCORE = 20;

/** Score given to a refusal recognised by wording rather than by phrase. */
const REFUSAL_SCORE = 110;

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
  const raw = label.trim();
  if (!raw || raw.length > MAX_LABEL_LEN) return null;
  // Sign-in, checkout and other flows that must never be pressed on the user's
  // behalf, however cookie-flavoured the page around them is.
  if (matchesAny(raw, NEVER_PHRASES)) return null;

  const variants = labelVariants(raw);
  const text = variants[0]!;
  const score = (phrases: readonly string[]): number =>
    Math.max(...variants.map((variant) => scorePhrases(variant, phrases)));

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

  // "Continue without accepting" and its endless variants, before anything
  // else: they read as an acceptance to every phrase table.
  if (refusesByWording(text)) return build('reject', REFUSAL_SCORE);

  const reject = score(REJECT_PHRASES);
  if (reject > 0) return build('reject', reject);

  const accept = score(ACCEPT_PHRASES);
  const settings = score(SETTINGS_PHRASES);
  const save = score(SAVE_PHRASES);

  // "Save settings" is both; the save action is the one that closes the pane.
  if (save > 0 && save >= settings && save >= accept) return build('save', save);
  if (accept > 0 && accept >= settings) return build('accept', accept);
  if (settings > 0) return build('settings', settings);
  return null;
}

/**
 * The readings of a label worth scoring: as written, without counter badges,
 * and without decorative nouns.
 *
 * autodoc.nl's button reads "Alle cookies toestaan 1" and manuals.plus's
 * "Continue with Recommended Cookies" — both are exact phrases wearing a
 * decoration, and both were scored as loose matches, which cost them the
 * confidence to act and turned them into questions. Every reading is scored
 * and the best one wins, so a variant can only ever help.
 */
function labelVariants(label: string): string[] {
  const normalized = normalize(label);
  const variants = [normalized];
  const add = (variant: string): void => {
    if (variant && !variants.includes(variant)) variants.push(variant);
  };

  const words = tokenize(normalized);
  add(words.filter((word) => !/^\d+$/.test(word)).join(' '));
  add(words.filter((word) => !/^\d+$/.test(word) && !LABEL_FILLER_WORDS.includes(word)).join(' '));
  return variants;
}

/**
 * True for "<do something> without <accepting>": a refusal spelled as a
 * negated acceptance.
 *
 * The accept vocabulary is only searched *after* the negation, so "Continue
 * without registering" — which contains the generic accept word "continue" but
 * no acceptance after "without" — is not swept up.
 */
function refusesByWording(text: string): boolean {
  const words = tokenize(normalize(text));
  for (let i = 0; i < words.length - 1; i++) {
    if (!WITHOUT_WORDS.includes(words[i]!)) continue;
    if (scorePhrases(words.slice(i + 1).join(' '), ACCEPT_PHRASES) > 0) return true;
  }
  return false;
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

/**
 * The same, but also just above the element.
 *
 * The block that holds a banner's text is often an unnamed inner `<div>` while
 * the name — `privacy-cp-wall`, `cookie-banner` — sits on the wrapper around
 * it, and the container walk stops at the innermost block that talks about
 * cookies. Looking a few levels up recovers the evidence.
 */
export function hasConsentSignatureNearby(el: Element, depth = OVERLAY_ANCESTOR_WALK): boolean {
  let node: Element | null = el;
  for (let step = 0; node && step < depth; step++) {
    const tag = node.tagName;
    if (tag === 'BODY' || tag === 'HTML') return false;
    if (hasConsentSignature(node)) return true;
    node = node.parentElement;
  }
  return false;
}

/** How far up the tree an overlay wrapper is still credited to its content. */
const OVERLAY_ANCESTOR_WALK = 4;

/**
 * True when the element floats above the page rather than sitting in the flow.
 *
 * The wrapper doing the floating is often a few levels above the block that
 * holds the text and the buttons — a fixed backdrop containing a static card
 * is the standard way to build a modal — so a short walk up counts too.
 */
export function isOverlay(el: Element): boolean {
  let node: Element | null = el;
  for (let depth = 0; node && depth < OVERLAY_ANCESTOR_WALK; depth++) {
    const tag = node.tagName;
    if (tag === 'BODY' || tag === 'HTML') return false;
    if (tag === 'DIALOG') return true;

    const role = node.getAttribute('role');
    if (role === 'dialog' || role === 'alertdialog') return true;
    if (node.getAttribute('aria-modal') === 'true') return true;

    const win = node.ownerDocument?.defaultView;
    if (win) {
      const position = win.getComputedStyle(node).position;
      if (position === 'fixed' || position === 'sticky') return true;
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * True when the page cannot be scrolled — the tell-tale of a consent wall,
 * which locks the body so the notice cannot be scrolled past.
 */
export function isScrollLocked(doc: Document): boolean {
  const win = doc.defaultView;
  if (!win) return false;
  for (const el of [doc.body, doc.documentElement]) {
    if (!el) continue;
    const style = win.getComputedStyle(el);
    if (style.overflow === 'hidden' || style.overflowY === 'hidden') return true;
    if (style.position === 'fixed') return true;
  }
  return false;
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
export interface ConfidenceContext {
  /** Another consent control of a different kind shares the block. */
  hasSibling?: boolean;
  /** The page is scroll-locked, the way a consent wall locks it. */
  scrollLocked?: boolean;
}

export function scoreConfidence(
  classification: Classification,
  container: ConsentContainer,
  context: ConfidenceContext = {},
): number {
  let confidence = 0;
  if (container.strength === 'strong') confidence += 3;
  else if (container.strength === 'weak') confidence += 1;

  if (hasConsentSignatureNearby(container.element)) confidence += 2;
  if (classification.exact) confidence += 2;
  if (!classification.generic) confidence += 1;

  const floats = isOverlay(container.element);
  if (floats) confidence += 1;
  // A banner is a row of choices: "accept" next to "reject" or "settings" is
  // the shape of a consent block and almost nothing else. A lone button in the
  // same block earns nothing here.
  if (context.hasSibling) confidence += 1;
  // A notice that locks the page behind it is a wall, not an inline note.
  if (context.scrollLocked && floats) confidence += 1;
  return confidence;
}

export interface DetectOptions {
  /** Ignore elements inside this set (already handled containers). */
  skip?: ReadonlySet<Element>;
}

interface RawCandidate {
  classification: Classification;
  button: Element;
  container: ConsentContainer;
  label: string;
}

/** All accept/reject/settings/save candidates inside one root, best first. */
export function findCandidates(
  root: Document | ShadowRoot,
  options: DetectOptions = {},
): Candidate[] {
  const skip = options.skip;
  const found: RawCandidate[] = [];

  for (const button of collectClickables(root)) {
    if (isOurUi(button)) continue;
    if (skip && [...skip].some((c) => c.contains(button))) continue;
    if (!isVisible(button)) continue;
    if (containsClickable(button)) continue;

    const label = elementLabel(button);
    const classified = classifyLabel(label);
    if (!classified) continue;
    if (classified.score < MINIMUM_LABEL_SCORE) continue;

    const container = findConsentContainer(button);
    if (!container) continue;
    if (!isVisible(container.element)) continue;

    // Hard gate: an "OK"/"Got it"/"Done" button is only a consent button when
    // the block it lives in unambiguously talks about cookies.
    if (classified.generic && container.strength !== 'strong') continue;

    found.push({ classification: classified, button, container, label: label.slice(0, 80) });
  }

  // Which blocks hold more than one kind of consent control — an "accept"
  // beside a "reject" or a "settings" — is only knowable once every candidate
  // in the root has been collected, so confidence is scored in a second pass.
  const kindsPerContainer = new Map<Element, Set<ButtonKind>>();
  for (const item of found) {
    const kinds = kindsPerContainer.get(item.container.element) ?? new Set<ButtonKind>();
    kinds.add(item.classification.kind);
    kindsPerContainer.set(item.container.element, kinds);
  }

  const doc = root instanceof Document ? root : root.ownerDocument;
  const scrollLocked = doc ? isScrollLocked(doc) : false;
  const candidates: Candidate[] = [];

  for (const item of found) {
    const kinds = kindsPerContainer.get(item.container.element);
    const confidence = scoreConfidence(item.classification, item.container, {
      hasSibling: (kinds?.size ?? 0) > 1,
      scrollLocked,
    });
    if (confidence < MINIMUM_THRESHOLD) continue;

    candidates.push({
      kind: item.classification.kind,
      button: item.button,
      container: item.container.element,
      contextStrength: item.container.strength,
      label: item.label,
      confidence,
      score: item.classification.score + confidence * 10,
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
