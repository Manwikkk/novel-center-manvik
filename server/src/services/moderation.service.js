'use strict';

// Moderation queue: reader reports on comments / reviews (comment_reports)
// and on novels (book_reports), grouped per reported target.

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');
const { assertCapability } = require('../constants/adminPermissions');
const { suspensionMeta } = require('./suspension.service');
const auditSvc = require('./audit.service');

const RESOLUTIONS = new Set(['dismissed', 'actioned']);

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_e) {
    return fallback;
  }
}

function reportedUser(row, prefix) {
  return {
    id: row[`${prefix}_id`],
    displayName: row[`${prefix}_display_name`],
    email: row[`${prefix}_email`],
    avatarUrl: row[`${prefix}_avatar_url`],
    role: row[`${prefix}_role`],
    status: row[`${prefix}_status`],
    ...suspensionMeta({
      suspension_type: row[`${prefix}_suspension_type`],
      suspended_until: row[`${prefix}_suspended_until`],
      suspension_restrictions: row[`${prefix}_suspension_restrictions`],
    }),
  };
}

// Reviews are top-level book comments carrying star ratings.
const REVIEW_CASE = `CASE WHEN c.review_ratings IS NOT NULL AND c.chapter_id IS NULL AND c.parent_id IS NULL
                          THEN 'review' ELSE 'comment' END`;

