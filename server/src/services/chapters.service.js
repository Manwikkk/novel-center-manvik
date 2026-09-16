'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { sanitizeChapterHtml, sanitizeAuthorThought } = require('../utils/htmlSanitize');
const booksService = require('./books.service');
const { htmlToWordCount, minutesFromWords } = require('./reading.service');
const {
  computeTokenPrice,
  getSplitWarning,
  PAID_CHAPTER_MIN_BOOK_WORDS,
  paidGateMessage,
} = require('./chapterPricing.service');
const { resolveUserRow, hasRestriction, assertRestriction } = require('./suspension.service');
const { assertMatureAccess } = require('./ageGate');
const integrity = require('./contentIntegrity');
const rewards = require('./rewards.service');
const notifications = require('./notifications.service');

// Placeholder title given to auto-created chapters; it never counts as a real name.
const DEFAULT_CHAPTER_TITLE = 'Untitled chapter';

function isUnnamedTitle(title) {
  const t = String(title || '').trim();
  return !t || t.toLowerCase() === DEFAULT_CHAPTER_TITLE.toLowerCase();
}

// A chapter that is published (or scheduled to publish) must carry a real title.
function assertNamedForPublish(title, { status, scheduledAt }) {
  if (status !== 'published' && !scheduledAt) return;
  if (isUnnamedTitle(title)) {
    throw errors.badRequest('Name the chapter before publishing it');
  }
}

// Unique words across a novel's other chapters (drafts included) plus the
// fingerprints of everything they contain, so the chapter being saved can be
// checked for passages pasted from elsewhere in the same novel. Cached per
// book and invalidated whenever any other chapter changes, because paid
// chapters recalculate on every autosave.
const integrityCache = new Map();
const INTEGRITY_CACHE_MAX = 64;

async function bookIntegrityContext(bookId, { excludeChapterId = null } = {}) {
  const [[meta]] = await pool.execute(
    `SELECT COUNT(*) AS n, MAX(updated_at) AS latest
       FROM chapters WHERE book_id = ? AND recycled_at IS NULL AND id <> ?`,
    [bookId, excludeChapterId == null ? 0 : excludeChapterId],
  );
  const key = `${bookId}:${excludeChapterId == null ? 0 : excludeChapterId}`;
  const stamp = `${meta.n}:${meta.latest ? new Date(meta.latest).getTime() : 0}`;
  const cached = integrityCache.get(key);
  if (cached && cached.stamp === stamp) return cached.value;

  const [rows] = await pool.execute(
    'SELECT id, idx, content_html FROM chapters WHERE book_id = ? AND recycled_at IS NULL ORDER BY idx ASC, id ASC',
    [bookId],
  );
  const prior = new Set();
  let uniqueWords = 0;
  for (const r of rows) {
    if (Number(r.id) === Number(excludeChapterId)) continue;
    const report = integrity.analyzeContent(r.content_html, { prior });
    uniqueWords += report.uniqueWordCount;
    for (const s of report.shingles) prior.add(s);
  }
  const value = { uniqueWords, prior };
  if (integrityCache.size >= INTEGRITY_CACHE_MAX) {
    integrityCache.delete(integrityCache.keys().next().value);
  }
  integrityCache.set(key, { stamp, value });
  return value;
}

// Unique words across every non-recycled chapter of a book (drafts included).
// Repeated paragraphs — within a chapter or pasted from another chapter of the
// same novel — count once, so copy-pasting cannot inflate word-based criteria.
async function bookWordCount(bookId, { excludeChapterId = null } = {}) {
  return (await bookIntegrityContext(bookId, { excludeChapterId })).uniqueWords;
}

// Full repeated-text report for a chapter against the rest of its novel.
async function inspectChapter(bookId, contentHtml, { excludeChapterId = null } = {}) {
  const ctx = await bookIntegrityContext(bookId, { excludeChapterId });
  const report = integrity.analyzeContent(contentHtml, { prior: ctx.prior, priorLabel: 'another chapter of this novel' });
  return { ctx, report };
}

// Making a chapter paid requires the whole novel to have reached the word threshold.
async function assertPaidAllowed(bookId, { excludeChapterId = null, contentHtml = '' } = {}) {
  const { ctx, report } = await inspectChapter(bookId, contentHtml, { excludeChapterId });
  const total = ctx.uniqueWords + report.uniqueWordCount;
  if (total < PAID_CHAPTER_MIN_BOOK_WORDS) {
    const note = report.duplicatedWords > 0 ? ' Repeated passages are not counted.' : '';
    throw errors.badRequest(paidGateMessage(total) + note);
  }
  return total;
}

