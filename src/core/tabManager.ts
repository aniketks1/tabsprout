import {
  ChromeGroupColor,
  SortMode,
  SortSummary,
  TabGroupSnapshot,
  UserSettings,
} from '../types';
import {
  getSettings,
  saveLastSnapshot,
  getLastSnapshot,
  clearLastSnapshot,
} from '../utils/storage';
import {
  extractDomain,
  formatDomainTitle,
  isExcludableUrl,
} from './domainGrouper';
import { matchTabToProject } from './projectGrouper';
import { clusterTabsByTopic } from './topicGrouper';
import { getColorForString, getPaletteColor } from './colors';

const isExtension = typeof chrome !== 'undefined' && Boolean(chrome.tabs?.group);

interface ClusterTarget {
  title: string;
  tabIds: number[];
  color?: chrome.tabGroups.ColorEnum;
}

export interface GroupPreviewItem {
  title: string;
  count: number;
  color: ChromeGroupColor;
  tabTitles: string[];
}

/**
 * Captures tab group states for reliable 1-click Undo
 */
export async function captureSnapshot(windowId?: number): Promise<TabGroupSnapshot> {
  if (!isExtension) {
    return {
      timestamp: Date.now(),
      windowId: windowId ?? 0,
      tabs: [],
      groups: [],
    };
  }

  const queryInfo: chrome.tabs.QueryInfo = typeof windowId === 'number' ? { windowId } : {};
  const tabs = await chrome.tabs.query(queryInfo);
  let groups: TabGroupSnapshot['groups'] = [];

  try {
    const rawGroups = await chrome.tabGroups.query(queryInfo);
    groups = rawGroups.map((g) => ({
      id: g.id,
      title: g.title,
      color: g.color as any,
      collapsed: g.collapsed,
    }));
  } catch {
    // If groups query is unsupported or restricted
  }

  return {
    timestamp: Date.now(),
    windowId: windowId ?? 0,
    tabs: tabs
      .filter((t): t is chrome.tabs.Tab & { id: number } => typeof t.id === 'number')
      .map((t) => ({
        id: t.id,
        index: t.index,
        groupId: t.groupId ?? -1,
      })),
    groups,
  };
}

/**
 * Previews projected groups without modifying any tabs
 */
export async function previewGroups(overrideMode?: SortMode): Promise<GroupPreviewItem[]> {
  const settings: UserSettings = await getSettings();
  const mode = overrideMode || settings.sortMode;

  if (!isExtension) {
    return [
      {
        title: 'GitHub',
        count: 3,
        color: 'purple',
        tabTitles: ['facebook/react', 'vitejs/vite', 'Pull Requests'],
      },
      {
        title: 'Google Docs',
        count: 2,
        color: 'blue',
        tabTitles: ['Project Proposal Q4', 'Meeting Notes Oct 20'],
      },
      {
        title: 'Stack Overflow',
        count: 1,
        color: 'yellow',
        tabTitles: ['How to group tabs in Chrome MV3'],
      },
    ];
  }

  const queryInfo: chrome.tabs.QueryInfo = settings.activeWindowOnly
    ? { currentWindow: true }
    : {};
  const rawTabs = await chrome.tabs.query(queryInfo);

  const tabs = rawTabs.filter((tab): tab is chrome.tabs.Tab & { id: number; url: string } => {
    if (typeof tab.id !== 'number' || !tab.url) return false;
    if (settings.ignorePinnedTabs && tab.pinned) return false;
    if (isExcludableUrl(tab.url, settings.excludedDomains)) return false;
    return true;
  });

  if (tabs.length === 0) return [];

  const tabTitleMap = new Map<number, string>();
  for (const t of tabs) {
    tabTitleMap.set(t.id, t.title || t.url);
  }

  const previews: GroupPreviewItem[] = [];

  if (mode === 'domain') {
    const domainMap = new Map<string, number[]>();
    for (const tab of tabs) {
      const domain = extractDomain(tab.url, settings.subdomainHandling);
      if (!domain) continue;
      const title = formatDomainTitle(domain);
      const list = domainMap.get(title) || [];
      list.push(tab.id);
      domainMap.set(title, list);
    }

    let colorIdx = 0;
    for (const [title, tabIds] of domainMap.entries()) {
      previews.push({
        title,
        count: tabIds.length,
        color: (getColorForString(title) || getPaletteColor(colorIdx++)) as ChromeGroupColor,
        tabTitles: tabIds.map((id) => tabTitleMap.get(id) || '').filter(Boolean),
      });
    }
  } else if (mode === 'project') {
    const projectMap = new Map<string, { tabIds: number[]; color: ChromeGroupColor }>();
    const unassignedTabs: chrome.tabs.Tab[] = [];

    for (const tab of tabs) {
      const matched = matchTabToProject(tab.url, tab.title || '', settings.projects);
      if (matched) {
        const existing = projectMap.get(matched.name) || { tabIds: [], color: matched.color };
        existing.tabIds.push(tab.id);
        projectMap.set(matched.name, existing);
      } else {
        unassignedTabs.push(tab);
      }
    }

    for (const [name, data] of projectMap.entries()) {
      previews.push({
        title: name,
        count: data.tabIds.length,
        color: data.color,
        tabTitles: data.tabIds.map((id) => tabTitleMap.get(id) || '').filter(Boolean),
      });
    }

    if (unassignedTabs.length > 0) {
      const fallbackDomainMap = new Map<string, number[]>();
      for (const tab of unassignedTabs) {
        const domain = extractDomain(tab.url!, settings.subdomainHandling);
        const title = domain ? formatDomainTitle(domain) : 'Other';
        const list = fallbackDomainMap.get(title) || [];
        list.push(tab.id!);
        fallbackDomainMap.set(title, list);
      }
      for (const [title, tabIds] of fallbackDomainMap.entries()) {
        previews.push({
          title,
          count: tabIds.length,
          color: getColorForString(title),
          tabTitles: tabIds.map((id) => tabTitleMap.get(id) || '').filter(Boolean),
        });
      }
    }
  } else if (mode === 'topic') {
    const topicMap = clusterTabsByTopic(tabs);
    let colorIdx = 0;
    for (const [title, tabIds] of topicMap.entries()) {
      previews.push({
        title,
        count: tabIds.length,
        color: getPaletteColor(colorIdx++),
        tabTitles: tabIds.map((id) => tabTitleMap.get(id) || '').filter(Boolean),
      });
    }
  }

  return previews.sort((a, b) => b.count - a.count);
}

