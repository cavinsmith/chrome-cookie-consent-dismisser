/**
 * Service worker.
 *
 * Owns the settings/stats storage and answers content scripts. It resolves the
 * per-site configuration from the *tab's* URL rather than the frame's, so an
 * override for `example.com` also applies inside the third-party CMP iframe
 * that `example.com` embeds.
 */

import {
  bumpStats,
  loadSettings,
  loadStats,
  resolveConfig,
  saveSettings,
  saveStats,
  setSiteOverride,
} from '../common/settings.js';
import { DEFAULT_SETTINGS, type EffectiveConfig, type RuntimeMessage } from '../common/types.js';

const BADGE_COLOR = '#2f8f4e';

async function setBadge(tabId: number, action: 'clicked' | 'hidden' | 'ask'): Promise<void> {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
    await chrome.action.setBadgeText({ tabId, text: action === 'clicked' ? '✓' : '–' });
  } catch {
    /* the tab may already be gone */
  }
}

async function clearBadge(tabId: number): Promise<void> {
  try {
    await chrome.action.setBadgeText({ tabId, text: '' });
  } catch {
    /* ignore */
  }
}

async function configFor(url: string | undefined): Promise<EffectiveConfig> {
  const settings = await loadSettings();
  return resolveConfig(settings, url ?? '');
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await saveSettings(DEFAULT_SETTINGS);
    // Open the options page on install so the user can review the defaults.
    await chrome.runtime.openOptionsPage().catch(() => undefined);
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  if (message.type === 'get-config') {
    // Prefer the tab URL (top-level site) over the frame's own origin.
    void configFor(sender.tab?.url ?? sender.url).then(sendResponse);
    return true;
  }

  if (message.type === 'banner-handled') {
    const tabId = sender.tab?.id;
    const url = sender.tab?.url ?? sender.url ?? '';
    void (async () => {
      const stats = await loadStats();
      await saveStats(bumpStats(stats, url));
      if (typeof tabId === 'number') await setBadge(tabId, message.action);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === 'remember-choice') {
    const url = sender.tab?.url ?? sender.url ?? '';
    void (async () => {
      const settings = await loadSettings();
      await saveSettings(setSiteOverride(settings, url, { uncertain: message.choice }));
      sendResponse({ ok: true });
    })();
    return true;
  }

  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') void clearBadge(tabId);
});

/** Push setting changes to every open tab so they take effect without a reload. */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes['settings']) return;
  void (async () => {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (typeof tab.id !== 'number') continue;
      chrome.tabs.sendMessage(tab.id, { type: 'settings-changed' }).catch(() => undefined);
    }
  })();
});
