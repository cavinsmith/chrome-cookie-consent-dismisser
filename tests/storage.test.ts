/**
 * The chrome.storage layer, against an in-memory fake. A silent failure here
 * would leave every page running on defaults, so the round-trips are worth
 * pinning down.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadSettings,
  loadStats,
  saveSettings,
  saveStats,
} from '../src/common/settings.js';
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
