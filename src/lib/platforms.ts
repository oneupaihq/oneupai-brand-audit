// Audience sizes shown on the platform graph. Monthly active users from Backlinko (April 2026);
// ChatGPT is OpenAI's reported weekly users. Estimates vary by source; update here when they change.
export const PLATFORM_META = [
  { id: 'google', name: 'Google Search & Maps', users: null as number | null, usersLabel: 'Where most local searches start', color: '#4f7de0', kind: 'search' as const },
  { id: 'youtube', name: 'YouTube', users: 2.65e9, color: '#e0473d', kind: 'mixed' as const },
  { id: 'instagram', name: 'Instagram', users: 1.99e9, color: '#d0458f', kind: 'content' as const },
  { id: 'tiktok', name: 'TikTok', users: 2.21e9, color: '#1f2a33', kind: 'content' as const },
  { id: 'facebook', name: 'Facebook', users: 2.39e9, color: '#3b67c9', kind: 'content' as const },
  { id: 'chatgpt', name: 'AI assistants', users: 9.0e8, usersLabel: 'ChatGPT weekly users alone', color: '#2f8a6d', kind: 'search' as const },
  { id: 'pinterest', name: 'Pinterest', users: 5.79e8, color: '#c7373a', kind: 'content' as const },
  { id: 'linkedin', name: 'LinkedIn', users: 1.43e9, color: '#2f6fb0', kind: 'content' as const },
];
export const PLATFORM_SOURCE = 'Backlinko, April 2026; OpenAI for ChatGPT weekly users';
