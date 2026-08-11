/**
 * Cover and avatar URLs from the API are often relative paths like `/stitch/book-foo.jpg`.
 * Prefix with the API host so they resolve in production when static files are served there.
 */
export function resolveImageUrl(src) {
  if (!src) return null;
  if (typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  // Protocol-relative CDN URLs (common from imports)
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) {
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
    return `${base}${trimmed}`;
  }
  return trimmed;
}
