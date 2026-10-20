import React, { useEffect, useState, useRef } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  Plus,
  Trash2,
  Check,
  FolderKanban,
  Sliders,
  ShieldBan,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { ChromeGroupColor, ProjectRule, ThemePreference, UserSettings } from '../types';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../utils/storage';
import { applyTheme, applyThemeWithAnimation, listenSystemThemeChange } from '../utils/theme';

const AVAILABLE_COLORS: ChromeGroupColor[] = [
  'blue',
  'purple',
  'pink',
  'red',
  'yellow',
  'green',
  'cyan',
  'grey',
];

const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  cyan: '#06b6d4',
  grey: '#9ca3af',
};

export default function OptionsApp() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // New Project Form
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPatterns, setNewProjectPatterns] = useState('');
  const [newProjectColor, setNewProjectColor] = useState<ChromeGroupColor>('blue');

  // Exclusion Form
  const [newExcludedDomain, setNewExcludedDomain] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      applyTheme(s.theme);
    });

    const cleanup = listenSystemThemeChange(() => {
      if (settings?.theme === 'system') {
        applyTheme('system');
      }
    });

    return () => cleanup();
  }, [settings?.theme]);

  const notifySaved = (msg = 'Saved') => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 2000);
  };

  const updateSettings = async (partial: Partial<UserSettings>, msg?: string) => {
    if (!settings) return;
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await saveSettings(updated);
    notifySaved(msg);
  };

  const handleThemeChange = async (
    theme: ThemePreference,
    event?: React.MouseEvent<HTMLElement>
  ) => {
    applyThemeWithAnimation(theme, event);
    await updateSettings({ theme });
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !newProjectName.trim()) return;

    const patterns = newProjectPatterns
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const newRule: ProjectRule = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      color: newProjectColor,
      patterns: patterns.length > 0 ? patterns : [`*${newProjectName.toLowerCase()}*`],
      enabled: true,
    };

    const updatedProjects = [...settings.projects, newRule];
    await updateSettings({ projects: updatedProjects }, 'Project Rule Added');

    setNewProjectName('');
    setNewProjectPatterns('');
  };

  const handleDeleteProject = async (id: string) => {
    if (!settings) return;
    const updatedProjects = settings.projects.filter((p) => p.id !== id);
    await updateSettings({ projects: updatedProjects }, 'Rule Removed');
  };

  const handleToggleProject = async (id: string) => {
    if (!settings) return;
    const updatedProjects = settings.projects.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    await updateSettings({ projects: updatedProjects });
  };

  const handleAddExcludedDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !newExcludedDomain.trim()) return;

    const trimmed = newExcludedDomain.trim().toLowerCase();
    if (settings.excludedDomains.includes(trimmed)) return;

    const updatedList = [...settings.excludedDomains, trimmed];
    await updateSettings({ excludedDomains: updatedList }, 'Exclusion Added');
    setNewExcludedDomain('');
  };

  const handleDeleteExcludedDomain = async (domain: string) => {
    if (!settings) return;
    const updatedList = settings.excludedDomains.filter((d) => d !== domain);
    await updateSettings({ excludedDomains: updatedList }, 'Exclusion Removed');
  };

  const handleExportConfig = () => {
    if (!settings) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tabsprout-settings-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    notifySaved('Configuration Exported');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          const merged: UserSettings = {
            ...DEFAULT_SETTINGS,
            ...parsed,
          };
          setSettings(merged);
          await saveSettings(merged);
          applyTheme(merged.theme);
          notifySaved('Settings Imported');
        }
      } catch (err) {
        alert('Invalid JSON configuration file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDefaults = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults? Your custom rules will be restored to presets.')) {
      setSettings(DEFAULT_SETTINGS);
      await saveSettings(DEFAULT_SETTINGS);
      applyTheme(DEFAULT_SETTINGS.theme);
      notifySaved('Reset to Defaults');
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-border/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center ring-1 ring-border/50 shadow-subtle overflow-hidden bg-card">
              <img src="/icons/icon48.png" alt="TabSprout" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">TabSprout</h1>
              <p className="text-xs text-muted-foreground">
                Automatic tab grouping and sorting with one click
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {saveSuccess && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20 animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>{saveSuccess}</span>
              </div>
            )}
            <button
              onClick={handleExportConfig}
              className="p-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 border border-border/60 transition-colors"
              title="Export Settings JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 border border-border/60 transition-colors"
              title="Import Settings JSON"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Section 1: Appearance */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2 mb-4">
            <Sun className="w-4 h-4 text-primary" />
            <span>Appearance & Theme</span>
          </h2>
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-subtle">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Theme Mode</p>
                <p className="text-xs text-muted-foreground">
                  Choose your interface theme. System mode switches automatically based on OS setting.
                </p>
              </div>

              {/* Icon-only Theme Selector with Smooth Transition Animation */}
              <div className="flex items-center p-1 bg-secondary rounded-lg border border-border/60 space-x-1">
                <button
                  type="button"
                  onClick={(e) => handleThemeChange('system', e)}
                  className={`p-2 rounded-md transition-all active:scale-95 ${
                    settings.theme === 'system'
                      ? 'bg-card text-primary shadow-subtle border border-border/40'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Auto (System Theme)"
                  aria-label="Auto (System Theme)"
                >
                  <Laptop className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleThemeChange('light', e)}
                  className={`p-2 rounded-md transition-all active:scale-95 ${
                    settings.theme === 'light'
                      ? 'bg-card text-amber-500 shadow-subtle border border-border/40'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Light Theme"
                  aria-label="Light Theme"
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleThemeChange('dark', e)}
                  className={`p-2 rounded-md transition-all active:scale-95 ${
                    settings.theme === 'dark'
                      ? 'bg-card text-indigo-400 shadow-subtle border border-border/40'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Dark Theme"
                  aria-label="Dark Theme"
                >
                  <Moon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: General Grouping Preferences */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2 mb-4">
            <Sliders className="w-4 h-4 text-primary" />
            <span>Grouping Preferences</span>
          </h2>
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-subtle divide-y divide-border/60">
            {/* Toggle 1: Ignore Pinned Tabs */}
            <div className="flex items-center justify-between py-3 first:pt-0">
              <div>
                <p className="text-sm font-medium">Exclude Pinned Tabs</p>
                <p className="text-xs text-muted-foreground">
                  Keep your pinned tabs untouched and ungrouped.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.ignorePinnedTabs}
                onChange={(e) => updateSettings({ ignorePinnedTabs: e.target.checked })}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* Toggle 2: Collapse Inactive Groups */}
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">Collapse Inactive Groups</p>
                <p className="text-xs text-muted-foreground">
                  Automatically collapse all groups except the one containing the active tab.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.collapseInactive}
                onChange={(e) => updateSettings({ collapseInactive: e.target.checked })}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* Toggle 3: Subdomain Handling */}
            <div className="flex items-center justify-between py-3 last:pb-0">
              <div>
                <p className="text-sm font-medium">Subdomain Grouping</p>
                <p className="text-xs text-muted-foreground">
                  Merge subdomains under root brand (e.g. docs.google.com and mail.google.com into "Google").
                </p>
              </div>
              <select
                value={settings.subdomainHandling}
                onChange={(e) =>
                  updateSettings({
                    subdomainHandling: e.target.value as 'separate' | 'merge_root',
                  })
                }
                className="text-xs bg-secondary border border-border/60 rounded-lg px-2.5 py-1.5 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="merge_root">Merge under root domain</option>
                <option value="separate">Keep subdomains separate</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Project Rules */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2 mb-4">
            <FolderKanban className="w-4 h-4 text-primary" />
            <span>Custom Project Rules</span>
          </h2>
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-subtle">
            {/* List existing rules */}
            <div className="space-y-2.5 mb-6">
              {settings.projects.map((proj) => (
                <div
                  key={proj.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={proj.enabled}
                      onChange={() => handleToggleProject(proj.id)}
                      className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                    />
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLOR_MAP[proj.color] || '#3b82f6' }}
                      />
                      <span className="font-semibold text-foreground">{proj.name}</span>
                    </div>
                    <span className="text-muted-foreground font-mono text-[11px] truncate max-w-[260px]">
                      {proj.patterns.join(', ')}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteProject(proj.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new rule form */}
            <form onSubmit={handleAddProject} className="pt-4 border-t border-border/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Add New Project Rule
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Project Name (e.g. Sprint 24)"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="md:col-span-1 text-xs bg-secondary/70 border border-border/60 rounded-lg px-3 py-2 text-foreground outline-none focus:ring-1 focus:ring-primary"
                  required
                />
                <input
                  type="text"
                  placeholder="Match patterns, comma-separated (e.g. *jira*, *gitlab*)"
                  value={newProjectPatterns}
                  onChange={(e) => setNewProjectPatterns(e.target.value)}
                  className="md:col-span-2 text-xs bg-secondary/70 border border-border/60 rounded-lg px-3 py-2 text-foreground outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex items-center space-x-2 md:col-span-1">
                  <select
                    value={newProjectColor}
                    onChange={(e) => setNewProjectColor(e.target.value as ChromeGroupColor)}
                    className="flex-1 text-xs bg-secondary/70 border border-border/60 rounded-lg px-2.5 py-2 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary"
                  >
                    {AVAILABLE_COLORS.map((col) => (
                      <option key={col} value={col}>
                        {col.charAt(0).toUpperCase() + col.slice(1)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-xs flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Section 4: Domain Exclusion Blacklist */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2 mb-4">
            <ShieldBan className="w-4 h-4 text-primary" />
            <span>Excluded Domains & URLs</span>
          </h2>
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-subtle">
            <p className="text-xs text-muted-foreground mb-4">
              Tabs matching these domains or patterns will never be placed into groups.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {settings.excludedDomains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-secondary border border-border/60 text-xs font-mono"
                >
                  <span className="text-foreground">{domain}</span>
                  {!['chrome://', 'edge://', 'about:'].includes(domain) && (
                    <button
                      onClick={() => handleDeleteExcludedDomain(domain)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddExcludedDomain} className="flex items-center space-x-2 pt-3 border-t border-border/60">
              <input
                type="text"
                placeholder="Domain to exclude (e.g. localhost, internal.corp.com)"
                value={newExcludedDomain}
                onChange={(e) => setNewExcludedDomain(e.target.value)}
                className="flex-1 text-xs bg-secondary/70 border border-border/60 rounded-lg px-3 py-2 text-foreground outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border/60 text-foreground font-medium text-xs flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Exclude</span>
              </button>
            </form>
          </div>
        </div>

        {/* Section 5: Reset to Defaults */}
        <div className="mt-8 pt-6 border-t border-border/70 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Reset Configuration</p>
            <p className="text-xs text-muted-foreground">
              Restore default grouping settings and original project templates.
            </p>
          </div>

          <button
            onClick={handleResetDefaults}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
        </div>
      </div>
    </div>
  );
}
