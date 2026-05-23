'use strict';

const sanitizeHtml = require('sanitize-html');

// Allowlist tuned for editorial chapter content: long-form prose with images,
// blockquotes, links, and basic emphasis. Any unknown tag/attr is stripped.
const CHAPTER_OPTIONS = {
  allowedTags: [
    'p', 'br', 'h1', 'h2', 'h3', 'h4',
    'strong', 'em', 'u', 's',
    'blockquote', 'hr',
    'ul', 'ol', 'li',
    'a', 'img',
    'figure', 'figcaption',
    'code', 'pre',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
  disallowedTagsMode: 'discard',
};

function sanitizeChapterHtml(html) {
  if (typeof html !== 'string') return '';
  return sanitizeHtml(html, CHAPTER_OPTIONS);
}

// Stricter rule for short comment bodies - allow only emphasis, no images/links.
function sanitizeCommentBody(body) {
  if (typeof body !== 'string') return '';
  return sanitizeHtml(body, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  }).trim();
}

function sanitizeAuthorThought(text) {
  return sanitizeCommentBody(text);
}

module.exports = { sanitizeChapterHtml, sanitizeCommentBody, sanitizeAuthorThought };
