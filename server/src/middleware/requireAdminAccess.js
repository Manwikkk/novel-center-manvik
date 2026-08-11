'use strict';

const { errors } = require('../utils/HttpError');
const permSvc = require('../services/adminPermissions.service');
const { hasCapability } = require('../constants/adminPermissions');

function requireAdminPanel() {
  return (req, _res, next) => {
    if (!req.user) return next(errors.unauthorized());
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return next(errors.forbidden('Admin access required'));
    }
    return next();
  };
}

function requireSuperAdmin() {
  return (req, _res, next) => {
    if (!req.user) return next(errors.unauthorized());
    if (req.user.role !== 'admin') return next(errors.forbidden('Super admin required'));
    return next();
  };
}

async function loadAdminPermissions(req, _res, next) {
  try {
    if (req.user?.role === 'staff') {
      req.adminPermissions = await permSvc.getUserPermissions(req.user.id);
      const row = await permSvc.getStaffMeta(req.user.id);
      req.staffRole = row?.staff_role || null;
      req.user.staffRole = req.staffRole;
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireAdminPermission(permission) {
  return (req, _res, next) => {
    if (!req.user) return next(errors.unauthorized());
    if (req.user.role === 'admin') return next();
    if (req.user.role !== 'staff') return next(errors.forbidden('Insufficient role'));
    const perms = req.adminPermissions || [];
    const allowed = perms.includes(permission)
      || (permission === 'novels' && perms.includes('books'))
      || (permission === 'books' && perms.includes('novels'));
    if (!allowed) {
      return next(errors.forbidden('Insufficient permission'));
    }
    return next();
  };
}

function requireAdminCapability(capability) {
  return (req, _res, next) => {
    if (!req.user) return next(errors.unauthorized());
    if (req.user.role === 'admin') return next();
    if (req.user.role !== 'staff') return next(errors.forbidden('Insufficient role'));
    const perms = req.adminPermissions || [];
    if (!hasCapability(perms, capability)) {
      return next(errors.forbidden('Insufficient permission'));
    }
    return next();
  };
}

module.exports = {
  requireAdminPanel,
  requireSuperAdmin,
  loadAdminPermissions,
  requireAdminPermission,
  requireAdminCapability,
};
