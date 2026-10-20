import {useEffect, useState, useTransition} from 'react';
import {
    Globe,
    Sparkles,
    FolderKanban,
    Settings as SettingsIcon,
    RotateCcw,
    CheckCircle2,
    ChevronRight,
    Ungroup,
    Eye,
    EyeOff,
    Sun,
    Moon,
    Laptop,
    Layers,
} from 'lucide-react';
import {SortMode, ThemePreference, UserSettings} from '../types';
import {getSettings, saveSettings} from '../utils/storage';
import {applyTheme, applyThemeWithAnimation, listenSystemThemeChange} from '../utils/theme';
import {executeSort, undoSort, ungroupAll, previewGroups, GroupPreviewItem} from '../core';

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

export default function App() {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [tabCount, setTabCount] = useState<number>(0);
    const [existingGroupCount, setExistingGroupCount] = useState<number>(0);
    const [isSorting, setIsSorting] = useState<boolean>(false);
    const [showPreview, setShowPreview] = useState<boolean>(false);
    const [previews, setPreviews] = useState<GroupPreviewItem[]>([]);
    const [, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{
        message: string;
        showUndo: boolean;
    } | null>(null);

    const refreshTabStats = () => {
        if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
            chrome.tabs.query({currentWindow: true}, (tabs) => {
                setTabCount(tabs.length);
            });
            if (chrome.tabGroups?.query) {
                chrome.tabGroups.query({windowId: chrome.windows?.WINDOW_ID_CURRENT}, (groups) => {
                    setExistingGroupCount(groups.length);
                });
            }
        } else {
            setTabCount(12);
            setExistingGroupCount(2);
        }
    };

    const updatePreviewList = (mode?: SortMode) => {
        previewGroups(mode).then((items) => {
            startTransition(() => {
                setPreviews(items);
            });
        });
    };

    useEffect(() => {
        getSettings().then((s) => {
            setSettings(s);
            applyTheme(s.theme);
            updatePreviewList(s.sortMode);
        });

        const cleanupTheme = listenSystemThemeChange(() => {
            if (settings?.theme === 'system') {
                applyTheme('system');
            }
        });

        refreshTabStats();
        return () => cleanupTheme();
    }, [settings?.theme]);

    const handleModeChange = async (mode: SortMode) => {
        if (!settings) return;
        const updated = {...settings, sortMode: mode};
        setSettings(updated);
        await saveSettings(updated);
        updatePreviewList(mode);
    };

    const handleToggleTheme = async (e?: React.MouseEvent<HTMLElement>) => {
        if (!settings) return;
        const themeCycle: Record<ThemePreference, ThemePreference> = {
            light: 'dark',
            dark: 'system',
            system: 'light',
        };
        const nextTheme = themeCycle[settings.theme] || 'light';
        applyThemeWithAnimation(nextTheme, e);
        const updated = {...settings, theme: nextTheme};
        setSettings(updated);
        await saveSettings(updated);
    };

    const handleSort = async () => {
        if (!settings) return;
        setIsSorting(true);
        setFeedback(null);

        try {
            const summary = await executeSort(settings.sortMode);
            refreshTabStats();
            setShowPreview(false);

            if (summary.groupCount === 0) {
                setFeedback({
                    message: 'No eligible tabs to group.',
                    showUndo: false,
                });
            } else {
                setFeedback({
                    message: `Grouped into ${summary.groupCount} ${
                        summary.groupCount === 1 ? 'group' : 'groups'
                    }`,
                    showUndo: true,
                });
            }
        } catch (err) {
            console.error(err);
            setFeedback({
                message: 'Failed to organize tabs.',
                showUndo: false,
            });
        } finally {
            setIsSorting(false);
        }
    };

    const handleUndo = async () => {
        const success = await undoSort();
        if (success) {
            setFeedback({
                message: 'Reverted to previous state.',
                showUndo: false,
            });
            refreshTabStats();
            if (settings) updatePreviewList(settings.sortMode);
        }
    };

    const handleUngroupAll = async () => {
        await ungroupAll();
        setFeedback({
            message: 'Ungrouped all tabs.',
            showUndo: false,
        });
        refreshTabStats();
        if (settings) updatePreviewList(settings.sortMode);
    };

    const togglePreview = () => {
        const next = !showPreview;
        setShowPreview(next);
        if (next && settings) {
            updatePreviewList(settings.sortMode);
        }
    };

    const openOptionsPage = () => {
        if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open('options.html', '_blank');
        }
    };

    if (!settings) {
        return <div className="w-[340px] h-[400px] bg-background animate-pulse"/>;
    }

    return (
        <div
            className="w-[340px] min-h-[400px] max-h-[580px] bg-background text-foreground flex flex-col justify-between p-4 select-none font-sans transition-colors duration-200">
            {/* Top Header */}
            <div>
                <header className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center space-x-2.5">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center ring-1 ring-border/50 shadow-subtle overflow-hidden bg-card">
                            <img src="/icons/icon32.png" alt="TabSprout" className="w-6 h-6 object-contain"/>
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold tracking-tight text-foreground">
                                TabSprout
                            </h1>
                            <p className="text-[11px] text-muted-foreground font-medium flex items-center space-x-1">
                                <span>{tabCount} open {tabCount === 1 ? 'tab' : 'tabs'}</span>
                                <span>•</span>
                                <span>{existingGroupCount} {existingGroupCount === 1 ? 'group' : 'groups'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-1">
                        <button
                            onClick={handleUngroupAll}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            title="Ungroup all tabs in current window"
                        >
                            <Ungroup className="w-4 h-4"/>
                        </button>
                        <button
                            onClick={(e) => handleToggleTheme(e)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-95"
                            title={`Theme: ${
                                settings.theme === 'system'
                                    ? 'Auto (System)'
                                    : settings.theme === 'light'
                                        ? 'Light'
                                        : 'Dark'
                            } (Click to switch)`}
                        >
                            {settings.theme === 'dark' ? (
                                <Moon className="w-4 h-4 text-indigo-400"/>
                            ) : settings.theme === 'light' ? (
                                <Sun className="w-4 h-4 text-amber-500"/>
                            ) : (
                                <Laptop className="w-4 h-4 text-primary"/>
                            )}
                        </button>
                        <button
                            onClick={openOptionsPage}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            title="Open Preferences"
                        >
                            <SettingsIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </header>

                {/* Mode Selector Segmented Tabs */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Grouping Strategy
                        </label>
                        <button
                            onClick={togglePreview}
                            className="flex items-center space-x-1 text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors"
                        >
                            {showPreview ? (
                                <>
                                    <EyeOff className="w-3 h-3 text-primary"/>
                                    <span className="text-primary">Hide Preview</span>
                                </>
                            ) : (
                                <>
                                    <Eye className="w-3 h-3"/>
                                    <span>Preview</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-secondary/70 rounded-lg border border-border/50">
                        <button
                            onClick={() => handleModeChange('domain')}
                            className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                                settings.sortMode === 'domain'
                                    ? 'bg-card text-foreground shadow-subtle border border-border/40 font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Globe className="w-3.5 h-3.5 text-primary"/>
                            <span>Domain</span>
                        </button>

                        <button
                            onClick={() => handleModeChange('topic')}
                            className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                                settings.sortMode === 'topic'
                                    ? 'bg-card text-foreground shadow-subtle border border-border/40 font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500"/>
                            <span>Topic</span>
                        </button>

                        <button
                            onClick={() => handleModeChange('project')}
                            className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                                settings.sortMode === 'project'
                                    ? 'bg-card text-foreground shadow-subtle border border-border/40 font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <FolderKanban className="w-3.5 h-3.5 text-purple-500"/>
                            <span>Project</span>
                        </button>
                    </div>
                </div>

                {/* Live Group Preview Panel */}
                {showPreview && (
                    <div
                        className="mt-3.5 p-2.5 rounded-xl bg-secondary/40 border border-border/60 text-xs animate-fade-in max-h-[160px] overflow-y-auto">
                        <div
                            className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/40 text-[11px] text-muted-foreground">
                            <span>Detected {previews.length} target groups</span>
                            <span>Total: {previews.reduce((acc, p) => acc + p.count, 0)} tabs</span>
                        </div>

                        {previews.length === 0 ? (
                            <p className="text-center py-3 text-muted-foreground text-xs">
                                No clusterable tabs found.
                            </p>
                        ) : (
                            <div className="space-y-1.5">
                                {previews.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-secondary/70 transition-colors"
                                    >
                                        <div className="flex items-center space-x-2 truncate max-w-[220px]">
                      <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{backgroundColor: COLOR_MAP[item.color] || '#3b82f6'}}
                      />
                                            <span className="font-medium text-foreground truncate">
                        {item.title}
                      </span>
                                        </div>
                                        <span
                                            className="text-[11px] px-1.5 py-0.5 rounded-full bg-background border border-border/50 text-muted-foreground font-mono">
                      {item.count}
                    </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Hero Quick Action Button */}
                <div className="mt-4">
                    <button
                        onClick={handleSort}
                        disabled={isSorting || tabCount === 0}
                        className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover active:scale-[0.98] text-primary-foreground font-semibold text-sm shadow-premium hover:shadow-premium-hover flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSorting ? (
                            <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin"/>
                        ) : (
                            <>
                                <Layers className="w-4 h-4"/>
                                <span>Organize Tabs Now</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Feedback / Toast Notice with Undo Action */}
                {feedback && (
                    <div
                        className="mt-3 flex items-center justify-between p-2.5 rounded-lg bg-secondary/90 border border-border/60 text-xs animate-fade-in shadow-subtle">
                        <div className="flex items-center space-x-2 text-foreground font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>
                            <span className="truncate max-w-[200px]">{feedback.message}</span>
                        </div>
                        {feedback.showUndo && (
                            <button
                                onClick={handleUndo}
                                className="flex items-center space-x-1 text-primary hover:text-primary-hover font-semibold px-2 py-0.5 rounded hover:bg-primary/10 transition-colors"
                                title="Undo sort"
                            >
                                <RotateCcw className="w-3 h-3"/>
                                <span className="text-[11px]">Undo</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Navigation / Shortcuts hint */}
            <div
                className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center space-x-1">
          <span>Shortcut:</span>
          <kbd
              className="px-1.5 py-0.5 rounded bg-secondary font-mono text-[10px] text-foreground border border-border/60">
            Alt+Shift+S
          </kbd>
        </span>
                <button
                    onClick={openOptionsPage}
                    className="flex items-center space-x-0.5 hover:text-foreground transition-colors"
                >
                    <span>Preferences</span>
                    <ChevronRight className="w-3 h-3"/>
                </button>
            </div>
        </div>
    );
}
