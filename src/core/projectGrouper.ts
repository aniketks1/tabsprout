import type { ProjectRule } from '../types';

/**
 * Checks if a pattern matches a given target string (URL or Title)
 * Supports simple wildcards (*, ?) or regex: prefixes
 */
export function matchPattern(pattern: string, target: string): boolean {
  if (!pattern || !target) return false;

  const trimmed = pattern.trim().toLowerCase();
  const lowerTarget = target.toLowerCase();

  // If formatted as regex:pattern
  if (trimmed.startsWith('regex:')) {
    try {
      const reg = new RegExp(trimmed.slice(6), 'i');
      return reg.test(lowerTarget);
    } catch {
      return false;
    }
  }

  // If no wildcards, simple contains check
  if (!trimmed.includes('*') && !trimmed.includes('?')) {
    return lowerTarget.includes(trimmed);
  }

  // Convert glob to regex
  const escaped = trimmed
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex special chars except * and ?
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  try {
    const reg = new RegExp(`^${escaped}$`, 'i');
    return reg.test(lowerTarget);
  } catch {
    return lowerTarget.includes(trimmed.replace(/[*?]/g, ''));
  }
}

/**
 * Match a tab against user's defined project rules
 * Evaluates against both tab URL and tab Title
 */
export function matchTabToProject(
  url: string,
  title: string,
  rules: ProjectRule[]
): ProjectRule | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;

    for (const pattern of rule.patterns) {
      if (matchPattern(pattern, url) || matchPattern(pattern, title)) {
        return rule;
      }
    }
  }

  return null;
}
