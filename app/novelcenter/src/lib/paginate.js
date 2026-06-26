export function clampPage(n, max) {
  const num = Number(n);
  if (!Number.isFinite(num) || num < 1) return 1;
  if (max && num > max) return max;
  return Math.floor(num);
}

export function pageCount(total, pageSize) {
  if (!total || !pageSize) return 0;
  return Math.max(1, Math.ceil(total / pageSize));
}
