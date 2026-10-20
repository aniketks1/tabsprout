const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'over', 'after', 'beneath', 'under', 'above',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'how', 'what', 'why', 'when', 'where', 'who', 'which',
  'online', 'free', 'best', 'top', 'new', 'page', 'home', 'official', 'site', 'website',
  'web', 'app', 'dashboard', 'login', 'signup', 'portal', 'index',
]);

const SEARCH_ENGINES: Record<string, string> = {
  'google.com': 'q',
  'bing.com': 'q',
  'duckduckgo.com': 'q',
  'yahoo.com': 'p',
  'ecosia.org': 'q',
  'kagi.com': 'q',
};

/**
 * Extracts search query term from search engine URLs
 */
export function extractSearchQuery(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    let host = url.hostname.toLowerCase().replace(/^www\./, '');

    // Check if host matches any search engine
    for (const [engineHost, paramKey] of Object.entries(SEARCH_ENGINES)) {
      if (host.includes(engineHost)) {
        const query = url.searchParams.get(paramKey);
        if (query && query.trim().length > 1) {
          return query.trim();
        }
      }
    }
  } catch {
    // Ignore invalid URLs
  }
  return null;
}

/**
 * Clean & tokenize a title into meaningful topic keywords
 */
export function extractTitleKeywords(title: string): string[] {
  if (!title) return [];

  // Remove common brand suffixes often separated by | or • with spaces
  const cleanTitle = title.split(/\s+[|•]\s+/)[0].trim();

  const words = cleanTitle
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s-_/]/g, ' ')
    .split(/[\s/_-]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  return words;
}

export interface TabTopicCandidate {
  tabId: number;
  url: string;
  title: string;
  searchQuery: string | null;
  keywords: string[];
}

/**
 * Groups tabs into topics using search queries and keyword clustering
 */
export function clusterTabsByTopic(
  tabs: { id?: number; url?: string; title?: string }[]
): Map<string, number[]> {
  const topicGroups = new Map<string, number[]>();
  const candidates: TabTopicCandidate[] = [];

  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;

    const searchQuery = extractSearchQuery(tab.url);
    const keywords = extractTitleKeywords(tab.title || '');

    candidates.push({
      tabId: tab.id,
      url: tab.url,
      title: tab.title || '',
      searchQuery,
      keywords,
    });
  }

  // 1. Group by Search Queries first
  const searchClusters = new Map<string, number[]>();
  const unassigned: TabTopicCandidate[] = [];

  for (const c of candidates) {
    if (c.searchQuery) {
      // Normalize query (take first 3 words or exact query)
      const normalizedQuery = c.searchQuery
        .split(/\s+/)
        .slice(0, 3)
        .join(' ')
        .toLowerCase();
      const cluster = searchClusters.get(normalizedQuery) || [];
      cluster.push(c.tabId);
      searchClusters.set(normalizedQuery, cluster);
    } else {
      unassigned.push(c);
    }
  }

  // Assign search clusters if they have tabs
  for (const [query, tabIds] of searchClusters.entries()) {
    const title = `Search: ${capitalizeWords(query)}`;
    topicGroups.set(title, tabIds);
  }

  // 2. Keyword frequency clustering on unassigned tabs
  const wordFrequencies = new Map<string, number>();
  for (const c of unassigned) {
    const seenWords = new Set(c.keywords);
    for (const w of seenWords) {
      wordFrequencies.set(w, (wordFrequencies.get(w) || 0) + 1);
    }
  }

  // Sort keywords by frequency (only consider words appearing in >= 2 tabs)
  const sharedKeywords = Array.from(wordFrequencies.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);

  const clusteredTabIds = new Set<number>();

  for (const kw of sharedKeywords) {
    const matchingTabs: number[] = [];
    for (const c of unassigned) {
      if (!clusteredTabIds.has(c.tabId) && c.keywords.includes(kw)) {
        matchingTabs.push(c.tabId);
      }
    }

    if (matchingTabs.length >= 2) {
      const topicName = capitalizeWords(kw);
      topicGroups.set(topicName, matchingTabs);
      matchingTabs.forEach((id) => clusteredTabIds.add(id));
    }
  }

  // 3. Fallback for remaining tabs: group by primary domain or high-salience title
  for (const c of unassigned) {
    if (!clusteredTabIds.has(c.tabId)) {
      try {
        const urlObj = new URL(c.url);
        const host = urlObj.hostname.replace(/^www\./, '');
        const domainName = host.split('.')[0];
        const groupName = capitalizeWords(domainName);

        const current = topicGroups.get(groupName) || [];
        current.push(c.tabId);
        topicGroups.set(groupName, current);
        clusteredTabIds.add(c.tabId);
      } catch {
        // Leave ungrouped if URL cannot be parsed
      }
    }
  }

  return topicGroups;
}

function capitalizeWords(str: string): string {
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
