export type SortMode = 'domain' | 'project' | 'topic';

export type ChromeGroupColor =
  | 'grey'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'pink'
  | 'purple'
  | 'cyan';

export interface ProjectRule {
  id: string;
  name: string;
  color: ChromeGroupColor;
  patterns: string[]; // e.g. ["*github.com*", "*jira.corp*"]
  enabled: boolean;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface UserSettings {
  sortMode: SortMode;
  collapseInactive: boolean;
  activeWindowOnly: boolean;
  ignorePinnedTabs: boolean;
  theme: ThemePreference;
  projects: ProjectRule[];
  excludedDomains: string[];
  subdomainHandling: 'separate' | 'merge_root';
}

export interface TabGroupSnapshot {
  timestamp: number;
  windowId: number;
  tabs: {
    id: number;
    index: number;
    groupId: number;
  }[];
  groups: {
    id: number;
    title?: string;
    color: ChromeGroupColor;
    collapsed: boolean;
  }[];
}

export interface SortSummary {
  tabCount: number;
  groupCount: number;
  groupNames: string[];
  timestamp: number;
}