/**
 * Groups a slice of tabs belonging to a single specific window
 */
async function groupWindowTabs(
  tabs: (chrome.tabs.Tab & { id: number; url: string })[],
  settings: UserSettings,
  mode: SortMode
): Promise<string[]> {
  const clusters: ClusterTarget[] = [];

  if (mode === 'domain') {
    const domainMap = new Map<string, number[]>();
    for (const tab of tabs) {
      const domain = extractDomain(tab.url, settings.subdomainHandling);
      if (!domain) continue;

      const title = formatDomainTitle(domain);
      const list = domainMap.get(title) || [];
      list.push(tab.id);
      domainMap.set(title, list);
    }

    let colorIdx = 0;
    for (const [title, tabIds] of domainMap.entries()) {
      clusters.push({
        title,
        tabIds,
        color: (getColorForString(title) || getPaletteColor(colorIdx++)) as chrome.tabGroups.ColorEnum,
      });
    }
  } else if (mode === 'project') {
    const projectMap = new Map<string, { tabIds: number[]; color: string }>();
    const unassignedTabs: chrome.tabs.Tab[] = [];

    for (const tab of tabs) {
      const matched = matchTabToProject(tab.url, tab.title || '', settings.projects);
      if (matched) {
        const existing = projectMap.get(matched.name) || { tabIds: [], color: matched.color };
        existing.tabIds.push(tab.id);
        projectMap.set(matched.name, existing);
      } else {
        unassignedTabs.push(tab);
      }
    }

    for (const [name, data] of projectMap.entries()) {
      clusters.push({
        title: name,
        tabIds: data.tabIds,
        color: data.color as chrome.tabGroups.ColorEnum,
      });
    }

    if (unassignedTabs.length > 0) {
      const fallbackDomainMap = new Map<string, number[]>();
      for (const tab of unassignedTabs) {
        const domain = extractDomain(tab.url!, settings.subdomainHandling);
        const title = domain ? formatDomainTitle(domain) : 'Other';
        const list = fallbackDomainMap.get(title) || [];
        list.push(tab.id!);
        fallbackDomainMap.set(title, list);
      }
      for (const [title, tabIds] of fallbackDomainMap.entries()) {
        clusters.push({
          title,
          tabIds,
          color: getColorForString(title) as chrome.tabGroups.ColorEnum,
        });
      }
    }
  } else if (mode === 'topic') {
    const topicMap = clusterTabsByTopic(tabs);
    let colorIdx = 0;

    for (const [title, tabIds] of topicMap.entries()) {
      clusters.push({
        title,
        tabIds,
        color: getPaletteColor(colorIdx++) as chrome.tabGroups.ColorEnum,
      });
    }
  }

  const createdGroupIds: number[] = [];
  const groupNames: string[] = [];
  const activeTab = tabs.find((t) => t.active);
  const activeTabId = activeTab?.id;
  let activeTabGroupId: number | null = null;

  for (const cluster of clusters) {
    if (cluster.tabIds.length === 0) continue;

    try {
      const groupId = await chrome.tabs.group({ tabIds: cluster.tabIds });
      await chrome.tabGroups.update(groupId, {
        title: cluster.title,
        color: cluster.color,
      });

      createdGroupIds.push(groupId);
      groupNames.push(cluster.title);

      if (activeTabId && cluster.tabIds.includes(activeTabId)) {
        activeTabGroupId = groupId;
      }
    } catch (err) {
      console.warn('[TabSprout] Grouping skipped for cluster:', cluster.title, err);
    }
  }

  // Collapse inactive groups if configured
  if (settings.collapseInactive && createdGroupIds.length > 1) {
    for (const groupId of createdGroupIds) {
      if (groupId !== activeTabGroupId) {
        try {
          await chrome.tabGroups.update(groupId, { collapsed: true });
        } catch {
          // Ignore closed groups
        }
      }
    }
  }

  return groupNames;
}

