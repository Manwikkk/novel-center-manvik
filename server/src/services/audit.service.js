'use strict';

const pool = require('../db/pool');
const { clampPagination } = require('../utils/pagination');

async function logAction({
  actor,
  action,
  targetType = null,
  targetId = null,
  summary,
  meta = null,
}) {
  if (!actor?.id) return null;
  const [r] = await pool.execute(
    `INSERT INTO admin_audit_log
       (actor_id, actor_email, actor_role, staff_role, action, target_type, target_id, summary, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      actor.id,
      actor.email || '',
      actor.role || 'user',
      actor.staffRole || null,
      action,
      targetType,
      targetId,
      String(summary || '').slice(0, 500),
      meta ? JSON.stringify(meta) : null,
    ],
  );
  return r.insertId;
}

async function listLogs({ q, action, page, pageSize }) {
  const where = [];
  const params = [];
  if (q) {
    where.push('(a.summary LIKE ? OR a.actor_email LIKE ? OR a.action LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (action) {
    where.push('a.action = ?');
    params.push(action);
  }

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT a.*
       FROM admin_audit_log a
       ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );
  const [c] = await pool.execute(
    `SELECT COUNT(*) AS total FROM admin_audit_log a ${whereSql}`,
    params,
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      actorRole: r.actor_role,
      staffRole: r.staff_role,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      summary: r.summary,
      meta: r.meta ? (typeof r.meta === 'string' ? JSON.parse(r.meta) : r.meta) : null,
      createdAt: r.created_at,
    })),
    page: safePage,
    pageSize: safePageSize,
    total: Number(c[0].total),
  };
}

module.exports = { logAction, listLogs };
