/**
 * The chrome.storage layer, against an in-memory fake. A silent failure here
 * would leave every page running on defaults, so the round-trips are worth
 * pinning down.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadSettings,
  loadStats,
  resolveConfig,
  saveSettings,
  saveStats,
  setSiteOverride,
} from '../src/common/settings.js';
import { ConsentEngine } from '../src/core/engine.js';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from '../src/common/types.js';

function fakeArea(): chrome.storage.StorageArea & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  return {
    data,
    get: vi.fn(async (key: string) => (key in data ? { [key]: data[key] } : {})),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(data, items);
    }),
  } as unknown as chrome.storage.StorageArea & { data: Record<string, unknown> };
}

let sync: ReturnType<typeof fakeArea>;
let local: ReturnType<typeof fakeArea>;

beforeEach(() => {
  sync = fakeArea();
  local = fakeArea();
  vi.stubGlobal('chrome', { storage: { sync, local } });
});

describe('settings storage', () => {
  it('returns defaults when nothing is stored yet', async () => {
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips settings through sync storage', async () => {
    const settings = { ...DEFAULT_SETTINGS, mode: 'accept' as const, debug: true };
    await saveSettings(settings);
    await expect(loadSettings()).resolves.toEqual(settings);
  });

  it('repairs a partially written object instead of failing', async () => {
    sync.data['settings'] = { mode: 'accept' };
    const loaded = await loadSettings();
    expect(loaded.mode).toBe('accept');
    expect(loaded.hideIfNoButton).toBe(DEFAULT_SETTINGS.hideIfNoButton);
    expect(loaded.sites).toEqual({});
  });

  it('does not read settings from local storage', async () => {
    local.data['settings'] = { mode: 'accept' };
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });
});

describe('stats storage', () => {
  it('returns defaults when nothing is stored yet', async () => {
    await expect(loadStats()).resolves.toEqual(DEFAULT_STATS);
  });

  it('round-trips stats through local storage', async () => {
    await saveStats({ handled: 7, byHost: { 'example.com': 7 } });
    await expect(loadStats()).resolves.toEqual({ handled: 7, byHost: { 'example.com': 7 } });
  });

  it('recovers from a corrupted stats record', async () => {
    local.data['stats'] = { handled: 'lots', byHost: null };
    await expect(loadStats()).resolves.toEqual(DEFAULT_STATS);
  });
});

/**
 * "Always do this on this site": the answer has to survive a reload, or the
 * prompt asks the same question on every visit.
 */
describe('a remembered answer to the prompt', () => {
  it('survives a reload and stops the prompt coming back', async () => {
    await saveSettings(DEFAULT_SETTINGS);

    // What the service worker does with a `remember-choice` message.
    const settings = await loadSettings();
    await saveSettings(setSiteOverride(settings, 'https://www.example.com/page?x=1', {
      uncertain: 'act',
    }));

    // What the content script asks for on the next page load.
    const reloaded = await loadSettings();
    expect(resolveConfig(reloaded, 'https://www.example.com/other').uncertain).toBe('act');
    // The site key ignores `www.` and the path, so subpages count as the site.
    expect(resolveConfig(reloaded, 'https://example.com/').uncertain).toBe('act');
    // Other sites keep asking.
    expect(resolveConfig(reloaded, 'https://elsewhere.test/').uncertain).toBe('ask');
  });

  it('is what the engine then runs on: it acts instead of asking', async () => {
    await saveSettings(setSiteOverride(await loadSettings(), 'example.com', { uncertain: 'act' }));
    const config = resolveConfig(await loadSettings(), 'https://example.com/');

    document.body.innerHTML = `
      <div style="position: fixed; z-index: 9999">
        <p>Manage your privacy and tracking preferences for this site.</p>
        <button id="accept">Accept all</button>
      </div>`;
    let clicked = false;
    document.getElementById('accept')!.addEventListener('click', () => (clicked = true));

    const result = new ConsentEngine(document, {
      mode: config.mode === 'accept' ? 'accept' : 'reject',
      fallbackToOpposite: true,
      hideIfNoButton: config.hideIfNoButton,
      unblockScroll: config.unblockScroll,
      uncertain: config.uncertain,
    }).run();

    expect(result.action).toBe('clicked');
    expect(clicked).toBe(true);
  });
});
