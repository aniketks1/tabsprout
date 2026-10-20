/**
 * TabSprout - Background Service Worker
 * Handles keyboard commands and lifecycle events
 */

import { executeSort } from '../core';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[TabSprout] Extension installed successfully.');
  }
});

// Handle keyboard shortcut command (Alt+Shift+S)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'auto_sort_tabs') {
    try {
      const summary = await executeSort();
      console.log(
        `[TabSprout] Auto-sorted ${summary.tabCount} tabs into ${summary.groupCount} groups.`
      );
    } catch (err) {
      console.error('[TabSprout] Keyboard auto-sort failed:', err);
    }
  }
});
