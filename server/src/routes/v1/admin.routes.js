'use strict';

const router = require('express').Router();
const Joi = require('joi');

const validate = require('../../middleware/validate');
const { authRequired } = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const ctrl = require('../../controllers/admin.controller');
const v = require('../../validators/admin.validators');

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

module.exports = router;
