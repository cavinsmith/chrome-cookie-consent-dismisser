/**
 * Consent engine: decides what to click and clicks it.
 *
 * One instance lives per frame for the lifetime of the page so it can remember
 * what it already tried and never loop (open settings → find nothing → open
 * settings again).
 */

import type {
  ActionKind,
  ConsentMode,
  PendingAction,
  UncertainPolicy,
} from '../common/types.js';
import { RULES, type CmpRule } from './rules.js';
import { NECESSARY_PHRASES } from './phrases.js';
import {
  collectRoots,
  elementLabel,
  hideElement,
  isVisible,
  simulateClick,
  unblockScroll,
} from './dom.js';
import {
  CONFIDENT_THRESHOLD,
  findCandidates,
  findOrphanBanners,
  type Candidate,
} from './detect.js';
import { matchesAny } from './text.js';

export interface EngineOptions {
  mode: ConsentMode;
  fallbackToOpposite: boolean;
  hideIfNoButton: boolean;
  unblockScroll: boolean;
  /** What to do with a detection that is plausible but not certain. */
  uncertain?: UncertainPolicy;
  /** Resolve the DOM and report, but do not click or hide. */
  dryRun?: boolean;
  /** Upper bound on interactions per page, so a hostile banner cannot loop us. */
  maxActions?: number;
  /** Upper bound on prompts per page, so the user is never spammed. */
  maxPrompts?: number;
}

export interface EngineResult {
  action: ActionKind;
  /** Rule id, or `heuristic` for generic detection. */
  ruleId?: string;
  /** Label of the element that was acted on. */
  label?: string;
  /** The engine opened a preferences pane and should run again shortly. */
  followUp?: boolean;
  /** How much the engine trusted this detection, 0–9. Absent for rule hits. */
  confidence?: number;
  /** Present when `action === 'ask'`: what the user is being asked about. */
  pending?: PendingAction;
}

const NONE: EngineResult = { action: 'none' };

export class ConsentEngine {
  private readonly doc: Document;
  private readonly opts: EngineOptions & {
    dryRun: boolean;
    maxActions: number;
    maxPrompts: number;
    uncertain: UncertainPolicy;
  };
  /** Rules whose "open settings" step was already used. */
  private readonly settingsTried = new Set<string>();
  private readonly clicked = new WeakSet<Element>();
  private readonly hidden = new WeakSet<Element>();
  private actions = 0;
  private prompts = 0;
  /** Elements the user has already been asked about, or has declined. */
  private readonly asked = new WeakSet<Element>();
  /** Rules that produced a click, so their leftovers can be swept later. */
  private readonly firedRules = new Set<string>();

  constructor(doc: Document, options: EngineOptions) {
    this.doc = doc;
    this.opts = {
      ...options,
      dryRun: options.dryRun ?? false,
      maxActions: options.maxActions ?? 6,
      maxPrompts: options.maxPrompts ?? 2,
      uncertain: options.uncertain ?? 'ask',
    };
  }

  /** True once the engine has spent its interaction budget. */
  get exhausted(): boolean {
    return this.actions >= this.opts.maxActions;
  }

  /** One detection pass. Safe to call repeatedly (e.g. from a MutationObserver). */
  run(): EngineResult {
    if (this.exhausted) return NONE;

    const roots = collectRoots(this.doc);

    const byRule = this.runRules(roots);
    if (byRule.action !== 'none') return byRule;

    const byHeuristic = this.runHeuristic(roots);
    if (byHeuristic.action !== 'none') return byHeuristic;

    if (this.opts.hideIfNoButton) {
      const hiddenResult = this.hideOrphans(roots);
      if (hiddenResult.action !== 'none') return hiddenResult;
    }

    return NONE;
  }

  /**
   * Removes overlays a CMP left behind and restores scrolling. Called a moment
   * after a successful click, once the CMP has had time to tear itself down.
   */
  sweep(): boolean {
    let changed = false;
    const roots = collectRoots(this.doc);

    for (const ruleId of this.firedRules) {
      const rule = RULES.find((r) => r.id === ruleId);
      for (const selector of rule?.cleanup ?? []) {
        for (const el of this.queryAll(roots, selector)) {
          if (isVisible(el) && !this.hidden.has(el)) {
            if (!this.opts.dryRun) hideElement(el);
            this.hidden.add(el);
            changed = true;
          }
        }
      }
    }

    if (this.opts.unblockScroll && !this.opts.dryRun && unblockScroll(this.doc)) changed = true;
    return changed;
  }

