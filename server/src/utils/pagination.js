'use strict';

// Clamp page/pageSize from arbitrary input into safe positive integers.
// Returns { page, pageSize, offset } with `pageSize` clamped to [1, max].
function clampPagination(page, pageSize, opts = {}) {
  const max = Number.isFinite(opts.max) ? opts.max : 100;
  const defaultSize = Number.isFinite(opts.defaultSize) ? opts.defaultSize : 20;

  const pageNum = Math.floor(Number(page));
  const safePage = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;

  const sizeNum = Math.floor(Number(pageSize));
  const safePageSize =
    Number.isFinite(sizeNum) && sizeNum > 0
      ? Math.min(max, sizeNum)
      : defaultSize;

  const offset = (safePage - 1) * safePageSize;
  return { page: safePage, pageSize: safePageSize, offset };
}

module.exports = { clampPagination };