/**
 * Main sorting orchestrator
 */
export async function executeSort(overrideMode?: SortMode): Promise<SortSummary> {
  const settings: UserSettings = await getSettings();
  const mode = overrideMode || settings.sortMode;

  if (!isExtension) {
    return {
      tabCount: 12,
      groupCount: 3,
      groupNames: ['GitHub', 'Docs', 'Social'],
      timestamp: Date.now(),
    };
  }

  const queryInfo: chrome.tabs.QueryInfo = settings.activeWindowOnly
    ? { currentWindow: true }
    : {};
  const rawTabs = await chrome.tabs.query(queryInfo);

  // Filter valid tabs
  const tabs = rawTabs.filter((tab): tab is chrome.tabs.Tab & { id: number; url: string } => {
    if (typeof tab.id !== 'number' || !tab.url) return false;
    if (settings.ignorePinnedTabs && tab.pinned) return false;
    if (isExcludableUrl(tab.url, settings.excludedDomains)) return false;
    return true;
  });

  if (tabs.length === 0) {
    return {
      tabCount: 0,
      groupCount: 0,
      groupNames: [],
      timestamp: Date.now(),
    };
  }

  // Capture snapshot for Undo (scoped to active window if activeWindowOnly, else global)
  const targetWindowId = settings.activeWindowOnly ? tabs[0].windowId : undefined;
  const snapshot = await captureSnapshot(targetWindowId);
  await saveLastSnapshot(snapshot);

  // Partition tabs by windowId so cross-window tab grouping errors never occur
  const windowMap = new Map<number, (chrome.tabs.Tab & { id: number; url: string })[]>();
  for (const t of tabs) {
    const list = windowMap.get(t.windowId) || [];
    list.push(t);
    windowMap.set(t.windowId, list);
  }

  const allGroupNames: string[] = [];

  for (const [, windowTabs] of windowMap.entries()) {
    const names = await groupWindowTabs(windowTabs, settings, mode);
    allGroupNames.push(...names);
  }

  return {
    tabCount: tabs.length,
    groupCount: allGroupNames.length,
    groupNames: allGroupNames,
    timestamp: Date.now(),
  };
}

/**
 * Reverts tabs to the exact state prior to the last sort
 */
export async function undoSort(): Promise<boolean> {
  const snapshot = await getLastSnapshot();
  if (!snapshot || !isExtension) return false;

  try {
    const ungroupTabIds: number[] = [];
    const regroupMap = new Map<number, number[]>();

    for (const item of snapshot.tabs) {
      if (item.groupId === -1 || item.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
        ungroupTabIds.push(item.id);
      } else {
        const list = regroupMap.get(item.groupId) || [];
        list.push(item.id);
        regroupMap.set(item.groupId, list);
      }
    }

    if (ungroupTabIds.length > 0) {
      try {
        await chrome.tabs.ungroup(ungroupTabIds);
      } catch {
        // Tab might have been closed by user
      }
    }

    for (const [prevGroupId, tabIds] of regroupMap.entries()) {
      try {
        const matchingGroup = snapshot.groups.find((g) => g.id === prevGroupId);
        const newGroupId = await chrome.tabs.group({ tabIds });
        if (matchingGroup) {
          await chrome.tabGroups.update(newGroupId, {
            title: matchingGroup.title,
            color: matchingGroup.color as any,
            collapsed: matchingGroup.collapsed,
          });
        }
      } catch {
        // Reconstruction best-effort
      }
    }

    await clearLastSnapshot();
    return true;
  } catch (err) {
    console.error('[TabSprout] Undo failed:', err);
    return false;
  }
}

/**
 * Ungroup all grouped tabs in current window
 */
export async function ungroupAll(): Promise<void> {
  if (!isExtension) return;
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const groupedIds = tabs
    .filter((t) => t.groupId !== -1 && t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && t.id)
    .map((t) => t.id as number);

  if (groupedIds.length > 0) {
    try {
      await chrome.tabs.ungroup(groupedIds);
    } catch (err) {
      console.warn('[TabSprout] Ungroup all failed:', err);
    }
  }
}
