/**
 * Repeated-paragraph detector — mirrors server/src/services/contentIntegrity.js
 * so the editor can warn live. The server remains the source of truth: it also
 * checks against the novel's other chapters and refuses to publish heavily
 * duplicated chapters.
 */
export const MIN_PARAGRAPH_WORDS = 12;
export const SHINGLE = 6;
export const DUPLICATE_OVERLAP = 0.5;
export const BLOCK_RATIO = 0.4;
export const BLOCK_MIN_WORDS = 200;

function normalise(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#39;|&apos;/gi, '')
    .replace(/[‘’“”"'`]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function paragraphsFromHtml(html) {
  if (!html) return [];
  const withBreaks = String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6]|blockquote|pre|tr|section|article)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return withBreaks
    .split(/\n+/)
    .map((line) => normalise(line))
    .filter(Boolean)
    .map((text) => ({ text, words: text.split(' ') }));
}

function shinglesOf(words) {
  if (words.length <= SHINGLE) return [words.join(' ')];
  const out = [];
  for (let i = 0; i + SHINGLE <= words.length; i += 1) out.push(words.slice(i, i + SHINGLE).join(' '));
  return out;
}

/** In-chapter analysis: which paragraphs repeat text seen earlier in the same chapter. */
export function analyzeContent(html) {
  const seen = new Set();
  let wordCount = 0;
  let duplicatedWords = 0;
  const repeated = [];
  for (const p of paragraphsFromHtml(html)) {
    wordCount += p.words.length;
    if (p.words.length < MIN_PARAGRAPH_WORDS) continue;
    const shingles = shinglesOf(p.words);
    let hits = 0;
    for (const s of shingles) if (seen.has(s)) hits += 1;
    if (hits / shingles.length >= DUPLICATE_OVERLAP) {
      duplicatedWords += p.words.length;
      repeated.push({ words: p.words.length, preview: p.words.slice(0, 10).join(' ') + (p.words.length > 10 ? '…' : '') });
    }
    for (const s of shingles) seen.add(s);
  }
  const uniqueWordCount = Math.max(0, wordCount - duplicatedWords);
  const duplicateRatio = wordCount ? duplicatedWords / wordCount : 0;
  return {
    wordCount,
    uniqueWordCount,
    duplicatedWords,
    duplicateRatio,
    repeated,
    blocking: duplicatedWords >= BLOCK_MIN_WORDS && duplicateRatio >= BLOCK_RATIO,
  };
}
