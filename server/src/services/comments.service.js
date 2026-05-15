'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { sanitizeCommentBody } = require('../utils/htmlSanitize');
const { clampPagination } = require('../utils/pagination');

const SORT_KEYS = new Set(['oldest', 'newest', 'likes', 'dislikes']);

function rowToComment(row, vote = {}) {
  const likeCount = vote.likeCount != null ? vote.likeCount : Number(row.like_count) || 0;
  const dislikeCount = vote.dislikeCount != null ? vote.dislikeCount : Number(row.dislike_count) || 0;
  const myReaction = vote.myReaction !== undefined ? vote.myReaction : row.my_reaction || null;
  const isSpoiler = Boolean(Number(row.is_spoiler ?? 0));

  return {
    id: row.id,
    bookId: row.book_id,
    chapterId: row.chapter_id,
    userId: row.user_id,
    parentId: row.parent_id,
    body: row.status === 'visible' ? row.body : row.status === 'deleted' ? null : row.body,
    status: row.status,
    isSpoiler,
    likeCount,
    dislikeCount,
    myReaction,
    author: row.display_name ? { id: row.user_id, displayName: row.display_name, avatarUrl: row.avatar_url } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function scopeWhere(alias, bookId, chapterId) {
  if (chapterId) return { clause: `${alias}.chapter_id = ?`, params: [chapterId] };
  return { clause: `${alias}.book_id = ? AND ${alias}.chapter_id IS NULL`, params: [bookId] };
}

function visibilityWhere(alias, viewer) {
  if (!viewer || viewer.role !== 'admin') return { clause: `${alias}.status <> 'hidden'`, params: [] };
  return { clause: '1=1', params: [] };
}

function orderClauseForRoots(sort) {
  if (sort === 'newest') return 'c.created_at DESC';
  if (sort === 'likes') return 'COALESCE(ra.like_cnt, 0) DESC, c.created_at ASC';
  if (sort === 'dislikes') return 'COALESCE(ra.dislike_cnt, 0) DESC, c.created_at ASC';
  return 'c.created_at ASC';
}

async function fetchVoteMap(commentIds, viewerId) {
  const map = new Map();
  if (!commentIds.length) return map;
  const ph = commentIds.map(() => '?').join(',');
  const [agg] = await pool.execute(
    `SELECT comment_id,
            SUM(CASE WHEN reaction = 'like' THEN 1 ELSE 0 END)    AS like_cnt,
            SUM(CASE WHEN reaction = 'dislike' THEN 1 ELSE 0 END) AS dislike_cnt
       FROM comment_reactions
      WHERE comment_id IN (${ph})
      GROUP BY comment_id`,
    commentIds,
  );
  for (const row of agg) {
    map.set(Number(row.comment_id), {
      likeCount: Number(row.like_cnt) || 0,
      dislikeCount: Number(row.dislike_cnt) || 0,
      myReaction: null,
    });
  }
  if (viewerId) {
    const [mine] = await pool.execute(
      `SELECT comment_id, reaction FROM comment_reactions WHERE user_id = ? AND comment_id IN (${ph})`,
      [viewerId, ...commentIds],
    );
    for (const m of mine) {
      const id = Number(m.comment_id);
      const cur = map.get(id) || { likeCount: 0, dislikeCount: 0, myReaction: null };
      cur.myReaction = m.reaction;
      map.set(id, cur);
    }
  }
  for (const id of commentIds) {
    if (!map.has(id)) map.set(id, { likeCount: 0, dislikeCount: 0, myReaction: null });
  }
  return map;
}

/** Breadth-first load: roots + all descendants under the same book/chapter scope. */
async function fetchSubtreeRows(rootIds, bookId, chapterId, viewer) {
  if (!rootIds.length) return [];
  const sc = scopeWhere('c', bookId, chapterId);
  const vis = visibilityWhere('c', viewer);
  const baseParams = [...sc.params, ...vis.params];

  const byId = new Map();
  let frontier = [...rootIds];

  const ph0 = frontier.map(() => '?').join(',');
  const [rootRows] = await pool.execute(
    `SELECT c.*, u.display_name, u.avatar_url
       FROM comments c
       JOIN users u ON u.id = c.user_id
      WHERE c.id IN (${ph0})
        AND ${sc.clause}
        AND ${vis.clause}`,
    [...frontier, ...baseParams],
  );
  for (const r of rootRows) byId.set(Number(r.id), r);

  while (frontier.length) {
    const ph = frontier.map(() => '?').join(',');
    const [children] = await pool.execute(
      `SELECT c.*, u.display_name, u.avatar_url
         FROM comments c
         JOIN users u ON u.id = c.user_id
        WHERE c.parent_id IN (${ph})
          AND ${sc.clause}
          AND ${vis.clause}`,
      [...frontier, ...baseParams],
    );
    frontier = [];
    for (const r of children) {
      const id = Number(r.id);
      if (!byId.has(id)) {
        byId.set(id, r);
        frontier.push(id);
      }
    }
  }

  return Array.from(byId.values());
}

async function list({ bookId, chapterId, page, pageSize, sort }, viewer) {
  const sortKey = SORT_KEYS.has(String(sort)) ? String(sort) : 'oldest';
  const sc = scopeWhere('c', bookId, chapterId);
  const vis = visibilityWhere('c', viewer);
  const rootConj = ['c.parent_id IS NULL', sc.clause, vis.clause];
  const rootParams = [...sc.params, ...vis.params];

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, { max: 50, defaultSize: 5 });

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS n FROM comments c WHERE ${rootConj.join(' AND ')}`,
    rootParams,
  );
  const totalRoots = Number(countRows[0].n) || 0;

  const orderSql = orderClauseForRoots(sortKey);
  const [rootIdRows] = await pool.execute(
    `SELECT c.id
       FROM comments c
       LEFT JOIN (
            SELECT comment_id,
                   SUM(CASE WHEN reaction = 'like' THEN 1 ELSE 0 END)    AS like_cnt,
                   SUM(CASE WHEN reaction = 'dislike' THEN 1 ELSE 0 END) AS dislike_cnt
              FROM comment_reactions
             GROUP BY comment_id
            ) ra ON ra.comment_id = c.id
      WHERE ${rootConj.join(' AND ')}
   ORDER BY ${orderSql}
      LIMIT ${safePageSize} OFFSET ${offset}`,
    rootParams,
  );

  const rootIds = rootIdRows.map((r) => Number(r.id));
  const rawRows = await fetchSubtreeRows(rootIds, bookId, chapterId, viewer);
  const allIds = rawRows.map((r) => Number(r.id));
  const voteMap = await fetchVoteMap(allIds, viewer && viewer.id);

  const items = rawRows.map((row) => rowToComment(row, voteMap.get(Number(row.id)) || {}));

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    totalRoots,
    sort: sortKey,
    hasMore: safePage * safePageSize < totalRoots,
  };
}

async function getById(id, viewer) {
  const [rows] = await pool.execute(
    `SELECT c.*, u.display_name, u.avatar_url
       FROM comments c
       JOIN users u ON u.id = c.user_id
      WHERE c.id = ? LIMIT 1`,
    [id],
  );
  if (!rows[0]) return null;
  const voteMap = await fetchVoteMap([id], viewer && viewer.id);
  return rowToComment(rows[0], voteMap.get(id) || {});
}

async function create({ bookId, chapterId, parentId, body, isSpoiler }, userId) {
  const clean = sanitizeCommentBody(body);
  if (!clean) throw errors.badRequest('Comment body is empty after sanitization');
  const spoiler = Boolean(isSpoiler);

  if (chapterId) {
    const [r] = await pool.execute('SELECT book_id FROM chapters WHERE id = ? LIMIT 1', [chapterId]);
    if (!r[0]) throw errors.notFound('Chapter not found');
    bookId = r[0].book_id;
  } else if (bookId) {
    const [r] = await pool.execute('SELECT id FROM books WHERE id = ? LIMIT 1', [bookId]);
    if (!r[0]) throw errors.notFound('Book not found');
  }

  if (parentId) {
    const [r] = await pool.execute(
      'SELECT id, book_id, chapter_id FROM comments WHERE id = ? LIMIT 1',
      [parentId],
    );
    if (!r[0]) throw errors.notFound('Parent comment not found');
    if (r[0].book_id !== bookId || (chapterId || null) !== (r[0].chapter_id || null)) {
      throw errors.badRequest('Parent comment is on a different target');
    }
  }

  const [ins] = await pool.execute(
    `INSERT INTO comments (book_id, chapter_id, user_id, parent_id, body, is_spoiler, status)
     VALUES (?, ?, ?, ?, ?, ?, 'visible')`,
    [bookId, chapterId || null, userId, parentId || null, clean, spoiler ? 1 : 0],
  );
  return getById(ins.insertId, { id: userId });
}

async function update(id, body, user) {
  const c = await getById(id, user);
  if (!c) throw errors.notFound('Comment not found');
  if (user.role !== 'admin' && c.userId !== user.id) throw errors.forbidden();
  const clean = sanitizeCommentBody(body);
  if (!clean) throw errors.badRequest('Comment body is empty after sanitization');
  await pool.execute('UPDATE comments SET body = ? WHERE id = ?', [clean, id]);
  return getById(id, user);
}

async function remove(id, user) {
  const c = await getById(id, user);
  if (!c) throw errors.notFound('Comment not found');
  if (user.role !== 'admin' && c.userId !== user.id) throw errors.forbidden();
  await pool.execute("UPDATE comments SET status = 'deleted', body = '' WHERE id = ?", [id]);
  return { ok: true };
}

async function moderate(id, status) {
  if (!['visible', 'hidden', 'deleted'].includes(status)) throw errors.badRequest('Invalid status');
  const c = await getById(id, null);
  if (!c) throw errors.notFound('Comment not found');
  await pool.execute('UPDATE comments SET status = ? WHERE id = ?', [status, id]);
  return getById(id, null);
}

async function setReaction(commentId, userId, reaction) {
  if (reaction !== null && reaction !== 'like' && reaction !== 'dislike') {
    throw errors.badRequest('reaction must be "like", "dislike", or null');
  }
  const [rows] = await pool.execute('SELECT id FROM comments WHERE id = ? LIMIT 1', [commentId]);
  if (!rows[0]) throw errors.notFound('Comment not found');

  if (reaction == null) {
    await pool.execute('DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ?', [commentId, userId]);
  } else {
    await pool.execute(
      `INSERT INTO comment_reactions (comment_id, user_id, reaction) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)`,
      [commentId, userId, reaction],
    );
  }

  const voteMap = await fetchVoteMap([commentId], userId);
  const v = voteMap.get(commentId) || { likeCount: 0, dislikeCount: 0, myReaction: null };
  return {
    commentId,
    likeCount: v.likeCount,
    dislikeCount: v.dislikeCount,
    myReaction: v.myReaction,
  };
}

module.exports = { list, getById, create, update, remove, moderate, setReaction };
