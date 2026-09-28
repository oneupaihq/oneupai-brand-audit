import Anthropic from '@anthropic-ai/sdk';
import { env, hasAnthropic } from '../env';

// The AI model writes wording and judgements. It never supplies numbers or names on its own:
// callers pass it the facts, and everything it returns goes through ai/validate.ts.

let client: Anthropic | null = null;

export async function askJson<T>(system: string, user: string, maxTokens = 2000): Promise<T | null> {
  if (!hasAnthropic()) return null;
  client ??= new Anthropic({ apiKey: env.anthropicKey });
  const msg = await client.messages.create({
    model: env.aiModel,
    max_tokens: maxTokens,
    system: system + '\nReply with one JSON object only, no prose before or after it.',
    messages: [{ role: 'user', content: user }],
  });
  const text = msg.content.map(b => (b.type === 'text' ? b.text : '')).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as T; } catch { return null; }
}