// Chapters that are (or are about to be) visible to readers must not be made
// of copied text. Drafts are left alone so authors can edit freely.
function assertNotDuplicated(report) {
  if (!report.blocking) return;
  throw errors.duplicateContent(integrity.duplicateMessage(report), integrity.publicReport(report));
}

// Token price from the chapter's unique words (duplicates never raise the tier).
function priceFor(isPaid, report) {
  return isPaid ? computeTokenPrice(report.uniqueWordCount) : 0;
}

function isPaidChapter(row) {
  return !!row.is_paid && Number(row.token_price) > 0;
}

// Tell everyone following the author that a chapter is out. Best-effort: a
// notification failure never blocks publishing.
async function notifyFollowersOfChapter(chapterRow) {
  try {
    if (!chapterRow || chapterRow.status !== 'published') return;
    const [[book]] = await pool.execute(
      `SELECT b.id, b.slug, b.title, b.author_id, b.status, u.display_name AS author_name
         FROM books b JOIN users u ON u.id = b.author_id WHERE b.id = ? LIMIT 1`,
      [chapterRow.book_id],
    );
    if (!book || book.status !== 'published') return;
    const [followers] = await pool.execute(
      'SELECT follower_id FROM user_follows WHERE followee_id = ?',
      [book.author_id],
    );
    await notifications.notifyMany(followers.map((f) => f.follower_id), {
      type: 'chapter',
      title: `${book.author_name} published Chapter ${chapterRow.idx} of ${book.title}`,
      body: chapterRow.title && !isUnnamedTitle(chapterRow.title) ? chapterRow.title : null,
      linkUrl: `/read/${chapterRow.id}`,
    });
  } catch (_e) {
    /* best-effort */
  }
}

function isAdminOrStaff(viewer) {
  return viewer?.role === 'admin' || viewer?.role === 'staff';
}

function canReadChapter(row, { viewer, bookAuthorId, unlocked, viewerRow, pass = null }) {
  // Super-admins and staff can preview/read all novels for free in the admin panel.
  if (isAdminOrStaff(viewer)) return true;
  if (viewerRow && hasRestriction(viewerRow, 'reading')) return false;
  if (viewer && bookAuthorId && viewer.id === bookAuthorId) return true;
  if (!isPaidChapter(row)) return true;
  if (unlocked) return true;
  // An active Novel / Platform Pass (Daily Check-In reward) is a temporary
  // entitlement: readable while it runs, locked again once it expires.
  return !!pass;
}

/**
 * Reader-facing access facts for a paid chapter: the pass that opens it for
 * free right now, or the voucher-adjusted price of unlocking it.
 */
function accessFacts(row, { unlocked, pass, voucher, bundleVoucher }) {
  if (!isPaidChapter(row) || unlocked) return {};
  const out = {};
  if (pass) {
    out.passAccess = {
      rewardId: pass.id,
      type: pass.type,
      title: pass.title,
      expiresAt: pass.expiresAt,
      remainingSeconds: pass.remainingSeconds,
    };
  }
  const basePrice = Number(row.token_price);
  const discount = voucher ? rewards.computeDiscount(basePrice, voucher) : 0;
  out.unlockQuote = {
    basePrice,
    discount,
    price: basePrice - discount,
    voucher: voucher && discount > 0
      ? { id: voucher.id, title: voucher.title, percent: voucher.percent, maxDiscountCoins: voucher.maxDiscountCoins, validUntil: voucher.validUntil }
      : null,
    bundleVoucher: bundleVoucher
      ? { id: bundleVoucher.id, title: bundleVoucher.title, percent: bundleVoucher.percent, bundleSize: bundleVoucher.bundleSize || 5, maxDiscountCoins: bundleVoucher.maxDiscountCoins, validUntil: bundleVoucher.validUntil }
      : null,
  };
  return out;
}

/** Pass + vouchers a signed-in reader holds, fetched once per request. */
async function readerEntitlements(viewer, bookId) {
  if (!viewer || isAdminOrStaff(viewer)) return { pass: null, voucher: null, bundleVoucher: null };
  const [pass, voucher, bundleVoucher] = await Promise.all([
    rewards.passCovering(viewer.id, bookId),
    rewards.bestVoucher(viewer.id, 'CHAPTER_DISCOUNT'),
    rewards.bestVoucher(viewer.id, 'BUNDLE_DISCOUNT'),
  ]);
  return { pass, voucher, bundleVoucher };
}

