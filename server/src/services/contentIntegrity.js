'use strict';

/*
 * Repeated-paragraph detector.
 *
 * Authors can try to reach word-based criteria (the 40,000-word paid-chapter
 * gate, per-chapter price tiers) by pasting the same passage over and over,
 * inside one chapter or across chapters of the same novel. This module turns
 * chapter HTML into normalised paragraphs, fingerprints them with word
 * shingles and reports which paragraphs are copies of text seen earlier.
 *
 * Only *unique* words count toward criteria; heavily duplicated chapters are
 * refused at publish time. The client mirrors this logic in
 * client/lib/contentIntegrity.js for live feedback in the editor.
 */

const MIN_PARAGRAPH_WORDS = 12; // shorter lines ("***", one-line dialogue) are never flagged
const SHINGLE = 6;              // words per fingerprint window
const DUPLICATE_OVERLAP = 0.5;  // share of a paragraph's shingles already seen → it is a copy
const BLOCK_RATIO = 0.4;        // publish is refused when this share of the words is copied…
const BLOCK_MIN_WORDS = 200;    // …and at least this many words are copies

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

/** Split chapter HTML into paragraphs (block boundaries, line breaks and blank lines). */
function paragraphsFromHtml(html) {
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
  for (let i = 0; i + SHINGLE <= words.length; i += 1) {
    out.push(words.slice(i, i + SHINGLE).join(' '));
  }
  return out;
}

/** Fingerprints of every substantial paragraph in a chapter (for cross-chapter checks). */
function shinglesFromHtml(html) {
  const set = new Set();
  for (const p of paragraphsFromHtml(html)) {
    if (p.words.length < MIN_PARAGRAPH_WORDS) continue;
    for (const s of shinglesOf(p.words)) set.add(s);
  }
  return set;
}

/**
 * Analyse a chapter. `prior` is a Set of shingles from the novel's other
 * chapters (optional); `priorLabel` names them in the report.
 */
function analyzeContent(html, { prior = null, priorLabel = 'another chapter' } = {}) {
  const paragraphs = paragraphsFromHtml(html);
  const seenHere = new Set();
  let wordCount = 0;
  let duplicatedWords = 0;
  const repeated = [];

  for (const p of paragraphs) {
    wordCount += p.words.length;
    if (p.words.length < MIN_PARAGRAPH_WORDS) continue;
    const shingles = shinglesOf(p.words);
    let hitsHere = 0;
    let hitsPrior = 0;
    for (const s of shingles) {
      if (seenHere.has(s)) hitsHere += 1;
      else if (prior && prior.has(s)) hitsPrior += 1;
    }
    const overlap = (hitsHere + hitsPrior) / shingles.length;
    if (overlap >= DUPLICATE_OVERLAP) {
      duplicatedWords += p.words.length;
      repeated.push({
        words: p.words.length,
        preview: p.words.slice(0, 10).join(' ') + (p.words.length > 10 ? '…' : ''),
        source: hitsPrior > hitsHere ? priorLabel : 'this chapter',
        overlap: Math.round(overlap * 100) / 100,
      });
    }
    for (const s of shingles) seenHere.add(s);
  }

  const uniqueWordCount = Math.max(0, wordCount - duplicatedWords);
  const duplicateRatio = wordCount ? duplicatedWords / wordCount : 0;
  return {
    wordCount,
    uniqueWordCount,
    duplicatedWords,
    duplicateRatio,
    repeated,
    shingles: seenHere,
    blocking: duplicatedWords >= BLOCK_MIN_WORDS && duplicateRatio >= BLOCK_RATIO,
  };
}

/** Author-facing explanation for a refused publish. */
function duplicateMessage(report) {
  const pct = Math.round(report.duplicateRatio * 100);
  const here = report.repeated.filter((r) => r.source === 'this chapter').length;
  const elsewhere = report.repeated.length - here;
  const parts = [];
  if (here) parts.push(`${here} paragraph${here === 1 ? '' : 's'} repeated within this chapter`);
  if (elsewhere) parts.push(`${elsewhere} paragraph${elsewhere === 1 ? '' : 's'} already published in other chapters of this novel`);
  return `About ${pct}% of this chapter is duplicated text (${parts.join(', ')}). Duplicated passages do not count toward word totals or prices — remove them before publishing.`;
}

function publicReport(report) {
  return {
    wordCount: report.wordCount,
    uniqueWordCount: report.uniqueWordCount,
    duplicatedWords: report.duplicatedWords,
    duplicateRatio: Math.round(report.duplicateRatio * 1000) / 1000,
    repeated: report.repeated.slice(0, 20),
    blocking: report.blocking,
  };
}

module.exports = {
  MIN_PARAGRAPH_WORDS,
  SHINGLE,
  DUPLICATE_OVERLAP,
  BLOCK_RATIO,
  BLOCK_MIN_WORDS,
  paragraphsFromHtml,
  shinglesFromHtml,
  analyzeContent,
  duplicateMessage,
  publicReport,
};
