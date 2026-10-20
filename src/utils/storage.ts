import { UserSettings, TabGroupSnapshot } from '../types';

export const DEFAULT_SETTINGS: UserSettings = {
  sortMode: 'domain',
  collapseInactive: false,
  activeWindowOnly: true,
  ignorePinnedTabs: true,
  theme: 'system',
  excludedDomains: ['chrome://', 'edge://', 'about:'],
  subdomainHandling: 'merge_root',
  projects: [
    {
      id: 'proj-work',
      name: 'Work & Code',
      color: 'blue',
      patterns: ['*github.com*', '*gitlab.com*', '*jira*', '*atlassian*'],
      enabled: true,
    },
    {
      id: 'proj-docs',
      name: 'Documentation',
      color: 'purple',
      patterns: ['*developer.mozilla.org*', '*docs.*', '*stackoverflow.com*'],
      enabled: true,
    },
    {
      id: 'proj-social',
      name: 'Social & Media',
      color: 'pink',
      patterns: ['*twitter.com*', '*x.com*', '*reddit.com*', '*youtube.com*'],
      enabled: true,
    },
  ],
};

const isChromeExtension = typeof chrome !== 'undefined' && Boolean(chrome.storage?.sync);

export async function getSettings(): Promise<UserSettings> {
  if (!isChromeExtension) {
    const raw = localStorage.getItem('tgs_settings');
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  }

  return new Promise((resolve) => {
    chrome.storage.sync.get(['tgs_settings'], (result) => {
      if (chrome.runtime.lastError || !result.tgs_settings) {
        resolve(DEFAULT_SETTINGS);
      } else {
        resolve({ ...DEFAULT_SETTINGS, ...result.tgs_settings });
      }
    });
  });
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  if (!isChromeExtension) {
    localStorage.setItem('tgs_settings', JSON.stringify(settings));
    return;
  }

  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ tgs_settings: settings }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export async function saveLastSnapshot(snapshot: TabGroupSnapshot): Promise<void> {
  if (!isChromeExtension) {
    localStorage.setItem('tgs_last_snapshot', JSON.stringify(snapshot));
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.local.set({ tgs_last_snapshot: snapshot }, () => {
      resolve();
    });
  });
}

export async function getLastSnapshot(): Promise<TabGroupSnapshot | null> {
  if (!isChromeExtension) {
    const raw = localStorage.getItem('tgs_last_snapshot');
    return raw ? JSON.parse(raw) : null;
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(['tgs_last_snapshot'], (result) => {
      resolve(result.tgs_last_snapshot || null);
    });
  });
}

export async function clearLastSnapshot(): Promise<void> {
  if (!isChromeExtension) {
    localStorage.removeItem('tgs_last_snapshot');
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.local.remove(['tgs_last_snapshot'], () => {
      resolve();
    });
  });
}