function rowToChapter(row, { includeContent = false, isUnlocked = false, canRead = false, integrityReport = null, withIntegrity = false, access = null } = {}) {
  if (!row) return null;
  const wordCount = htmlToWordCount(row.content_html);
  const out = {
    id: row.id,
    bookId: row.book_id,
    idx: row.idx,
    title: row.title,
    isPaid: isPaidChapter(row),
    tokenPrice: Number(row.token_price),
    status: row.status,
    scheduledPublishAt: row.scheduled_publish_at
      ? new Date(row.scheduled_publish_at).toISOString()
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isUnlocked,
    canRead,
    wordCount,
    readingMinutes: minutesFromWords(wordCount, 100),
    authorThought: row.author_thought || '',
    pricingNote: getSplitWarning(wordCount),
    ...(access || {}),
  };
  if (includeContent && canRead) out.contentHtml = row.content_html || '';
  if (withIntegrity || integrityReport) {
    // Author/admin views only: unique words (repeated paragraphs counted once).
    const report = integrityReport || integrity.analyzeContent(row.content_html);
    out.uniqueWordCount = report.uniqueWordCount;
    out.integrity = integrity.publicReport(report);
  }
  return out;
}

async function getRawById(id) {
  const [rows] = await pool.execute('SELECT * FROM chapters WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function nextIdx(bookId) {
  const [rows] = await pool.execute('SELECT COALESCE(MAX(idx), 0) AS m FROM chapters WHERE book_id = ?', [bookId]);
  return Number(rows[0].m) + 1;
}

function parseScheduledPublishAt(value, { existing = null } = {}) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw errors.badRequest('Invalid scheduled publish time');
  const existingMs = existing ? new Date(existing).getTime() : null;
  const isUnchanged = existingMs != null && existingMs === d.getTime();
  if (!isUnchanged && d.getTime() <= Date.now()) {
    throw errors.badRequest('Scheduled publish time must be in the future');
  }
  return d;
}

function applyScheduleFields(body, { forceDraft = false, existingScheduledAt = null } = {}) {
  const patch = {};
  const hasScheduleField = Object.prototype.hasOwnProperty.call(body, 'scheduledPublishAt');

  if (body.status === 'published') {
    patch.status = 'published';
    patch.scheduled_publish_at = null;
    return patch;
  }

  if (hasScheduleField) {
    const scheduled = parseScheduledPublishAt(body.scheduledPublishAt, { existing: existingScheduledAt });
    patch.scheduled_publish_at = scheduled;
    if (scheduled) {
      patch.status = 'draft';
      return patch;
    }
  }

  if (forceDraft || body.status === 'draft') {
    patch.status = 'draft';
    if (hasScheduleField && body.scheduledPublishAt == null) {
      patch.scheduled_publish_at = null;
    }
  } else if (body.status != null) {
    patch.status = body.status;
  }

  return patch;
}

async function isUnlockedFor(userId, chapterId) {
  if (!userId) return false;
  const [rows] = await pool.execute(
    'SELECT 1 FROM chapter_unlocks WHERE user_id = ? AND chapter_id = ? LIMIT 1',
    [userId, chapterId],
  );
  return rows.length > 0;
}

async function listForBook(bookId, viewer) {
  const book = await booksService.getById(bookId);
  if (!book) throw errors.notFound('Book not found');

  const viewerRow = viewer ? await resolveUserRow(viewer.id) : null;
  const showDrafts = viewer && (isAdminOrStaff(viewer) || viewer.id === book.author_id);

  const where = ['book_id = ?', 'recycled_at IS NULL'];
  const params = [bookId];
  if (!showDrafts) {
    where.push("status = 'published'");
  }

  const [rows] = await pool.execute(
    `SELECT * FROM chapters WHERE ${where.join(' AND ')} ORDER BY idx ASC`,
    params,
  );

  let unlockedSet = new Set();
  if (viewer && rows.length) {
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const [u] = await pool.execute(
      `SELECT chapter_id FROM chapter_unlocks WHERE user_id = ? AND chapter_id IN (${placeholders})`,
      [viewer.id, ...ids],
    );
    unlockedSet = new Set(u.map((x) => x.chapter_id));
  }

  const entitlements = viewer && !showDrafts
    ? await readerEntitlements(viewer, bookId)
    : { pass: null, voucher: null, bundleVoucher: null };

  // Studio view: each chapter's unique words relative to every earlier
  // chapter, so the novel total matches the paid-chapter gate.
  const prior = showDrafts ? new Set() : null;
  return rows.map((r) => {
    const unlocked = unlockedSet.has(r.id);
    const canRead = canReadChapter(r, {
      viewer, bookAuthorId: book.author_id, unlocked, viewerRow, pass: entitlements.pass,
    });
    const chapter = rowToChapter(r, {
      includeContent: false,
      isUnlocked: unlocked,
      canRead,
      access: accessFacts(r, { unlocked, ...entitlements }),
    });
    if (prior) {
      const report = integrity.analyzeContent(r.content_html, { prior, priorLabel: 'an earlier chapter' });
      for (const s of report.shingles) prior.add(s);
      chapter.uniqueWordCount = report.uniqueWordCount;
      chapter.duplicatedWords = report.duplicatedWords;
    }
    return chapter;
  });
}

