'use strict';

const { htmlToWordCount } = require('./reading.service');

const SPLIT_WARNING =
  'This chapter exceeds 3,600 words. Consider splitting it into two chapters for a better reading experience.';

// A chapter may only be made paid once the whole novel (all non-recycled
// chapters, drafts included) has reached this many words.
const PAID_CHAPTER_MIN_BOOK_WORDS = 40000;

function paidGateMessage(totalWords) {
  return `Paid chapters unlock once the novel reaches ${PAID_CHAPTER_MIN_BOOK_WORDS.toLocaleString('en-US')} words`
    + ` (currently ${Math.max(0, Number(totalWords) || 0).toLocaleString('en-US')}).`;
}

function computeTokenPrice(wordCount) {
  const words = Math.max(0, Number(wordCount) || 0);
  if (words < 800) return 0;
  if (words <= 999) return 8;
  if (words <= 1200) return 10;
  if (words <= 1800) return 15;
  if (words <= 2400) return 20;
  if (words <= 3000) return 25;
  if (words <= 3600) return 30;
  if (words <= 4000) return 35;
  if (words <= 4800) return 38;
  return 40;
}

function getSplitWarning(wordCount) {
  const words = Math.max(0, Number(wordCount) || 0);
  return words > 3600 ? SPLIT_WARNING : null;
}

function pricingFromContent(isPaid, contentHtml) {
  const wordCount = htmlToWordCount(contentHtml);
  const tokenPrice = isPaid ? computeTokenPrice(wordCount) : 0;
  return {
    wordCount,
    tokenPrice,
    pricingNote: isPaid ? getSplitWarning(wordCount) : null,
  };
}

module.exports = {
  PAID_CHAPTER_MIN_BOOK_WORDS,
  paidGateMessage,
  computeTokenPrice,
  getSplitWarning,
  pricingFromContent,
  htmlToWordCount,
};
