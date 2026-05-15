'use strict';

const router = require('express').Router();
const Joi = require('joi');

const validate = require('../../middleware/validate');
const { authRequired } = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const ctrl = require('../../controllers/admin.controller');
const catCtrl = require('../../controllers/adminCatalog.controller');
const v = require('../../validators/admin.validators');
const catv = require('../../validators/adminCatalog.validators');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

router.use(authRequired, requireRole('admin'));

router.get('/users',                validate(v.listUsers),         ctrl.listUsers);
router.patch('/users/:id',          validate({ params: idParam, body: v.updateUser.body }), ctrl.updateUser);

router.get('/books',                validate(v.listBooks),         ctrl.listBooks);

router.get('/transactions',         validate(v.listTransactions),  ctrl.listTransactions);

router.get('/comments/by-book',     validate(v.commentsByBook),    ctrl.commentsByBook);
router.get('/comments/by-chapter',  validate(v.commentsByChapter), ctrl.commentsByChapter);
router.get('/comments',             validate(v.listComments),      ctrl.listComments);
router.patch('/comments/:id/status',validate({ params: idParam, body: v.moderateComment.body }), ctrl.moderateComment);

router.get('/stats',                ctrl.stats);

router.get('/page-sections',         ctrl.getPageSections);
router.patch('/page-sections',      validate(v.patchPageSections), ctrl.patchPageSections);

router.get('/catalog/categories',   catCtrl.listCategories);
router.post('/catalog/categories',  validate(catv.createCategory), catCtrl.createCategory);
router.patch('/catalog/categories/:id', validate({ params: idParam, body: catv.updateCategory.body }), catCtrl.updateCategory);
router.delete('/catalog/categories/:id', validate({ params: idParam }), catCtrl.deleteCategory);

router.get('/catalog/languages',    catCtrl.listLanguages);
router.post('/catalog/languages',   validate(catv.createLanguage), catCtrl.createLanguage);
router.patch('/catalog/languages/:id', validate({ params: idParam, body: catv.updateLanguage.body }), catCtrl.updateLanguage);
router.delete('/catalog/languages/:id', validate({ params: idParam }), catCtrl.deleteLanguage);

router.get('/catalog/content-tags', catCtrl.listContentTags);
router.post('/catalog/content-tags', validate(catv.createContentTag), catCtrl.createContentTag);
router.patch('/catalog/content-tags/:id', validate({ params: idParam, body: catv.updateContentTag.body }), catCtrl.updateContentTag);
router.delete('/catalog/content-tags/:id', validate({ params: idParam }), catCtrl.deleteContentTag);

module.exports = router;
