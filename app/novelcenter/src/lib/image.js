import { API_BASE_URL } from '@/config/env';

/**
 * Cover URLs from the API are relative paths like `/stitch/book-foo.jpg`.
 * On the web they're served from Next's `/public`, but the mobile app has
 * to point at the API host. Absolute URLs (http(s)) are returned as-is.
 */
export function resolveImageUrl(src) {
  if (!src) return null;
  if (typeof src !== 'string') return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('/')) return `${API_BASE_URL.replace(/\/$/, '')}${src}`;
  return src;
}