async function listQueue({ kind = 'all', status = 'open', page, pageSize } = {}) {
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 20,
    max: 50,
  });

  const parts = [];
  const params = [];
  if (kind === 'all' || kind === 'comment' || kind === 'review') {
    let sql = `SELECT ${REVIEW_CASE} AS kind, r.comment_id AS target_id,
                      COUNT(*) AS report_count, MAX(r.created_at) AS latest_report_at,
                      MIN(r.created_at) AS first_report_at
                 FROM comment_reports r
                 JOIN comments c ON c.id = r.comment_id
                WHERE r.status = ?
                GROUP BY r.comment_id, kind`;
    params.push(status);
    if (kind !== 'all') {
      sql = `SELECT * FROM (${sql}) ck WHERE ck.kind = ?`;
      params.push(kind);
    }
    parts.push(sql);
  }
  if (kind === 'all' || kind === 'book') {
    parts.push(`SELECT 'book' AS kind, r.book_id AS target_id,
                       COUNT(*) AS report_count, MAX(r.created_at) AS latest_report_at,
                       MIN(r.created_at) AS first_report_at
                  FROM book_reports r
                 WHERE r.status = ?
                 GROUP BY r.book_id`);
    params.push(status);
  }
  const union = parts.map((p) => `(${p})`).join(' UNION ALL ');

  const [heads] = await pool.execute(
    `SELECT * FROM (${union}) q ORDER BY q.latest_report_at DESC, q.target_id DESC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM (${union}) q`, params);

  const commentIds = heads.filter((h) => h.kind !== 'book').map((h) => Number(h.target_id));
  const bookIds = heads.filter((h) => h.kind === 'book').map((h) => Number(h.target_id));

  const comments = new Map();
  const commentReports = new Map();
  if (commentIds.length) {
    const ph = commentIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT c.id, c.body, c.status, c.is_spoiler, c.review_ratings, c.chapter_id, c.parent_id,
              c.created_at,
              COALESCE(b.id, bc.id) AS book_id, COALESCE(b.title, bc.title) AS book_title,
              COALESCE(b.slug, bc.slug) AS book_slug,
              ch.idx AS chapter_idx, ch.title AS chapter_title,
              u.id AS author_id, u.display_name AS author_display_name, u.email AS author_email,
              u.avatar_url AS author_avatar_url, u.role AS author_role, u.status AS author_status,
              u.suspension_type AS author_suspension_type, u.suspended_until AS author_suspended_until,
              u.suspension_restrictions AS author_suspension_restrictions
         FROM comments c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN books b ON b.id = c.book_id
         LEFT JOIN chapters ch ON ch.id = c.chapter_id
         LEFT JOIN books bc ON bc.id = ch.book_id
        WHERE c.id IN (${ph})`,
      commentIds,
    );
    for (const r of rows) comments.set(Number(r.id), r);

    const [reps] = await pool.execute(
      `SELECT r.id, r.comment_id AS target_id, r.reason, r.details, r.created_at, r.status, r.resolution,
              u.id AS reporter_id, u.display_name AS reporter_name
         FROM comment_reports r
         JOIN users u ON u.id = r.user_id
        WHERE r.comment_id IN (${ph}) AND r.status = ?
        ORDER BY r.created_at DESC`,
      [...commentIds, status],
    );
    for (const r of reps) {
      const list = commentReports.get(Number(r.target_id)) || [];
      list.push(r);
      commentReports.set(Number(r.target_id), list);
    }
  }

  const books = new Map();
  const bookReports = new Map();
  if (bookIds.length) {
    const ph = bookIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT b.id, b.title, b.slug, b.cover_url, b.status, b.recycled_at,
              u.id AS author_id, u.display_name AS author_display_name, u.email AS author_email,
              u.avatar_url AS author_avatar_url, u.role AS author_role, u.status AS author_status,
              u.suspension_type AS author_suspension_type, u.suspended_until AS author_suspended_until,
              u.suspension_restrictions AS author_suspension_restrictions
         FROM books b
         JOIN users u ON u.id = b.author_id
        WHERE b.id IN (${ph})`,
      bookIds,
    );
    for (const r of rows) books.set(Number(r.id), r);

    const [reps] = await pool.execute(
      `SELECT r.id, r.book_id AS target_id, r.reason, r.details, r.created_at, r.status, r.resolution,
              u.id AS reporter_id, u.display_name AS reporter_name
         FROM book_reports r
         JOIN users u ON u.id = r.user_id
        WHERE r.book_id IN (${ph}) AND r.status = ?
        ORDER BY r.created_at DESC`,
      [...bookIds, status],
    );
    for (const r of reps) {
      const list = bookReports.get(Number(r.target_id)) || [];
      list.push(r);
      bookReports.set(Number(r.target_id), list);
    }
  }

  const mapReport = (r) => ({
    id: r.id,
    reason: r.reason,
    details: r.details,
    status: r.status,
    resolution: r.resolution,
    createdAt: r.created_at,
    reporter: { id: r.reporter_id, displayName: r.reporter_name },
  });

  const items = [];
  for (const h of heads) {
    const targetId = Number(h.target_id);
    const base = {
      kind: h.kind,
      targetId,
      reportCount: Number(h.report_count) || 0,
      latestReportAt: h.latest_report_at,
      firstReportAt: h.first_report_at,
    };
    if (h.kind === 'book') {
      const b = books.get(targetId);
      if (!b) continue;
      items.push({
        ...base,
        reports: (bookReports.get(targetId) || []).map(mapReport),
        reasons: [...new Set((bookReports.get(targetId) || []).map((r) => r.reason))],
        book: {
          id: b.id,
          title: b.title,
          slug: b.slug,
          coverUrl: b.cover_url,
          status: b.status,
          recycled: !!b.recycled_at,
        },
        author: reportedUser(b, 'author'),
      });
    } else {
      const c = comments.get(targetId);
      if (!c) continue;
      items.push({
        ...base,
        reports: (commentReports.get(targetId) || []).map(mapReport),
        reasons: [...new Set((commentReports.get(targetId) || []).map((r) => r.reason))],
        comment: {
          id: c.id,
          body: c.body,
          status: c.status,
          isSpoiler: Number(c.is_spoiler) === 1,
          reviewRatings: parseJson(c.review_ratings, null),
          parentId: c.parent_id,
          chapterId: c.chapter_id,
          chapterIdx: c.chapter_idx,
          chapterTitle: c.chapter_title,
          bookId: c.book_id,
          bookTitle: c.book_title,
          bookSlug: c.book_slug,
          createdAt: c.created_at,
        },
        author: reportedUser(c, 'author'),
      });
    }
  }

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    total: Number(countRows[0].total) || 0,
    kind,
    status,
  };
}

// Marks every open report on one target as handled.
async function resolveReports({ kind, targetId, resolution = 'dismissed' }, actor, actorPermissions) {
  assertCapability(actor, actorPermissions, 'comments.moderate', 'Cannot resolve reports');
  if (!RESOLUTIONS.has(resolution)) throw errors.badRequest('Invalid resolution');

  const table = kind === 'book' ? 'book_reports' : 'comment_reports';
  const column = kind === 'book' ? 'book_id' : 'comment_id';
  const [result] = await pool.execute(
    `UPDATE ${table}
        SET status = 'resolved', resolution = ?, resolved_by = ?, resolved_at = NOW()
      WHERE ${column} = ? AND status = 'open'`,
    [resolution, actor.id, targetId],
  );
  const resolved = result.affectedRows || 0;
  if (!resolved) throw errors.notFound('No open reports for this item');

  await auditSvc.logAction({
    actor,
    action: 'report.resolve',
    targetType: kind,
    targetId,
    summary: `${resolution === 'actioned' ? 'Actioned' : 'Dismissed'} ${resolved} report(s) on ${kind} #${targetId}`,
    meta: { resolution, resolved },
  });

  return { ok: true, kind, targetId, resolution, resolved };
}

module.exports = { listQueue, resolveReports };
