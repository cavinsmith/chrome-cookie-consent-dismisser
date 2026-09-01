import { describe, expect, it } from 'vitest';
import {
  bumpStats,
  resolveConfig,
  setSiteOverride,
  siteKey,
  withDefaults,
} from '../src/common/settings.js';
import { DEFAULT_SETTINGS, DEFAULT_STATS, type Settings } from '../src/common/types.js';

describe('siteKey', () => {
  it('extracts the hostname and drops www.', () => {
    expect(siteKey('https://www.Example.com/path?q=1')).toBe('example.com');
    expect(siteKey('http://sub.example.co.uk/')).toBe('sub.example.co.uk');
  });

  it('accepts a bare host', () => {
    expect(siteKey('Example.COM')).toBe('example.com');
    expect(siteKey('example.com:8080/a')).toBe('example.com');
  });

  it('returns empty for unusable input', () => {
    expect(siteKey('')).toBe('');
    expect(siteKey('about:blank')).toBe('');
    expect(siteKey('chrome://extensions')).toBe('');
  });
});

describe('withDefaults', () => {
  it('fills in missing keys', () => {
    expect(withDefaults(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(withDefaults({ mode: 'accept' }).mode).toBe('accept');
    expect(withDefaults({ mode: 'accept' }).hideIfNoButton).toBe(DEFAULT_SETTINGS.hideIfNoButton);
  });

  it('rejects a corrupted mode value', () => {
    expect(withDefaults({ mode: 'nonsense' as 'accept' }).mode).toBe(DEFAULT_SETTINGS.mode);
  });
});

describe('resolveConfig', () => {
  const base: Settings = { ...DEFAULT_SETTINGS, mode: 'reject' };

  it('uses global settings when there is no override', () => {
    const config = resolveConfig(base, 'https://example.com');
    expect(config).toMatchObject({ enabled: true, mode: 'reject', overridden: false });
  });

  it('applies a per-site mode override', () => {
    const settings = setSiteOverride(base, 'https://shop.example.com', { mode: 'accept' });
    expect(resolveConfig(settings, 'https://shop.example.com/cart').mode).toBe('accept');
    expect(resolveConfig(settings, 'https://other.com').mode).toBe('reject');
  });

  it('lets a site disable the extension', () => {
    const settings = setSiteOverride(base, 'example.com', { enabled: false });
    expect(resolveConfig(settings, 'https://www.example.com/x').enabled).toBe(false);
  });

  it('keeps everything off while the master switch is off', () => {
    const settings = setSiteOverride({ ...base, enabled: false }, 'example.com', { enabled: true });
    expect(resolveConfig(settings, 'https://example.com').enabled).toBe(false);
  });
});

describe('setSiteOverride', () => {
  it('drops an override that matches the global value', () => {
    const withOverride = setSiteOverride(DEFAULT_SETTINGS, 'example.com', { mode: 'accept' });
    expect(withOverride.sites['example.com']).toEqual({ mode: 'accept' });

    const cleared = setSiteOverride(withOverride, 'example.com', { mode: DEFAULT_SETTINGS.mode });
    expect(cleared.sites['example.com']).toBeUndefined();
  });

  it('ignores hosts it cannot parse', () => {
    expect(setSiteOverride(DEFAULT_SETTINGS, '', { mode: 'accept' })).toEqual(DEFAULT_SETTINGS);
  });

  it('does not mutate the input', () => {
    const before = structuredClone(DEFAULT_SETTINGS);
    setSiteOverride(DEFAULT_SETTINGS, 'example.com', { enabled: false });
    expect(DEFAULT_SETTINGS).toEqual(before);
  });
});

describe('bumpStats', () => {
  it('counts totals and per host', () => {
    let stats = bumpStats(DEFAULT_STATS, 'https://a.com');
    stats = bumpStats(stats, 'https://a.com');
    stats = bumpStats(stats, 'https://b.com');
    expect(stats.handled).toBe(3);
    expect(stats.byHost).toEqual({ 'a.com': 2, 'b.com': 1 });
  });

  it('caps the per-host map, evicting the least active hosts', () => {
    let stats = { ...DEFAULT_STATS };
    for (let i = 0; i < 10; i++) stats = bumpStats(stats, `host${i}.com`, 3);
    expect(Object.keys(stats.byHost).length).toBeLessThanOrEqual(3);
    expect(stats.handled).toBe(10);
  });
});