async function getById(id, viewer) {
  const row = await getRawById(id);
  if (!row || row.recycled_at) throw errors.notFound('Chapter not found');

  const book = await booksService.getById(row.book_id);
  if (!book || book.recycled_at) throw errors.notFound('Chapter not found');
  const viewerRow = viewer ? await resolveUserRow(viewer.id) : null;
  const isAuthor = viewer && (isAdminOrStaff(viewer) || viewer.id === book.author_id);

  if (viewerRow && !isAuthor) {
    assertRestriction(viewerRow, 'reading', 'Reading is restricted on your account');
  }
  if (row.status !== 'published' && !isAuthor) throw errors.notFound('Chapter not found');
  if (book.status !== 'published' && !isAuthor) throw errors.notFound('Chapter not found');
  if (!isAuthor) {
    assertMatureAccess({ warningNotice: book.warning_notice, authorId: book.author_id }, viewerRow);
  }

  let unlocked = false;
  if (viewer) unlocked = await isUnlockedFor(viewer.id, id);

  const entitlements = viewer && !isAuthor && isPaidChapter(row) && !unlocked
    ? await readerEntitlements(viewer, row.book_id)
    : { pass: null, voucher: null, bundleVoucher: null };

  const canRead = canReadChapter(row, {
    viewer, bookAuthorId: book.author_id, unlocked, viewerRow, pass: entitlements.pass,
  });

  return rowToChapter(row, {
    includeContent: canRead,
    isUnlocked: unlocked,
    canRead,
    withIntegrity: !!isAuthor,
    access: accessFacts(row, { unlocked, ...entitlements }),
  });
}

