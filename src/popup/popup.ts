import {
  loadSettings,
  loadStats,
  saveSettings,
  setSiteOverride,
  siteKey,
} from '../common/settings.js';
import type { ConsentMode, PageState, Settings } from '../common/types.js';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

const els = {
  enabled: $<HTMLInputElement>('enabled'),
  modeReject: $<HTMLButtonElement>('mode-reject'),
  modeAccept: $<HTMLButtonElement>('mode-accept'),
  modeHint: $<HTMLParagraphElement>('mode-hint'),
  host: $<HTMLSpanElement>('host'),
  siteEnabled: $<HTMLInputElement>('site-enabled'),
  siteMode: $<HTMLSelectElement>('site-mode'),
  siteUncertain: $<HTMLSelectElement>('site-uncertain'),
  dot: $<HTMLSpanElement>('dot'),
  pageStatus: $<HTMLSpanElement>('page-status'),
  runNow: $<HTMLButtonElement>('run-now'),
  stats: $<HTMLSpanElement>('stats'),
  openOptions: $<HTMLButtonElement>('open-options'),
};

const MODE_HINTS: Record<ConsentMode, string> = {
  reject: 'Refuses optional cookies; falls back to the preferences pane when a banner hides the reject button.',
  accept: 'Accepts everything — fastest way to make banners disappear.',
};

let settings: Settings;
let host = '';
let tabId: number | undefined;

async function currentTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function render(): void {
  els.enabled.checked = settings.enabled;

  const override = settings.sites[host];
  const effectiveMode = override?.mode ?? settings.mode;
  els.modeReject.setAttribute('aria-pressed', String(settings.mode === 'reject'));
  els.modeAccept.setAttribute('aria-pressed', String(settings.mode === 'accept'));
  els.modeHint.textContent = MODE_HINTS[settings.mode];

  els.host.textContent = host || 'this page';
  els.siteEnabled.checked = override?.enabled !== false;
  els.siteEnabled.disabled = !settings.enabled || !host;
  els.siteMode.value = override?.mode ?? '';
  els.siteMode.disabled = !settings.enabled || !host;
  els.siteUncertain.value = override?.uncertain ?? '';
  els.siteUncertain.disabled = !settings.enabled || !host;

  els.siteMode.title = `Effective answer here: ${effectiveMode}`;
}

async function persist(): Promise<void> {
  await saveSettings(settings);
  render();
}

async function refreshPageState(): Promise<void> {
  if (typeof tabId !== 'number') return;
  try {
    const state = (await chrome.tabs.sendMessage(tabId, { type: 'get-page-state' })) as
      | PageState
      | undefined;
    if (state?.asking) {
      els.dot.classList.add('on');
      els.pageStatus.textContent = 'Asking whether to close a banner…';
    } else if (state?.handled) {
      els.dot.classList.add('on');
      els.pageStatus.textContent = state.ruleId
        ? `Handled (${state.ruleId})`
        : 'Banner handled';
      els.pageStatus.title = state.label ?? '';
    } else {
      els.dot.classList.remove('on');
      els.pageStatus.textContent = 'Nothing detected yet';
    }
  } catch {
    els.dot.classList.remove('on');
    els.pageStatus.textContent = 'Not active on this page';
  }
}

async function refreshStats(): Promise<void> {
  const stats = await loadStats();
  const here = host ? (stats.byHost[host] ?? 0) : 0;
  els.stats.textContent = `${stats.handled} handled total${here ? ` · ${here} here` : ''}`;
}

function wire(): void {
  els.enabled.addEventListener('change', () => {
    settings = { ...settings, enabled: els.enabled.checked };
    void persist();
  });

  for (const [button, mode] of [
    [els.modeReject, 'reject'],
    [els.modeAccept, 'accept'],
  ] as const) {
    button.addEventListener('click', () => {
      settings = { ...settings, mode };
      void persist();
    });
  }

  els.siteEnabled.addEventListener('change', () => {
    settings = setSiteOverride(settings, host, { enabled: els.siteEnabled.checked });
    void persist();
  });

  els.siteMode.addEventListener('change', () => {
    const value = els.siteMode.value;
    settings = setSiteOverride(settings, host, {
      mode: value === 'accept' || value === 'reject' ? value : undefined,
    });
    void persist();
  });

  els.siteUncertain.addEventListener('change', () => {
    const value = els.siteUncertain.value;
    settings = setSiteOverride(settings, host, {
      uncertain: value === 'act' || value === 'skip' ? value : undefined,
    });
    void persist();
  });

  els.runNow.addEventListener('click', async () => {
    if (typeof tabId !== 'number') return;
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'run-now' });
    } catch {
      /* no content script on this page */
    }
    setTimeout(() => void refreshPageState(), 500);
  });

  els.openOptions.addEventListener('click', () => {
    void chrome.runtime.openOptionsPage();
  });
}

async function init(): Promise<void> {
  const tab = await currentTab();
  tabId = tab?.id;
  host = siteKey(tab?.url ?? '');
  settings = await loadSettings();
  wire();
  render();
  await Promise.all([refreshPageState(), refreshStats()]);
  try {
    document.getElementById('version')!.textContent = `v${chrome.runtime.getManifest().version}`;
  } catch {
    /* ignore */
  }
}

void init();
