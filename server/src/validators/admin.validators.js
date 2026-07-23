'use strict';

const Joi = require('joi');
const { ALL_PERMISSION_KEYS } = require('../constants/adminPermissions');
const { STAFF_ROLE_KEYS } = require('../constants/staffRoles');

const permissionSchema = Joi.string().valid(...ALL_PERMISSION_KEYS);

module.exports = {
  listUsers: {
    query: Joi.object({
      q: Joi.string().trim().max(120),
      role: Joi.string().valid('admin', 'author', 'user'),
      status: Joi.string().valid('active', 'suspended'),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
  updateUser: {
    body: Joi.object({
      role: Joi.string().valid('admin', 'author', 'user'),
      status: Joi.string().valid('active', 'suspended'),
      suspensionType: Joi.string().valid('permanent', 'temporary'),
      restrictions: Joi.object({
        portal_access: Joi.boolean(),
        reading: Joi.boolean(),
        commenting: Joi.boolean(),
        publishing: Joi.boolean(),
      }).min(1),
      removeRestrictions: Joi.array().items(
        Joi.string().valid('portal_access', 'reading', 'commenting', 'publishing'),
      ).min(1),
      walletDelta: Joi.number().integer().invalid(0),
    }).min(1).custom((value, helpers) => {
      if (value.removeRestrictions?.length && value.status === 'active') {
        return helpers.message('Use removeRestrictions or status active, not both');
      }
      if (value.status === 'suspended') {
        if (!value.suspensionType) {
          return helpers.message('suspensionType is required when suspending a user');
        }
        if (!value.restrictions) {
          return helpers.message('restrictions are required when suspending a user');
        }
        const selected = Object.values(value.restrictions).some(Boolean);
        if (!selected) {
          return helpers.message('Select at least one restriction');
        }
      }
      return value;
    }),
  },
  patchAdminSettings: {
    body: Joi.object({
      temporaryBanDays: Joi.number().integer().min(1).max(365),
    }).min(1),
  },
  createStaffUser: {
    body: Joi.object({
      email: Joi.string().email().max(190).required(),
      password: Joi.string().min(8).max(128).required(),
      displayName: Joi.string().trim().min(1).max(120).required(),
      staffRole: Joi.string().valid(...STAFF_ROLE_KEYS),
      permissions: Joi.array().items(permissionSchema),
    }).custom((value, helpers) => {
      if (!value.staffRole && (!value.permissions || !value.permissions.length)) {
        return helpers.message('Select a staff role or at least one permission');
      }
      return value;
    }),
  },
  updateStaffUser: {
    body: Joi.object({
      displayName: Joi.string().trim().min(1).max(120),
      password: Joi.string().min(8).max(128),
      status: Joi.string().valid('active', 'suspended'),
      staffRole: Joi.string().valid(...STAFF_ROLE_KEYS),
      permissions: Joi.array().items(permissionSchema).min(1),
    }).min(1),
  },
  listRecycle: {
    query: Joi.object({
      q: Joi.string().trim().max(120),
      entityType: Joi.string().valid('book', 'chapter'),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
  listAuditLogs: {
    query: Joi.object({
      q: Joi.string().trim().max(120),
      action: Joi.string().trim().max(64),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(30),
    }),
  },
  listBooks: {
    query: Joi.object({
      q: Joi.string().trim().max(120),
      status: Joi.string().valid('draft', 'published', 'archived'),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
  listTransactions: {
    query: Joi.object({
      type: Joi.string().valid('purchase', 'unlock', 'admin_adjust'),
      userId: Joi.number().integer().positive(),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
  listComments: {
    query: Joi.object({
      status: Joi.string().valid('visible', 'hidden', 'deleted'),
      bookId: Joi.number().integer().positive(),
      chapterId: Joi.number().integer().positive(),
      chapterNull: Joi.boolean().truthy('1', 'true').falsy('0', 'false'),
      order: Joi.string().valid('asc', 'desc').default('asc'),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
  commentsByBook: {
    query: Joi.object({
      q: Joi.string().trim().max(120),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(60).default(12),
    }),
  },
  commentsByChapter: {
    query: Joi.object({
      bookId: Joi.number().integer().positive().required(),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(50),
    }),
  },
  moderateComment: {
    body: Joi.object({
      status: Joi.string().valid('visible', 'hidden', 'deleted').required(),
    }),
  },
  patchPageSections: {
    body: Joi.object({
      weekly_book: Joi.boolean(),
      meet_webnovel: Joi.boolean(),
      recommended: Joi.boolean(),
      new_arrivals: Joi.boolean(),
      ranking_novels: Joi.boolean(),
      updated_today: Joi.boolean(),
      completed_novels: Joi.boolean(),
      editors_choice: Joi.boolean(),
      gs_originals: Joi.boolean(),
    }).min(1),
  },
  createCampaign: {
    body: Joi.object({
      name: Joi.string().trim().min(1).max(160).required(),
      campaignType: Joi.string().trim().max(64).default('promo'),
      startAt: Joi.date().iso().allow(null),
      endAt: Joi.date().iso().allow(null),
      status: Joi.string().valid('draft', 'active', 'ended').default('active'),
    }),
  },
  createCoupon: {
    body: Joi.object({
      code: Joi.string().trim().min(2).max(64).required(),
      name: Joi.string().trim().min(1).max(160).required(),
      discountType: Joi.string().valid('percent', 'fixed').default('percent'),
      discountValue: Joi.number().min(0).required(),
      campaignId: Joi.number().integer().positive().allow(null),
      startAt: Joi.date().iso().allow(null),
      endAt: Joi.date().iso().allow(null),
      status: Joi.string().valid('active', 'inactive', 'expired').default('active'),
    }),
  },
  updateCoupon: {
    body: Joi.object({
      name: Joi.string().trim().min(1).max(160),
      discountType: Joi.string().valid('percent', 'fixed'),
      discountValue: Joi.number().min(0),
      campaignId: Joi.number().integer().positive().allow(null),
      startAt: Joi.date().iso().allow(null),
      endAt: Joi.date().iso().allow(null),
      status: Joi.string().valid('active', 'inactive', 'expired'),
    }).min(1),
  },
  createRefund: {
    body: Joi.object({
      paymentOrderId: Joi.number().integer().positive().required(),
      refundAmount: Joi.number().positive(),
      reason: Joi.string().trim().max(500).allow('', null),
      gatewayReference: Joi.string().trim().max(120).allow('', null),
      notes: Joi.string().trim().max(500).allow('', null),
    }),
  },
  generatePayout: {
    body: Joi.object({
      authorId: Joi.number().integer().positive().required(),
      periodStart: Joi.date().iso().required(),
      periodEnd: Joi.date().iso().required(),
    }),
  },
  updatePayout: {
    body: Joi.object({
      status: Joi.string().valid('draft', 'approved', 'paid', 'cancelled'),
      paymentMethod: Joi.string().trim().max(64).allow('', null),
      bankReference: Joi.string().trim().max(120).allow('', null),
      notes: Joi.string().trim().max(500).allow('', null),
    }).min(1),
  },
  listReconciliation: {
    query: Joi.object({
      status: Joi.string().valid('matched', 'pending', 'mismatch', 'resolved'),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
  updateReconciliation: {
    body: Joi.object({
      reconciliationStatus: Joi.string().valid('matched', 'pending', 'mismatch', 'resolved'),
      settlementStatus: Joi.string().valid('pending', 'settled', 'failed'),
      notes: Joi.string().trim().max(500).allow('', null),
    }).min(1),
  },
  downloadReport: {
    query: Joi.object({
      from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
      to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    }),
  },
};
