# Chrome Web Store Submission Guide for TabSprout

Use the exact details below when filling out your Chrome Developer Dashboard submission for **TabSprout**.

---

## 1. Store Listing Metadata

| Field | Content |
| :--- | :--- |
| **Extension Name** | `TabSprout` |
| **Short Description** | `Automatic tab grouping and sorting with one click` *(Under 132 chars)* |
| **Category** | `Productivity` |
| **Language** | `English` |

### Detailed Description (Markdown / Plain Text for Store Listing):
```text
TabSprout fights tab clutter by intelligently organizing and grouping your open tabs with a single click.

✨ Key Features:
• 🌐 Sort by Domain: Groups tabs by website brand (GitHub, Google Docs, YouTube, etc.) with clean auto-capitalization.
• 💡 Sort by Topic: Clusters Google/Bing research queries and related tabs by keyword intent.
• 📁 Sort by Project: Define custom match rules with wildcards (*jira*, *github.com*) to organize work sprints.
• 👁️ Live Group Preview: View projected clusters, tab counts, and color badges before applying.
• ↩️ 1-Click Undo: Instantly revert tabs to their previous arrangement if you change your mind.
• 🎨 Adaptive Theme: Premium, minimal aesthetic with automatic system light/dark theme switching.
• ⌨️ Keyboard Shortcut: Press Alt+Shift+S anytime to group tabs without opening the popup.

🛡️ Privacy-First & 100% Local:
TabSprout runs entirely inside your browser. No tracking, no analytics, no external servers. Your tab titles and URLs never leave your device.
```

---

## 2. Privacy Practices Tab (Crucial for Approval)

### Single Purpose Description
> "TabSprout automatically organizes open browser tabs into native, color-coded Chrome tab groups based on domain, topic, or custom project rules."

### Permission Justifications

#### Permission: `tabs`
> "The 'tabs' permission is strictly required to read tab URLs and page titles in order to cluster them by domain name, search topic, or user-defined project rules. Tab URLs and titles are processed entirely locally and are never stored or transmitted."

#### Permission: `tabGroups`
> "The 'tabGroups' permission is required to create, name, color, and manage native Chrome tab groups for organized tabs."

#### Permission: `storage`
> "The 'storage' permission is required to save the user's custom project rules, theme preferences, and exclusion lists locally via chrome.storage.sync."

### Data Usage Declarations:
- **Do you collect personal data?** $\rightarrow$ **No** (Select "No, I do not collect or use user data outside of the extension's local functionality").
- **Do you sell user data?** $\rightarrow$ **No**.
- **Do you use user data for purposes unrelated to the extension's single purpose?** $\rightarrow$ **No**.
- **Do you use user data for creditworthiness or lending?** $\rightarrow$ **No**.

---

## 3. Upload Packaging

To generate the final `.zip` file for upload:
```bash
npm run build
```
Zip the contents of the `dist/` directory (make sure `manifest.json` is at the root of the `.zip` archive).
