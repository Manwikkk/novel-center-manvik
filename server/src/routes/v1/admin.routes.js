'use strict';

const router = require('express').Router();
const Joi = require('joi');

const validate = require('../../middleware/validate');
const { authRequired } = require('../../middleware/auth');
const {
  requireAdminPanel,
  requireSuperAdmin,
  loadAdminPermissions,
  requireAdminPermission,
  requireAdminCapability,
} = require('../../middleware/requireAdminAccess');
const ctrl = require('../../controllers/admin.controller');
const catCtrl = require('../../controllers/adminCatalog.controller');
const finCtrl = require('../../controllers/financeAdmin.controller');
const v = require('../../validators/admin.validators');
const catv = require('../../validators/adminCatalog.validators');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });
const reportTypeParam = Joi.object({
  type: Joi.string().valid(
    'wallet-coin',
    'transaction',
    'sales',
    'revenue',
    'tax',
    'promotion-coupon',
    'reconciliation',
    'author-payout',
    'financial-audit',
  ).required(),
});

router.use(authRequired, requireAdminPanel(), loadAdminPermissions);

router.get('/permissions', requireSuperAdmin(), ctrl.listPermissionDefs);
router.get('/staff', requireSuperAdmin(), ctrl.listStaff);
router.post('/staff', requireSuperAdmin(), validate(v.createStaffUser), ctrl.createStaff);
router.patch('/staff/:id', requireSuperAdmin(), validate({ params: idParam, body: v.updateStaffUser.body }), ctrl.updateStaff);

router.get('/users', requireAdminPermission('users'), validate(v.listUsers), ctrl.listUsers);
router.patch('/users/:id', requireAdminPermission('users'), validate({ params: idParam, body: v.updateUser.body }), ctrl.updateUser);

router.get('/books', requireAdminPermission('books'), validate(v.listBooks), ctrl.listBooks);
router.get('/books/:id/chapters', requireAdminPermission('books'), validate({ params: idParam }), ctrl.listBookChapters);
router.post('/books/:id/recycle', requireAdminPermission('books'), requireAdminCapability('books.delete'), validate({ params: idParam }), ctrl.recycleBook);
router.post('/chapters/:id/recycle', requireAdminPermission('books'), requireAdminCapability('books.delete'), validate({ params: idParam }), ctrl.recycleChapter);
router.get('/recycle', requireAdminPermission('books'), validate(v.listRecycle), ctrl.listRecycle);
router.post('/recycle/:id/restore', requireAdminPermission('books'), requireAdminCapability('books.delete'), validate({ params: idParam }), ctrl.restoreRecycle);

router.get('/transactions', requireAdminPermission('transactions'), validate(v.listTransactions), ctrl.listTransactions);

router.get('/campaigns', requireAdminPermission('transactions'), finCtrl.listCampaigns);
router.post('/campaigns', requireAdminPermission('transactions'), requireAdminCapability('transactions.reports'), validate(v.createCampaign), finCtrl.createCampaign);
router.get('/coupons', requireAdminPermission('transactions'), finCtrl.listCoupons);
router.post('/coupons', requireAdminPermission('transactions'), requireAdminCapability('transactions.reports'), validate(v.createCoupon), finCtrl.createCoupon);
router.patch('/coupons/:id', requireAdminPermission('transactions'), requireAdminCapability('transactions.reports'), validate({ params: idParam, body: v.updateCoupon.body }), finCtrl.updateCoupon);
router.post('/refunds', requireAdminPermission('transactions'), requireAdminCapability('transactions.refund'), validate(v.createRefund), finCtrl.createRefund);
router.post('/author-payouts/generate', requireAdminPermission('transactions'), requireAdminCapability('authors.payouts'), validate(v.generatePayout), finCtrl.generatePayout);
router.patch('/author-payouts/:id', requireAdminPermission('transactions'), requireAdminCapability('authors.payouts'), validate({ params: idParam, body: v.updatePayout.body }), finCtrl.updatePayout);
router.get('/reconciliation', requireAdminPermission('transactions'), validate(v.listReconciliation), finCtrl.listReconciliation);
router.patch('/reconciliation/:id', requireAdminPermission('transactions'), requireAdminCapability('transactions.reports'), validate({ params: idParam, body: v.updateReconciliation.body }), finCtrl.updateReconciliation);

