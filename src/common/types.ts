/** How the extension should answer a consent banner. */
export type ConsentMode = 'accept' | 'reject';

/** What the engine did on a page. */
export type ActionKind = 'clicked' | 'hidden' | 'none' | 'ask';

/**
 * What to do with a detection the engine is not confident about.
 * `ask` shows the extension's own prompt; `skip` leaves the page alone;
 * `act` treats a thin match like a confident one.
 */
export type UncertainPolicy = 'ask' | 'skip' | 'act';

/** Per-site override stored by registrable-ish hostname (see `siteKey`). */
export interface SiteOverride {
  /** `false` disables the extension on that site entirely. */
  enabled?: boolean;
  /** Overrides the global mode on that site. */
  mode?: ConsentMode;
  /**
   * The answer the user gave to "always do this on <site>?" in the prompt.
   * `act` = always close, `skip` = never close, absent = keep asking.
   */
  uncertain?: Exclude<UncertainPolicy, 'ask'>;
}

export interface Settings {
  /** Master switch. */
  enabled: boolean;
  /** Global default answer. */
  mode: ConsentMode;
  /**
   * When the preferred answer has no button (e.g. "reject" on a banner that
   * only offers "accept"), fall back to the opposite one instead of giving up.
   */
  fallbackToOpposite: boolean;
  /**
   * When a consent banner is recognised but no usable button is found, hide it
   * cosmetically so it stops covering the page.
   */
  hideIfNoButton: boolean;
  /** Restore scrolling if the banner locked `<body>`. */
  unblockScroll: boolean;
  /**
   * When a detection is plausible but not certain, show the extension's own
   * prompt instead of silently acting or silently giving up.
   */
  askWhenUnsure: boolean;
  /** Verbose console logging from the content script. */
  debug: boolean;
  /** Per-hostname overrides. */
  sites: Record<string, SiteOverride>;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  mode: 'reject',
  fallbackToOpposite: false,
  hideIfNoButton: true,
  unblockScroll: true,
  askWhenUnsure: true,
  debug: false,
  sites: {},
};

/** Aggregate counters shown in the popup. */
export interface Stats {
  /** Total banners handled since install. */
  handled: number;
  /** Banners handled per hostname. */
  byHost: Record<string, number>;
}

export const DEFAULT_STATS: Stats = { handled: 0, byHost: {} };

/** Effective configuration for one page, after applying per-site overrides. */
export interface EffectiveConfig {
  enabled: boolean;
  mode: ConsentMode;
  fallbackToOpposite: boolean;
  hideIfNoButton: boolean;
  unblockScroll: boolean;
  /** Resolved from `askWhenUnsure` and the site's remembered answer. */
  uncertain: UncertainPolicy;
  debug: boolean;
  /** `true` when a per-site override contributed to this config. */
  overridden: boolean;
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export interface HandledMessage {
  type: 'banner-handled';
  action: Exclude<ActionKind, 'none'>;
  /** Rule id, or `heuristic` when detected generically. */
  ruleId: string;
  /** Human-readable label of the element that was clicked. */
  label: string;
}

export interface GetPageStateMessage {
  type: 'get-page-state';
}

export interface GetConfigMessage {
  type: 'get-config';
}

export interface RunNowMessage {
  type: 'run-now';
}

/** Sent when the user ticks "always do this on this site" in the prompt. */
export interface RememberChoiceMessage {
  type: 'remember-choice';
  choice: Exclude<UncertainPolicy, 'ask'>;
}

export interface SettingsChangedMessage {
  type: 'settings-changed';
}

export type RuntimeMessage =
  | HandledMessage
  | GetConfigMessage
  | GetPageStateMessage
  | RememberChoiceMessage
  | RunNowMessage
  | SettingsChangedMessage;

export interface PageState {
  handled: boolean;
  ruleId?: string;
  label?: string;
  /** A prompt is currently on screen waiting for the user. */
  asking: boolean;
}

/**
 * A detection the engine declined to act on by itself. The content script
 * shows it to the user and hands it back to the engine's confirm/dismiss
 * methods. Defined here (not in the engine) so the content script and the
 * prompt module can import it without a circular dependency.
 */
export interface PendingAction {
  /** What would happen if the user says yes. */
  kind: 'click' | 'hide';
  /** The element that would be clicked, or the block that would be hidden. */
  target: Element;
  /** The block to highlight while asking. */
  container: Element;
  label: string;
  ruleId: string;
  confidence: number;
}
