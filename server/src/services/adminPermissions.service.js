'use strict';

const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { hashPassword } = require('../utils/hash');
const { errors } = require('../utils/HttpError');
const { sanitizePermissions, ALL_PERMISSION_KEYS } = require('../constants/adminPermissions');
const { isValidStaffRole, permissionsForStaffRole } = require('../constants/staffRoles');
const { publicUser } = require('../utils/publicUser');
const auditSvc = require('./audit.service');
const emailSvc = require('./email.service');
const passwordResetSvc = require('./passwordReset.service');
const { STAFF_ROLE_TEMPLATES } = require('../constants/staffRoles');

async function getStaffMeta(userId) {
  const [rows] = await pool.execute(
    'SELECT id, staff_role FROM users WHERE id = ? AND role = ? LIMIT 1',
    [userId, 'staff'],
  );
  return rows[0] || null;
}

async function getUserPermissions(userId) {
  const [rows] = await pool.execute(
    'SELECT permission FROM admin_permissions WHERE user_id = ? ORDER BY permission ASC',
    [userId],
  );
  return rows.map((r) => r.permission);
}

async function setUserPermissions(conn, userId, permissions) {
  const safe = sanitizePermissions(permissions);
  await conn.execute('DELETE FROM admin_permissions WHERE user_id = ?', [userId]);
  for (const permission of safe) {
    await conn.execute(
      'INSERT INTO admin_permissions (user_id, permission) VALUES (?, ?)',
      [userId, permission],
    );
  }
  return safe;
}

async function listStaffUsers() {
  const [rows] = await pool.execute(
    `SELECT u.*
       FROM users u
      WHERE u.role = 'staff'
      ORDER BY u.created_at DESC`,
  );
  const items = [];
  for (const row of rows) {
    const permissions = await getUserPermissions(row.id);
    items.push({ ...publicUser(row), permissions });
  }
  return { items };
}

async function createStaffUser({ email, password, displayName, permissions, staffRole }, actor = null) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) throw errors.badRequest('Email is required');

  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
  if (existing[0]) throw errors.conflict('Email already registered');

  let safePerms = sanitizePermissions(permissions);
  const roleKey = staffRole && isValidStaffRole(staffRole) ? staffRole : null;
  if (roleKey && (!permissions || !permissions.length)) {
    safePerms = sanitizePermissions(permissionsForStaffRole(roleKey));
  }
  if (safePerms.length === 0) throw errors.badRequest('Select at least one permission');

  const password_hash = await hashPassword(password);

  const created = await withTransaction(async (conn) => {
    const [r] = await conn.execute(
      'INSERT INTO users (email, password_hash, display_name, role, staff_role) VALUES (?, ?, ?, ?, ?)',
      [normalizedEmail, password_hash, displayName, 'staff', roleKey],
    );
    const userId = r.insertId;
    await conn.execute('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [userId]);
    const savedPerms = await setUserPermissions(conn, userId, safePerms);
    const invite = await passwordResetSvc.issueToken(userId, {
      purpose: 'invite',
      ttlHours: passwordResetSvc.INVITE_TTL_HOURS,
      conn,
    });
    const [rows] = await conn.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    const user = { ...publicUser(rows[0]), permissions: savedPerms };
    if (actor) {
      await auditSvc.logAction({
        actor: { ...actor, staffRole: actor.staffRole },
        action: 'staff.create',
        targetType: 'user',
        targetId: userId,
        summary: `Created staff account ${displayName} (${roleKey || 'custom'})`,
        meta: { staffRole: roleKey, permissions: savedPerms },
      });
    }
    return { user, invite };
  });

  // Tell the new staff member how to get in; a failed email never undoes the account.
  let emailSent = false;
  try {
    const result = await emailSvc.sendStaffInviteEmail({
      to: normalizedEmail,
      displayName,
      roleLabel: roleKey ? STAFF_ROLE_TEMPLATES[roleKey]?.label : null,
      token: created.invite.token,
      ttlHours: created.invite.ttlHours,
    });
    emailSent = Boolean(result?.sent);
  } catch (err) {
    console.error('[email] staff invite send failed:', err.message);
  }
  return { user: created.user, emailSent, emailConfigured: emailSvc.isConfigured() };
}

async function updateStaffUser(id, patch, actor = null) {
  const [u] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  const row = u[0];
  if (!row) throw errors.notFound('Staff user not found');
  if (row.role !== 'staff') throw errors.badRequest('User is not a staff account');

  return withTransaction(async (conn) => {
    const fields = [];
    const params = [];

    if (patch.displayName !== undefined) {
      fields.push('display_name = ?');
      params.push(patch.displayName);
    }
    if (patch.status) {
      fields.push('status = ?');
      params.push(patch.status);
    }
    if (patch.staffRole !== undefined) {
      const roleKey = patch.staffRole && isValidStaffRole(patch.staffRole) ? patch.staffRole : null;
      fields.push('staff_role = ?');
      params.push(roleKey);
    }
    if (patch.password) {
      fields.push('password_hash = ?');
      params.push(await hashPassword(patch.password));
    }
    if (fields.length) {
      params.push(id);
      await conn.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    let savedPerms;
    if (patch.permissions !== undefined) {
      savedPerms = await setUserPermissions(conn, id, patch.permissions);
      if (savedPerms.length === 0) throw errors.badRequest('Select at least one permission');
    } else if (patch.staffRole && isValidStaffRole(patch.staffRole)) {
      savedPerms = await setUserPermissions(conn, id, permissionsForStaffRole(patch.staffRole));
    } else {
      savedPerms = await getUserPermissions(id);
    }

    const [rows] = await conn.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    const user = { ...publicUser(rows[0]), permissions: savedPerms };
    if (actor) {
      await auditSvc.logAction({
        actor: { ...actor, staffRole: actor.staffRole },
        action: 'staff.update',
        targetType: 'user',
        targetId: id,
        summary: `Updated staff account ${user.displayName}`,
        meta: {
          staffRole: user.staffRole,
          status: patch.status,
          permissions: savedPerms,
        },
      });
    }
    return { user };
  });
}

async function permissionsForAuthUser(row) {
  if (row.role === 'admin') return ALL_PERMISSION_KEYS;
  if (row.role === 'staff') return getUserPermissions(row.id);
  return null;
}

module.exports = {
  getStaffMeta,
  getUserPermissions,
  setUserPermissions,
  listStaffUsers,
  createStaffUser,
  updateStaffUser,
  permissionsForAuthUser,
};