router.get('/reports', requireAdminPermission('reports'), requireAdminCapability('transactions.reports'), finCtrl.listReports);
router.get('/reports/:type/preview', requireAdminPermission('reports'), requireAdminCapability('transactions.reports'), validate({ params: reportTypeParam, query: v.previewReport.query }), finCtrl.previewReport);
router.get('/reports/:type/export/pdf', requireAdminPermission('reports'), requireAdminCapability('transactions.reports'), validate({ params: reportTypeParam, query: v.exportReport.query }), finCtrl.exportReportPdf);
router.get('/reports/:type/export/xlsx', requireAdminPermission('reports'), requireAdminCapability('transactions.reports'), validate({ params: reportTypeParam, query: v.exportReport.query }), finCtrl.exportReportXlsx);
router.get('/reports/:type', requireAdminPermission('reports'), requireAdminCapability('transactions.reports'), validate({ params: reportTypeParam, query: v.downloadReport.query }), finCtrl.downloadReport);

router.get('/comments/by-book', requireAdminPermission('comments'), validate(v.commentsByBook), ctrl.commentsByBook);
router.get('/comments/by-chapter', requireAdminPermission('comments'), validate(v.commentsByChapter), ctrl.commentsByChapter);
router.get('/comments', requireAdminPermission('comments'), validate(v.listComments), ctrl.listComments);
router.patch('/comments/:id/status', requireAdminPermission('comments'), requireAdminCapability('comments.moderate'), validate({ params: idParam, body: v.moderateComment.body }), ctrl.moderateComment);

router.get('/stats', requireAdminPermission('dashboard'), ctrl.stats);

router.get('/page-sections', requireAdminPermission('page_configuration'), ctrl.getPageSections);
router.patch('/page-sections', requireAdminPermission('page_configuration'), validate(v.patchPageSections), ctrl.patchPageSections);

router.get('/settings', requireAdminPermission('users'), ctrl.getSettings);
router.patch('/settings', requireSuperAdmin(), validate(v.patchAdminSettings), ctrl.patchSettings);

router.get('/audit-logs', requireSuperAdmin(), validate(v.listAuditLogs), ctrl.listAuditLogs);

router.get('/catalog/categories', requireAdminPermission('catalog'), catCtrl.listCategories);
router.post('/catalog/categories', requireAdminPermission('catalog'), validate(catv.createCategory), catCtrl.createCategory);
router.patch('/catalog/categories/:id', requireAdminPermission('catalog'), validate({ params: idParam, body: catv.updateCategory.body }), catCtrl.updateCategory);
router.delete('/catalog/categories/:id', requireAdminPermission('catalog'), validate({ params: idParam }), catCtrl.deleteCategory);

router.get('/catalog/languages', requireAdminPermission('catalog'), catCtrl.listLanguages);
router.post('/catalog/languages', requireAdminPermission('catalog'), validate(catv.createLanguage), catCtrl.createLanguage);
router.patch('/catalog/languages/:id', requireAdminPermission('catalog'), validate({ params: idParam, body: catv.updateLanguage.body }), catCtrl.updateLanguage);
router.delete('/catalog/languages/:id', requireAdminPermission('catalog'), validate({ params: idParam }), catCtrl.deleteLanguage);

router.get('/catalog/content-tags', requireAdminPermission('catalog'), catCtrl.listContentTags);
router.post('/catalog/content-tags', requireAdminPermission('catalog'), validate(catv.createContentTag), catCtrl.createContentTag);
router.patch('/catalog/content-tags/:id', requireAdminPermission('catalog'), validate({ params: idParam, body: catv.updateContentTag.body }), catCtrl.updateContentTag);
router.delete('/catalog/content-tags/:id', requireAdminPermission('catalog'), validate({ params: idParam }), catCtrl.deleteContentTag);

module.exports = router;
