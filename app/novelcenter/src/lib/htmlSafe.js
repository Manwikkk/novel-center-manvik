/**
 * Sanitises chapter HTML for `react-native-render-html`. Strips script/style/iframe
 * tags, removes inline event handlers, and dangerous javascript: URLs.
 */
const BLOCKED_TAGS = /<\/?(?:script|style|iframe|object|embed|link|meta)[^>]*>/gi;
const ON_HANDLERS = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL = /href\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi;

export function sanitiseHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(BLOCKED_TAGS, '')
    .replace(ON_HANDLERS, '')
    .replace(JS_URL, 'href="#"');
}

export function htmlToWordCount(html) {
  if (!html) return 0;
  const text = String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 0;
  return text.split(' ').length;
}
