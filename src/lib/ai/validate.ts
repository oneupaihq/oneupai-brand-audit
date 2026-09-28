// The fact check for anything the AI model writes. The model rewords facts it is handed;
// this code pulls every number and proper name out of its text and drops any sentence that
// contains one the facts do not support.

export interface FactSet {
  numbers: Set<string>;
  names: string[]; // allowed proper names (businesses, platforms, places, agents)
}

// Numbers the plan itself uses (phases, months, top 3) are always allowed.
const ALWAYS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '30', '60', '90', '100']);

export const normNum = (s: string) => s.replace(/,/g, '').replace(/\.0+$/, '').replace(/%$/, '');

export function factSet(values: unknown[], names: string[]): FactSet {
  const numbers = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === 'number' && Number.isFinite(v)) {
      numbers.add(normNum(String(v)));
      numbers.add(normNum(String(Math.round(v))));
      numbers.add(normNum(v.toFixed(1)));
    } else if (typeof v === 'string') {
      for (const m of v.match(/\d[\d,]*(\.\d+)?/g) || []) numbers.add(normNum(m));
    } else if (Array.isArray(v)) v.forEach(add);
    else if (v && typeof v === 'object') Object.values(v).forEach(add);
  };
  values.forEach(add);
  return { numbers, names: names.filter(Boolean) };
}

const BASE_NAMES = ['Google', 'Google Maps', 'Google Search', 'YouTube', 'YouTube Shorts', 'Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Pinterest', 'ChatGPT', 'Claude', 'Gemini', 'OneUp', 'OneUpAI', 'Shorts', 'Reels', 'AI', 'FAQ', 'Spanish', 'English', 'Google Business Profile'];

function namesIn(sentence: string): string[] {
  // Runs of capitalised words (2+ words, or a single word with an inner capital like "OneUpTours"),
  // skipping the sentence's first word.
  const words = sentence.replace(/[“”"()]/g, ' ').split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let run: string[] = [];
  words.forEach((w, i) => {
    const clean = w.replace(/[.,;:!?'’]+$/g, '').replace(/['’]s$/, '');
    const cap = /^[A-Z][\w&.-]*$/.test(clean) && i > 0;
    if (cap) run.push(clean); else { if (run.length) out.push(run.join(' ')); run = []; }
  });
  if (run.length) out.push(run.join(' '));
  return out.filter(n => n.split(' ').length >= 2 || /[a-z][A-Z]/.test(n));
}

export function checkSentence(sentence: string, facts: FactSet): string | null {
  for (const m of sentence.match(/\d[\d,]*(\.\d+)?%?/g) || []) {
    const n = normNum(m);
    if (!ALWAYS.has(n) && !facts.numbers.has(n)) return `number ${m} is not in the data`;
  }
  const allowed = [...BASE_NAMES, ...facts.names].map(s => s.toLowerCase());
  for (const name of namesIn(sentence)) {
    const n = name.toLowerCase();
    const ok = allowed.some(a => a.includes(n) || n.includes(a) || n.split(' ').every(w => allowed.some(x => x.split(/\s+/).includes(w))));
    if (!ok) return `name "${name}" is not in the data`;
  }
  return null;
}

export function splitSentences(text: string) {
  return text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || [];
}

/** Returns the text with unsupported sentences removed, and the reasons for each removal. */
export function filterText(text: string, facts: FactSet) {
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const s of splitSentences(text)) {
    const why = checkSentence(s, facts);
    if (why) dropped.push(`${s} (${why})`); else kept.push(s);
  }
  return { text: kept.join(' '), dropped };
}

/** A quote from the content review must appear in the source text (whitespace and case ignored). */
export function quoteFound(quote: string, source: string) {
  const n = (s: string) => s.toLowerCase().replace(/[“”"'’]/g, '').replace(/\s+/g, ' ').trim();
  const qq = n(quote);
  return qq.length >= 8 && n(source).includes(qq);
}