  /* -------------------------------------------------------------- */
  /* Rule pass                                                       */
  /* -------------------------------------------------------------- */

  private runRules(roots: (Document | ShadowRoot)[]): EngineResult {
    for (const rule of RULES) {
      if (!this.ruleApplies(roots, rule)) continue;

      const primary = this.opts.mode === 'accept' ? rule.accept : rule.reject;
      const secondary = this.opts.mode === 'accept' ? rule.reject : rule.accept;

      const target = this.firstUsable(roots, primary);
      if (target) return this.act(target, rule.id);

      // Reject is frequently one level down, behind "Manage options".
      if (rule.settings && !this.settingsTried.has(rule.id)) {
        const settingsBtn = this.firstUsable(roots, rule.settings);
        if (settingsBtn) {
          this.settingsTried.add(rule.id);
          const result = this.act(settingsBtn, rule.id);
          return { ...result, action: 'clicked', followUp: true };
        }
      }

      if (this.opts.fallbackToOpposite) {
        const alt = this.firstUsable(roots, secondary);
        if (alt) return this.act(alt, rule.id);
      }
    }
    return NONE;
  }

  private ruleApplies(roots: (Document | ShadowRoot)[], rule: CmpRule): boolean {
    for (const selector of rule.detect) {
      for (const el of this.queryAll(roots, selector)) {
        if (isVisible(el)) return true;
      }
    }
    return false;
  }

  private firstUsable(roots: (Document | ShadowRoot)[], selectors: readonly string[]): Element | null {
    for (const selector of selectors) {
      for (const el of this.queryAll(roots, selector)) {
        if (isVisible(el) && !this.clicked.has(el)) return el;
      }
    }
    return null;
  }

  private queryAll(roots: (Document | ShadowRoot)[], selector: string): Element[] {
    const out: Element[] = [];
    for (const root of roots) {
      try {
        out.push(...Array.from(root.querySelectorAll(selector)));
      } catch {
        /* a malformed selector must not abort the whole pass */
      }
    }
    return out;
  }

  /* -------------------------------------------------------------- */
  /* Heuristic pass                                                  */
  /* -------------------------------------------------------------- */

  private runHeuristic(roots: (Document | ShadowRoot)[]): EngineResult {
    const candidates: Candidate[] = [];
    for (const root of roots) candidates.push(...findCandidates(root));

    const usable = candidates.filter(
      (c) => !this.clicked.has(c.button) && !this.asked.has(c.button),
    );
    if (usable.length === 0) return NONE;

    const wanted = usable.filter((c) => c.kind === this.opts.mode);
    if (wanted.length > 0) {
      const best = wanted[0]!;
      return this.resolveHeuristic(best);
    }

    if (this.opts.mode === 'reject') {
      // No explicit reject: try switching the optional categories off in place.
      const viaToggles = this.rejectViaToggles(usable);
      if (viaToggles.action !== 'none') return viaToggles;

      const settings = usable.find((c) => c.kind === 'settings');
      if (settings && !this.settingsTried.has(`h:${settings.label}`)) {
        this.settingsTried.add(`h:${settings.label}`);
        const result = this.resolveHeuristic(settings);
        if (result.action === 'ask') return result;
        return { ...result, followUp: true };
      }
    }

    if (this.opts.fallbackToOpposite) {
      const opposite = this.opts.mode === 'accept' ? 'reject' : 'accept';
      const alt = usable.find((c) => c.kind === opposite);
      if (alt) return this.resolveHeuristic(alt);
    }

    return NONE;
  }

  /**
   * Decides whether to act on a heuristic candidate outright, ask the user, or
   * skip it — based on confidence and the configured `uncertain` policy.
   */
  private resolveHeuristic(candidate: Candidate): EngineResult {
    if (candidate.confidence >= CONFIDENT_THRESHOLD) {
      return this.act(candidate.button, 'heuristic', candidate.label);
    }
    if (this.opts.uncertain === 'skip' || this.prompts >= this.opts.maxPrompts) {
      return NONE;
    }
    if (this.opts.uncertain === 'act') {
      return this.act(candidate.button, 'heuristic', candidate.label);
    }
    // `ask`: surface a prompt and remember the target so a later call can act.
    this.asked.add(candidate.button);
    this.prompts++;
    return {
      action: 'ask',
      ruleId: 'heuristic',
      confidence: candidate.confidence,
      pending: {
        kind: 'click',
        target: candidate.button,
        container: candidate.container,
        label: candidate.label,
        ruleId: 'heuristic',
        confidence: candidate.confidence,
      },
    };
  }

