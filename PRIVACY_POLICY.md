# Privacy Policy for TabSprout

*Last updated: October 20, 2026*

**TabSprout** ("we", "our", or "the extension") is committed to respecting and protecting your privacy. This Privacy Policy explains how information is handled when you use the TabSprout Chrome extension.

---

## 1. What Data We Access
To organize your browser tabs, TabSprout requires access to:
- **Tab URLs and Page Titles**: Analyzed locally to extract domain names, identify search queries, and match custom project rules.
- **Tab Group Metadata**: Read and written to assign group titles, group colors, and group collapsed states.

## 2. 100% Local Processing (Zero Remote Data Transmission)
- **All processing is executed entirely on your local device.**
- TabSprout **does not transmit, collect, log, sell, or share** any of your browsing history, tab URLs, page titles, or personal data to any external server or third party.
- There are **no tracking scripts, analytics libraries, or third-party advertising SDKs** bundled with this extension.

## 3. Storage
TabSprout stores user preferences (such as your chosen grouping mode, custom project rules, and theme preferences) using Chrome's native `chrome.storage.sync` API. This data remains private to your Chrome profile and syncs only through your own authenticated Google account.

## 4. Permissions
TabSprout requests the minimum necessary permissions required to function:
- **`tabs`**: Used exclusively to read tab URLs and titles for clustering algorithms.
- **`tabGroups`**: Used exclusively to create and update native Chrome tab groups.
- **`storage`**: Used exclusively to save your custom grouping rules and preferences.

## 5. Contact
If you have any questions or feedback regarding this Privacy Policy, please open an issue in the official GitHub repository.
