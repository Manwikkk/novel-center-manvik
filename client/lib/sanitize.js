import DOMPurify from 'isomorphic-dompurify';

const CONFIG = {
  ALLOWED_TAGS: [
    'p','br','h1','h2','h3','h4',
    'strong','em','u','s',
    'blockquote','hr',
    'ul','ol','li',
    'a','img','figure','figcaption',
    'code','pre',
  ],
  ALLOWED_ATTR: ['href','src','alt','title','target','rel','width','height'],
};

export function sanitizeChapterHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, CONFIG);
}
