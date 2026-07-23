/**
 * Cover and avatar URLs from the API are often relative paths like `/stitch/book-foo.jpg`.
 * Prefix with the API host so they resolve in production when static files are served there.
 */
export function resolveImageUrl(src) {
  if (!src) return null;
  if (typeof src !== 'string') return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('/')) {
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
    return `${base}${src}`;
  }
  return src;
}
