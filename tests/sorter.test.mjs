import {test} from 'node:test';
import assert from 'node:assert/strict';

import {
    extractDomain,
    formatDomainTitle,
    isExcludableUrl,
} from '../src/core/domainGrouper.ts';
import {
    matchPattern,
    matchTabToProject,
} from '../src/core/projectGrouper.ts';
import {
    extractSearchQuery,
    extractTitleKeywords,
    clusterTabsByTopic,
} from '../src/core/topicGrouper.ts';
import {
    getColorForString,
    getPaletteColor,
    CHROME_COLORS,
} from '../src/core/colors.ts';

test('Domain Grouper: extracts root domain and handles subdomains', () => {
    assert.equal(extractDomain('https://www.github.com/facebook/react'), 'github.com');
    assert.equal(extractDomain('https://docs.google.com/document/d/123'), 'google.com');
    assert.equal(
        extractDomain('https://docs.google.com/document/d/123', 'separate'),
        'docs.google.com'
    );
    assert.equal(extractDomain('https://bbc.co.uk/news'), 'bbc.co.uk');
    assert.equal(extractDomain('http://localhost:3000/dashboard'), 'localhost');
});

test('Domain Grouper: formats brand titles and handles fallback capitalization', () => {
    assert.equal(formatDomainTitle('github.com'), 'GitHub');
    assert.equal(formatDomainTitle('youtube.com'), 'YouTube');
    assert.equal(formatDomainTitle('docs.google.com'), 'Google Docs');
    assert.equal(formatDomainTitle('myawesomesite.org'), 'Myawesomesite');
});

test('Domain Grouper: excludes internal browser URLs and user exclusions', () => {
    assert.equal(isExcludableUrl('chrome://settings/'), true);
    assert.equal(isExcludableUrl('chrome-extension://xyz/popup.html'), true);
    assert.equal(isExcludableUrl('edge://flags/'), true);
    assert.equal(isExcludableUrl('about:blank'), true);
    assert.equal(isExcludableUrl('https://github.com', ['internal-corp.net']), false);
    assert.equal(isExcludableUrl('https://internal-corp.net/admin', ['internal-corp.net']), true);
});

test('Project Grouper: pattern matching with wildcards and regex', () => {
    assert.equal(matchPattern('*jira*', 'https://jira.company.com/browse/PROJ-1'), true);
    assert.equal(matchPattern('*github.com*', 'https://github.com/org/repo'), true);
    assert.equal(matchPattern('regex:^https:\\/\\/.*\\.slack\\.com', 'https://team.slack.com'), true);
    assert.equal(matchPattern('*jira*', 'https://news.ycombinator.com'), false);
});

test('Project Grouper: matches tab to priority rule', () => {
    const rules = [
        {
            id: '1',
            name: 'Work Sprint',
            color: 'blue',
            patterns: ['*jira*', '*confluence*'],
            enabled: true,
        },
        {
            id: '2',
            name: 'Code',
            color: 'purple',
            patterns: ['*github.com*'],
            enabled: true,
        },
    ];

    const matched = matchTabToProject(
        'https://jira.atlassian.net/browse/T-100',
        'Task T-100',
        rules
    );
    assert.ok(matched);
    assert.equal(matched.name, 'Work Sprint');

    const unmatched = matchTabToProject('https://reddit.com', 'Reddit', rules);
    assert.equal(unmatched, null);
});

test('Topic Grouper: extracts search queries from engines', () => {
    assert.equal(
        extractSearchQuery('https://www.google.com/search?q=react+19+features'),
        'react 19 features'
    );
    assert.equal(
        extractSearchQuery('https://duckduckgo.com/?q=tailwind+css+setup'),
        'tailwind css setup'
    );
    assert.equal(
        extractSearchQuery('https://www.bing.com/search?q=chrome+extension+mv3'),
        'chrome extension mv3'
    );
});

test('Topic Grouper: extracts keywords and removes stop words and brand titles', () => {
    const kw = extractTitleKeywords('Best React 19 Tutorial for Beginners | React Documentation');
    assert.ok(kw.includes('react'));
    assert.ok(kw.includes('tutorial'));
    assert.ok(kw.includes('beginners'));
    assert.ok(!kw.includes('best')); // stop word
    assert.ok(!kw.includes('for')); // stop word
});

test('Topic Grouper: clusters tabs by shared search intent and keywords', () => {
    const tabs = [
        {
            id: 1,
            url: 'https://www.google.com/search?q=react+hooks+tutorial',
            title: 'react hooks tutorial - Google Search',
        },
        {
            id: 2,
            url: 'https://www.google.com/search?q=react+hooks+tutorial',
            title: 'react hooks tutorial - Google Search',
        },
        {
            id: 3,
            url: 'https://github.com/facebook/react',
            title: 'GitHub - facebook/react: The library for web user interfaces',
        },
        {
            id: 4,
            url: 'https://react.dev/reference/react',
            title: 'React Reference Documentation',
        },
    ];

    const clusters = clusterTabsByTopic(tabs);
    assert.ok(clusters.size >= 1);

    // Search cluster should exist
    assert.ok(clusters.has('Search: React Hooks Tutorial'));
    const searchTabIds = clusters.get('Search: React Hooks Tutorial');
    assert.deepEqual(searchTabIds, [1, 2]);

    // React keyword cluster should group remaining tabs
    assert.ok(clusters.has('React'));
    const reactTabIds = clusters.get('React');
    assert.deepEqual(reactTabIds, [3, 4]);
});

test('Color Palette: produces valid Chrome group colors', () => {
    for (let i = 0; i < 20; i++) {
        const col = getPaletteColor(i);
        assert.ok(CHROME_COLORS.includes(col));
    }

    const col1 = getColorForString('github.com');
    const col2 = getColorForString('github.com');
    assert.equal(col1, col2); // Deterministic
    assert.ok(CHROME_COLORS.includes(col1));
});