async function createInBook(bookId, body, user) {
  const userRow = await resolveUserRow(user.id);
  assertRestriction(userRow, 'publishing', 'Publishing is restricted on your account');

  const book = await booksService.getById(bookId);
  booksService.assertOwnerOrAdmin(book, user);

  const idx = body.idx != null ? body.idx : await nextIdx(bookId);
  const html = sanitizeChapterHtml(body.contentHtml || '');

  const thought = sanitizeAuthorThought(body.authorThought || '');
  const schedulePatch = applyScheduleFields(body, { existingScheduledAt: null });
  const chapterStatus = schedulePatch.status || body.status || 'draft';
  const scheduledAt = schedulePatch.scheduled_publish_at !== undefined
    ? schedulePatch.scheduled_publish_at
    : null;

  assertNamedForPublish(body.title, { status: chapterStatus, scheduledAt });

  const isPaid = !!body.isPaid;
  const goesLive = chapterStatus === 'published' || !!scheduledAt;
  // Repeated-text check against the rest of the novel (needed for the paid
  // gate, the price tier and the publish guard); drafts get the cheap in-chapter report.
  const { report } = (isPaid || goesLive)
    ? await inspectChapter(bookId, html)
    : { report: integrity.analyzeContent(html) };
  if (isPaid) await assertPaidAllowed(bookId, { contentHtml: html });
  if (goesLive) assertNotDuplicated(report);
  const tokenPrice = priceFor(isPaid, report);

  const [r] = await pool.execute(
    `INSERT INTO chapters (book_id, idx, title, content_html, author_thought, is_paid, token_price, status, scheduled_publish_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [bookId, idx, body.title, html, thought || null, isPaid ? 1 : 0, tokenPrice, chapterStatus, scheduledAt],
  );
  const created = await getRawById(r.insertId);
  if (created.status === 'published') notifyFollowersOfChapter(created);
  return rowToChapter(created, { includeContent: true, isUnlocked: true, canRead: true, integrityReport: report });
}

async function update(id, patch, user) {
  const userRow = await resolveUserRow(user.id);
  assertRestriction(userRow, 'publishing', 'Publishing is restricted on your account');

  const row = await getRawById(id);
  if (!row) throw errors.notFound('Chapter not found');
  const book = await booksService.getById(row.book_id);
  booksService.assertOwnerOrAdmin(book, user);

  const fields = [];
  const params = [];
  const nextTitle = patch.title != null
    ? String(patch.title).trim() || DEFAULT_CHAPTER_TITLE
    : row.title;
  if (patch.title != null) {
    fields.push('title = ?');
    params.push(nextTitle);
  }
  if (patch.contentHtml != null)   { fields.push('content_html = ?');  params.push(sanitizeChapterHtml(patch.contentHtml)); }
  if (patch.authorThought != null) {
    const t = sanitizeAuthorThought(patch.authorThought);
    fields.push('author_thought = ?');
    params.push(t || null);
  }
  if (patch.isPaid != null)        { fields.push('is_paid = ?');       params.push(patch.isPaid ? 1 : 0); }
  if (patch.idx != null)           { fields.push('idx = ?');           params.push(patch.idx); }

  const schedulePatch = applyScheduleFields(patch, { existingScheduledAt: row.scheduled_publish_at });
  if (schedulePatch.status != null) {
    fields.push('status = ?');
    params.push(schedulePatch.status);
  } else if (patch.status != null) {
    fields.push('status = ?');
    params.push(patch.status);
  }
  if (schedulePatch.scheduled_publish_at !== undefined) {
    fields.push('scheduled_publish_at = ?');
    params.push(schedulePatch.scheduled_publish_at);
  }

  // Validate against the state the chapter will be in after this write.
  const nextStatus = schedulePatch.status != null
    ? schedulePatch.status
    : (patch.status != null ? patch.status : row.status);
  const nextScheduledAt = schedulePatch.scheduled_publish_at !== undefined
    ? schedulePatch.scheduled_publish_at
    : row.scheduled_publish_at;
  assertNamedForPublish(nextTitle, { status: nextStatus, scheduledAt: nextScheduledAt });

  const nextIsPaid = patch.isPaid != null ? !!patch.isPaid : !!row.is_paid;
  const nextHtml = patch.contentHtml != null ? sanitizeChapterHtml(patch.contentHtml) : row.content_html;
  const goesLive = nextStatus === 'published' || !!nextScheduledAt;
  const contentChanged = patch.contentHtml != null && nextHtml !== row.content_html;
  const becomesLive = goesLive && (row.status !== 'published' && !row.scheduled_publish_at);
  // Novel-wide repeated-text report when it matters (paid pricing, going live,
  // live content edits); otherwise the cheap in-chapter report.
  const needsNovelReport = nextIsPaid || becomesLive || (goesLive && contentChanged);
  const { report } = needsNovelReport
    ? await inspectChapter(row.book_id, nextHtml, { excludeChapterId: id })
    : { report: integrity.analyzeContent(nextHtml) };
  if (nextIsPaid && !row.is_paid) {
    await assertPaidAllowed(row.book_id, { excludeChapterId: id, contentHtml: nextHtml });
  }
  if (becomesLive || (goesLive && contentChanged)) assertNotDuplicated(report);
  if (patch.isPaid != null || patch.contentHtml != null) {
    fields.push('token_price = ?');
    params.push(priceFor(nextIsPaid, report));
  }

  if (fields.length === 0) return rowToChapter(row, { includeContent: true, isUnlocked: true, canRead: true, integrityReport: report });
  params.push(id);
  await pool.execute(`UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`, params);
  const fresh = await getRawById(id);
  if (fresh.status === 'published' && row.status !== 'published') notifyFollowersOfChapter(fresh);
  return rowToChapter(fresh, { includeContent: true, isUnlocked: true, canRead: true, integrityReport: report });
}

// Soft delete: the chapter moves to the admin recycle bin instead of being dropped.
async function remove(id, user) {
  const userRow = await resolveUserRow(user.id);
  assertRestriction(userRow, 'publishing', 'Publishing is restricted on your account');

  const row = await getRawById(id);
  if (!row || row.recycled_at) throw errors.notFound('Chapter not found');
  const book = await booksService.getById(row.book_id);
  booksService.assertOwnerOrAdmin(book, user);
  const recycleSvc = require('./recycle.service');
  await recycleSvc.recycleChapter(id, user);
  return { ok: true };
}

module.exports = {
  listForBook, getById, createInBook, update, remove,
  rowToChapter, getRawById, notifyFollowersOfChapter,
  DEFAULT_CHAPTER_TITLE, isUnnamedTitle, bookWordCount,
};
