import { loadSettings, loadStats, saveSettings, saveStats } from '../common/settings.js';
import { DEFAULT_SETTINGS, DEFAULT_STATS, type Settings } from '../common/types.js';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

const TOGGLE_KEYS = [
  'enabled',
  'askWhenUnsure',
  'fallbackToOpposite',
  'hideIfNoButton',
  'unblockScroll',
  'debug',
] as const;

type ToggleKey = (typeof TOGGLE_KEYS)[number];

let settings: Settings;

function flashSaved(): void {
  const badge = $('saved');
  badge.classList.add('show');
  setTimeout(() => badge.classList.remove('show'), 1200);
}

async function persist(): Promise<void> {
  await saveSettings(settings);
  flashSaved();
  renderSites();
}

function renderToggles(): void {
  for (const key of TOGGLE_KEYS) {
    $<HTMLInputElement>(key).checked = settings[key];
  }
  $<HTMLInputElement>('mode-reject').checked = settings.mode === 'reject';
  $<HTMLInputElement>('mode-accept').checked = settings.mode === 'accept';
}

function renderSites(): void {
  const body = $<HTMLTableSectionElement>('sites-body');
  const empty = $('sites-empty');
  const hosts = Object.keys(settings.sites).sort();

  body.textContent = '';
  empty.hidden = hosts.length > 0;
  $('sites-table').hidden = hosts.length === 0;

  for (const host of hosts) {
    const override = settings.sites[host] ?? {};
    const tr = document.createElement('tr');

    const tdHost = document.createElement('td');
    tdHost.textContent = host;

    const tdRun = document.createElement('td');
    const run = document.createElement('input');
    run.type = 'checkbox';
    run.checked = override.enabled !== false;
    run.addEventListener('change', () => {
      const sites = { ...settings.sites };
      const next = { ...(sites[host] ?? {}) };
      if (run.checked) delete next.enabled;
      else next.enabled = false;
      if (Object.keys(next).length === 0) delete sites[host];
      else sites[host] = next;
      settings = { ...settings, sites };
      void persist();
    });
    tdRun.append(run);

    const tdMode = document.createElement('td');
    const select = document.createElement('select');
    for (const [value, label] of [
      ['', 'Use default'],
      ['reject', 'Reject all'],
      ['accept', 'Accept all'],
    ] as const) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.append(option);
    }
    select.value = override.mode ?? '';
    select.addEventListener('change', () => {
      const sites = { ...settings.sites };
      const next = { ...(sites[host] ?? {}) };
      if (select.value === 'accept' || select.value === 'reject') next.mode = select.value;
      else delete next.mode;
      if (Object.keys(next).length === 0) delete sites[host];
      else sites[host] = next;
      settings = { ...settings, sites };
      void persist();
    });
    tdMode.append(select);

    const tdActions = document.createElement('td');
    tdActions.className = 'actions';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      const sites = { ...settings.sites };
      delete sites[host];
      settings = { ...settings, sites };
      void persist();
    });
    tdActions.append(remove);

    tr.append(tdHost, tdRun, tdMode, tdActions);
    body.append(tr);
  }
}

async function renderStats(): Promise<void> {
  const stats = await loadStats();
  const hosts = Object.entries(stats.byHost)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  $('stats-summary').textContent = `${stats.handled} banners handled across ${
    Object.keys(stats.byHost).length
  } sites`;

  const body = $<HTMLTableSectionElement>('stats-body');
  body.textContent = '';
  for (const [host, count] of hosts) {
    const tr = document.createElement('tr');
    const tdHost = document.createElement('td');
    tdHost.textContent = host;
    const tdCount = document.createElement('td');
    tdCount.textContent = String(count);
    tr.append(tdHost, tdCount);
    body.append(tr);
  }
}

function wire(): void {
  for (const key of TOGGLE_KEYS) {
    $<HTMLInputElement>(key).addEventListener('change', (event) => {
      const checked = (event.target as HTMLInputElement).checked;
      settings = { ...settings, [key]: checked } as Settings & Record<ToggleKey, boolean>;
      void persist();
    });
  }

  for (const [id, mode] of [
    ['mode-reject', 'reject'],
    ['mode-accept', 'accept'],
  ] as const) {
    $<HTMLInputElement>(id).addEventListener('change', () => {
      settings = { ...settings, mode };
      void persist();
    });
  }

  $('reset-stats').addEventListener('click', async () => {
    await saveStats({ ...DEFAULT_STATS, byHost: {} });
    await renderStats();
  });

  $('reset-settings').addEventListener('click', async () => {
    settings = { ...DEFAULT_SETTINGS, sites: {} };
    await persist();
    renderToggles();
  });
}

async function init(): Promise<void> {
  try {
    $('version').textContent = chrome.runtime.getManifest().version;
  } catch {
    /* context may be unavailable in some embeds */
  }
  settings = await loadSettings();
  wire();
  renderToggles();
  renderSites();
  await renderStats();
}

void init();