  /**
   * Carries out a pending action the user approved. No confidence check here —
   * the user's "yes" is the check.
   */
  confirmPending(pending: PendingAction): EngineResult {
    if (pending.kind === 'click') {
      return this.act(pending.target, pending.ruleId, pending.label);
    }
    this.hidden.add(pending.target);
    this.actions++;
    if (!this.opts.dryRun) {
      hideElement(pending.target);
      if (this.opts.unblockScroll) unblockScroll(this.doc);
    }
    return { action: 'hidden', ruleId: pending.ruleId, label: pending.label };
  }

  /** Dismisses a pending action so it is never asked about again on this page. */
  dismissPending(pending: PendingAction): void {
    this.asked.add(pending.target);
  }

  /**
   * Preferences-pane fallback: switch every optional category off, then press
   * the pane's save button. Only runs in reject mode, and never touches a
   * toggle labelled "necessary"/"essential" — those are legally always on and
   * flipping them tends to be a no-op that some CMPs treat as consent.
   */
  private rejectViaToggles(candidates: Candidate[]): EngineResult {
    const save = candidates.find((c) => c.kind === 'save');
    if (!save) return NONE;

    const toggles = Array.from(
      save.container.querySelectorAll<HTMLElement>(
        'input[type="checkbox"], [role="switch"], [role="checkbox"]',
      ),
    );

    let flipped = 0;
    for (const toggle of toggles) {
      if (!isVisible(toggle)) continue;
      if ((toggle as HTMLInputElement).disabled) continue;

      const on =
        (toggle as HTMLInputElement).checked === true ||
        toggle.getAttribute('aria-checked') === 'true';
      if (!on) continue;

      if (matchesAny(toggleLabel(toggle), NECESSARY_PHRASES)) continue;

      if (!this.opts.dryRun) simulateClick(toggle);
      flipped++;
    }

    if (flipped === 0) return NONE;
    return this.act(save.button, 'heuristic', save.label);
  }

  /* -------------------------------------------------------------- */
  /* Hide pass                                                       */
  /* -------------------------------------------------------------- */

  private hideOrphans(roots: (Document | ShadowRoot)[]): EngineResult {
    for (const root of roots) {
      for (const el of findOrphanBanners(root)) {
        if (this.hidden.has(el) || this.asked.has(el)) continue;

        // Orphan hiding is the riskiest action in the extension — there is no
        // button to confirm intent — so it is only ever automatic when the
        // element both names a consent widget in its own attributes *and* uses
        // strong consent vocabulary. findOrphanBanners already requires that,
        // so any survivor is confident enough to hide without asking.
        this.hidden.add(el);
        this.actions++;
        if (!this.opts.dryRun) {
          hideElement(el);
          if (this.opts.unblockScroll) unblockScroll(this.doc);
        }
        return { action: 'hidden', ruleId: 'heuristic', label: elementLabel(el).slice(0, 80) };
      }
    }
    return NONE;
  }

  /* -------------------------------------------------------------- */

  private act(el: Element, ruleId: string, label?: string): EngineResult {
    this.clicked.add(el);
    this.actions++;
    this.firedRules.add(ruleId);
    if (!this.opts.dryRun) simulateClick(el);
    return { action: 'clicked', ruleId, label: label ?? elementLabel(el).slice(0, 80) };
  }
}

/** Text associated with a toggle: its own label, `aria-label`, or its row. */
function toggleLabel(toggle: Element): string {
  const aria = toggle.getAttribute('aria-label');
  if (aria) return aria;

  const id = toggle.getAttribute('id');
  if (id) {
    const doc = toggle.ownerDocument;
    const root = toggle.getRootNode() as ParentNode & { querySelector?: typeof doc.querySelector };
    try {
      const label = root.querySelector?.(`label[for="${CSS.escape(id)}"]`);
      if (label?.textContent) return label.textContent;
    } catch {
      /* CSS.escape is unavailable in some sandboxes */
    }
  }

  const closestLabel = toggle.closest('label');
  if (closestLabel?.textContent) return closestLabel.textContent;

  const row = toggle.parentElement?.parentElement ?? toggle.parentElement;
  return (row?.textContent ?? '').slice(0, 200);
}
