import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  type EffectiveConfig,
  type Settings,
  type Stats,
  type UncertainPolicy,
} from './types.js';

/**
 * Normalises a URL or hostname into the key used for per-site overrides:
 * lowercase hostname without a leading `www.`.
 *
 * Only `http`/`https` produce a key. `about:blank`, `chrome://extensions` and
 * other privileged schemes return `''` so no override can ever be attached to
 * them.
 */
export function siteKey(urlOrHost: string): string {
  const input = urlOrHost.trim();
  if (!input) return '';

  let parsed: URL;
  if (/^https?:\/\//i.test(input)) {
    try {
      parsed = new URL(input);
    } catch {
      return '';
    }
  } else if (input.includes('://')) {
    // Some other scheme (file://, chrome-extension://, ...).
    return '';
  } else if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(input)) {
    // Scheme with no authority: about:blank, mailto:, javascript:.
    // The digit guard keeps `example.com:8080` out of this branch.
    return '';
  } else {
    try {
      parsed = new URL(`https://${input}`);
    } catch {
      return '';
    }
  }

  let host = parsed.hostname.toLowerCase();
  if (host.startsWith('www.')) host = host.slice(4);
  return host;
}

/** Fills in any missing keys so an older stored object stays usable. */
export function withDefaults(stored: Partial<Settings> | undefined | null): Settings {
  const s = stored ?? {};
  return {
    enabled: typeof s.enabled === 'boolean' ? s.enabled : DEFAULT_SETTINGS.enabled,
    mode: s.mode === 'accept' || s.mode === 'reject' ? s.mode : DEFAULT_SETTINGS.mode,
    fallbackToOpposite:
      typeof s.fallbackToOpposite === 'boolean'
        ? s.fallbackToOpposite
        : DEFAULT_SETTINGS.fallbackToOpposite,
    hideIfNoButton:
      typeof s.hideIfNoButton === 'boolean' ? s.hideIfNoButton : DEFAULT_SETTINGS.hideIfNoButton,
    unblockScroll:
      typeof s.unblockScroll === 'boolean' ? s.unblockScroll : DEFAULT_SETTINGS.unblockScroll,
    askWhenUnsure:
      typeof s.askWhenUnsure === 'boolean' ? s.askWhenUnsure : DEFAULT_SETTINGS.askWhenUnsure,
    debug: typeof s.debug === 'boolean' ? s.debug : DEFAULT_SETTINGS.debug,
    sites: s.sites && typeof s.sites === 'object' ? s.sites : {},
  };
}

/** Combines global settings with the override for `host`. */
export function resolveConfig(settings: Settings, urlOrHost: string): EffectiveConfig {
  const key = siteKey(urlOrHost);
  const override = key ? settings.sites[key] : undefined;
  const enabled = settings.enabled && override?.enabled !== false;
  const mode = override?.mode ?? settings.mode;
  // A remembered answer for this site wins over the global "ask" preference.
  const uncertain: UncertainPolicy =
    override?.uncertain ?? (settings.askWhenUnsure ? 'ask' : 'skip');
  return {
    enabled,
    mode,
    fallbackToOpposite: settings.fallbackToOpposite,
    hideIfNoButton: settings.hideIfNoButton,
    unblockScroll: settings.unblockScroll,
    uncertain,
    debug: settings.debug,
    overridden:
      override !== undefined &&
      (override.enabled !== undefined ||
        override.mode !== undefined ||
        override.uncertain !== undefined),
  };
}

/**
 * Applies a partial override for one site and drops entries that carry no
 * information, so `settings.sites` does not grow unbounded.
 */
export function setSiteOverride(
  settings: Settings,
  urlOrHost: string,
  patch: {
    enabled?: boolean | undefined;
    mode?: 'accept' | 'reject' | undefined;
    uncertain?: 'act' | 'skip' | undefined;
  },
): Settings {
  const key = siteKey(urlOrHost);
  if (!key) return settings;
  const sites = { ...settings.sites };
  const next = { ...(sites[key] ?? {}) };

  if ('enabled' in patch) {
    if (patch.enabled === undefined || patch.enabled === settings.enabled) delete next.enabled;
    else next.enabled = patch.enabled;
  }
  if ('mode' in patch) {
    if (patch.mode === undefined || patch.mode === settings.mode) delete next.mode;
    else next.mode = patch.mode;
  }
  if ('uncertain' in patch) {
    if (patch.uncertain === undefined) delete next.uncertain;
    else next.uncertain = patch.uncertain;
  }

  if (Object.keys(next).length === 0) delete sites[key];
  else sites[key] = next;

  return { ...settings, sites };
}

/* ------------------------------------------------------------------ */
/* chrome.storage helpers                                              */
/* ------------------------------------------------------------------ */

const SETTINGS_KEY = 'settings';
const STATS_KEY = 'stats';

export async function loadSettings(): Promise<Settings> {
  const got = await chrome.storage.sync.get(SETTINGS_KEY);
  return withDefaults(got[SETTINGS_KEY] as Partial<Settings> | undefined);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

export async function loadStats(): Promise<Stats> {
  const got = await chrome.storage.local.get(STATS_KEY);
  const raw = got[STATS_KEY] as Partial<Stats> | undefined;
  return {
    handled: typeof raw?.handled === 'number' ? raw.handled : DEFAULT_STATS.handled,
    byHost: raw?.byHost && typeof raw.byHost === 'object' ? raw.byHost : {},
  };
}

export async function saveStats(stats: Stats): Promise<void> {
  await chrome.storage.local.set({ [STATS_KEY]: stats });
}

/** Adds one handled banner for `host`, capping the per-host map. */
export function bumpStats(stats: Stats, urlOrHost: string, cap = 500): Stats {
  const key = siteKey(urlOrHost);
  const byHost = { ...stats.byHost };
  if (key) byHost[key] = (byHost[key] ?? 0) + 1;

  const keys = Object.keys(byHost);
  if (keys.length > cap) {
    // Drop the least active hosts first; ties broken by insertion order.
    keys
      .sort((a, b) => (byHost[a] ?? 0) - (byHost[b] ?? 0))
      .slice(0, keys.length - cap)
      .forEach((k) => delete byHost[k]);
  }

  return { handled: stats.handled + 1, byHost };
}
