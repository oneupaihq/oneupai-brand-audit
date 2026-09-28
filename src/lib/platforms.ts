// Audience sizes shown on the platform graph, using the owner's own figure where one is published.
// - Instagram: 3B monthly active users (Meta, September 2025)
// - Facebook: about 3.1B monthly users (Salesforce roundup, 2026; Meta no longer reports it separately)
// - YouTube: about 2.5B monthly users (Salesforce roundup, 2026)
// - TikTok: about 2B monthly users (Salesforce roundup, 2026; TikTok does not publish a global figure)
// - Pinterest: 640M monthly active users (Pinterest Q2 2026 results)
// - LinkedIn: about 310M monthly active users (Salesforce roundup, 2026; its 1B+ figure counts members, not active users)
// - ChatGPT: 900M weekly active users (OpenAI, February 2026)
// Update here when new figures are published.
export const PLATFORM_META = [
  { id: 'google', name: 'Google Search & Maps', users: null as number | null, usersLabel: 'Where most local searches start', color: '#4f7de0', kind: 'search' as const },
  { id: 'youtube', name: 'YouTube', users: 2.5e9, usersLabel: 'monthly users (est.)', color: '#e0473d', kind: 'mixed' as const },
  { id: 'instagram', name: 'Instagram', users: 3.0e9, usersLabel: 'monthly users', color: '#d0458f', kind: 'content' as const },
  { id: 'tiktok', name: 'TikTok', users: 2.0e9, usersLabel: 'monthly users (est.)', color: '#1f2a33', kind: 'content' as const },
  { id: 'facebook', name: 'Facebook', users: 3.1e9, usersLabel: 'monthly users (est.)', color: '#3b67c9', kind: 'content' as const },
  { id: 'chatgpt', name: 'AI assistants', users: 9.0e8, usersLabel: 'ChatGPT weekly users alone', color: '#2f8a6d', kind: 'search' as const },
  { id: 'pinterest', name: 'Pinterest', users: 6.4e8, usersLabel: 'monthly users', color: '#c7373a', kind: 'content' as const },
  { id: 'linkedin', name: 'LinkedIn', users: 3.1e8, usersLabel: 'monthly users (est.)', color: '#2f6fb0', kind: 'content' as const },
];
export const PLATFORM_SOURCE = 'Meta (Instagram, Sep 2025); Pinterest Q2 2026 results; OpenAI (Feb 2026); Salesforce 2026 roundup for Facebook, YouTube, TikTok and LinkedIn';
