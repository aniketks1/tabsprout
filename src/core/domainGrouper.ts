export const KNOWN_BRANDS: Record<string, string> = {
  'github.com': 'GitHub',
  'youtube.com': 'YouTube',
  'google.com': 'Google',
  'docs.google.com': 'Google Docs',
  'drive.google.com': 'Google Drive',
  'mail.google.com': 'Gmail',
  'stackoverflow.com': 'Stack Overflow',
  'reddit.com': 'Reddit',
  'twitter.com': 'X / Twitter',
  'x.com': 'X / Twitter',
  'linkedin.com': 'LinkedIn',
  'notion.so': 'Notion',
  'figma.com': 'Figma',
  'slack.com': 'Slack',
  'linear.app': 'Linear',
  'chatgpt.com': 'ChatGPT',
  'openai.com': 'OpenAI',
  'claude.ai': 'Claude',
  'amazon.com': 'Amazon',
  'netflix.com': 'Netflix',
  'spotify.com': 'Spotify',
  'wikipedia.org': 'Wikipedia',
  'medium.com': 'Medium',
  'substacks.com': 'Substack',
};

const MULTI_PART_TLDS = new Set([
  'co.uk',
  'gov.uk',
  'ac.uk',
  'com.au',
  'net.au',
  'co.jp',
  'co.in',
  'gov.in',
  'com.br',
  'com.sg',
]);

/**
 * Extracts a clean root domain or host from a URL
 */
export function extractDomain(
  urlString: string,
  subdomainHandling: 'separate' | 'merge_root' = 'merge_root'
): string | null {
  try {
    const url = new URL(urlString);
    let host = url.hostname.toLowerCase();

    // Strip standard www.
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }

    // Don't group localhost or IP addresses as domains with TLDs
    if (host === 'localhost' || host === '127.0.0.1' || !host.includes('.')) {
      return host;
    }

    if (subdomainHandling === 'separate') {
      return host;
    }

    // Merge subdomains under root domain
    const parts = host.split('.');
    if (parts.length <= 2) {
      return host;
    }

    const lastTwo = parts.slice(-2).join('.');
    if (MULTI_PART_TLDS.has(lastTwo)) {
      // e.g. bbc.co.uk
      return parts.slice(-3).join('.');
    }

    // e.g. docs.google.com -> google.com
    return parts.slice(-2).join('.');
  } catch {
    return null;
  }
}

/**
 * Formats a domain into a clean, human-readable group title
 */
export function formatDomainTitle(domain: string): string {
  if (KNOWN_BRANDS[domain]) {
    return KNOWN_BRANDS[domain];
  }

  // Check if root of domain is in known brands
  const parts = domain.split('.');
  if (parts.length > 2) {
    const root = parts.slice(-2).join('.');
    if (KNOWN_BRANDS[root]) {
      const sub = parts[0];
      return `${capitalize(sub)} · ${KNOWN_BRANDS[root]}`;
    }
  }

  // Capitalize name portion (e.g., "example" from "example.com")
  const mainPart = parts[0];
  return capitalize(mainPart);
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isExcludableUrl(url: string, excludedList: string[] = []): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();

  // Internal schemes
  if (
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-extension://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('about:') ||
    lower.startsWith('devtools://')
  ) {
    return true;
  }

  for (const pattern of excludedList) {
    if (pattern && lower.includes(pattern.toLowerCase())) {
      return true;
    }
  }

  return false;
}
