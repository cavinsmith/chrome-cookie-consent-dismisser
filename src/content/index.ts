/**
 * Content script. Runs in every frame, asks the service worker for the
 * effective configuration of the *top-level* site, and then drives the engine
 * until the page settles.
 */

import type {
  EffectiveConfig,
  PageState,
  PendingAction,
  RuntimeMessage,
} from '../common/types.js';
import { ConsentEngine } from '../core/engine.js';
import { showConfirmPrompt, dismissConfirmPrompt } from './prompt.js';

/** Retry schedule after page start; banners often mount late. */
const RUN_DELAYS_MS = [0, 250, 700, 1500, 3000, 5000, 8000];
/** How long the MutationObserver stays armed after the last activity. */
const OBSERVE_WINDOW_MS = 30_000;
/** Coalescing window for DOM mutations. */
const MUTATION_DEBOUNCE_MS = 150;
/** Delays at which leftover overlays are swept after a click. */
const SWEEP_DELAYS_MS = [400, 1200, 2500];

let config: EffectiveConfig | null = null;
let engine: ConsentEngine | null = null;
let observer: MutationObserver | null = null;
let observeUntil = 0;
let debounceTimer: number | undefined;
let lastUrl = location.href;
let urlWatcherStarted = false;
/** A prompt is on screen; pause auto-run until the user responds. */
let pendingPrompt: PendingAction | null = null;
const state: PageState = { handled: false, asking: false };

function log(...args: unknown[]): void {
  if (config?.debug) console.log('[cookie-consent-dismisser]', ...args);
}

async function fetchConfig(): Promise<EffectiveConfig | null> {
  try {
    const response = (await chrome.runtime.sendMessage({ type: 'get-config' })) as
      | EffectiveConfig
      | undefined;
    return response ?? null;
  } catch {
    // The service worker can be asleep or the extension reloading; retry later.
    return null;
  }
}

function report(action: 'clicked' | 'hidden' | 'ask', ruleId: string, label: string): void {
  state.handled = true;
  state.ruleId = ruleId;
  state.label = label;
  chrome.runtime
    .sendMessage({ type: 'banner-handled', action, ruleId, label })
    .catch(() => undefined);
}

function scheduleSweeps(): void {
  for (const delay of SWEEP_DELAYS_MS) {
    window.setTimeout(() => {
      if (engine?.sweep()) log('swept leftover overlay');
    }, delay);
  }
}

/**
 * Takes the prompt off the screen and un-pauses the engine. Every path out of
 * the prompt must go through here: leaving `pendingPrompt` set would freeze
 * `tick` for the rest of the page's life, and leaving the host element in the
 * DOM would keep its backdrop over the page.
 */
function closePrompt(): void {
  dismissConfirmPrompt();
  pendingPrompt = null;
  state.asking = false;
}

function onUserDecision(pending: PendingAction, always: boolean): void {
  closePrompt();
  if (always) {
    chrome.runtime
      .sendMessage({ type: 'remember-choice', choice: 'act' })
      .catch(() => undefined);
  }
  const result = engine?.confirmPending(pending);
  if (result && result.action !== 'none') {
    report(result.action, result.ruleId ?? 'heuristic', result.label ?? '');
    scheduleSweeps();
  }
  // The click may reveal a second-level pane, so keep watching for a while.
  startObserving();
}

function onUserDismiss(pending: PendingAction): void {
  closePrompt();
  engine?.dismissPending(pending);
}

function tick(): void {
  if (!engine || !config?.enabled) return;
  if (engine.exhausted || pendingPrompt) return;

  let result;
  try {
    result = engine.run();
  } catch (error) {
    log('engine error', error);
    return;
  }

  if (result.action === 'none') return;

  if (result.action === 'ask' && result.pending) {
    pendingPrompt = result.pending;
    state.asking = true;
    showConfirmPrompt(result.pending, onUserDecision, onUserDismiss);
    return;
  }

  dismissConfirmPrompt();
  log(`${result.action} via ${result.ruleId}: ${result.label ?? ''}`);
  report(result.action, result.ruleId ?? 'heuristic', result.label ?? '');
  scheduleSweeps();
  observeUntil = Date.now() + OBSERVE_WINDOW_MS;
  if (result.followUp) window.setTimeout(tick, 300);
}

function onMutation(): void {
  if (Date.now() > observeUntil) {
    stopObserving();
    return;
  }
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(tick, MUTATION_DEBOUNCE_MS);
}

function startObserving(): void {
  observeUntil = Date.now() + OBSERVE_WINDOW_MS;
  if (observer) return;
  observer = new MutationObserver(onMutation);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
  });
}

function stopObserving(): void {
  observer?.disconnect();
  observer = null;
}

/** Single-page apps often re-show the banner after a route change. */
function watchUrlChanges(): void {
  if (urlWatcherStarted) return;
  urlWatcherStarted = true;
  window.setInterval(() => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    log('url changed, re-arming');
    startObserving();
    tick();
  }, 1000);
}

async function start(): Promise<void> {
  config = await fetchConfig();
  if (!config) {
    window.setTimeout(() => void start(), 1000);
    return;
  }
  if (!config.enabled) {
    log('disabled for this site');
    return;
  }

  engine = new ConsentEngine(document, {
    mode: config.mode,
    fallbackToOpposite: config.fallbackToOpposite,
    hideIfNoButton: config.hideIfNoButton,
    unblockScroll: config.unblockScroll,
    uncertain: config.uncertain,
  });

  log('active, mode =', config.mode, 'uncertain =', config.uncertain);
  for (const delay of RUN_DELAYS_MS) window.setTimeout(tick, delay);
  startObserving();
  watchUrlChanges();
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === 'get-page-state') {
    sendResponse(state);
    return false;
  }
  if (message.type === 'run-now') {
    startObserving();
    tick();
    sendResponse(state);
    return false;
  }
  if (message.type === 'settings-changed') {
    void start();
    return false;
  }
  return false;
});

// Guard against the content script being injected more than once in the same
// frame (Chrome can do this during navigations). Only the first run starts.
declare global {
  // eslint-disable-next-line no-var
  var __cbacStarted__: boolean | undefined;
}
if (!globalThis.__cbacStarted__) {
  globalThis.__cbacStarted__ = true;
  void start();
}
