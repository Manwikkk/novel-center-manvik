'use strict';

const router = require('express').Router({ mergeParams: true });
const Joi = require('joi');

const validate = require('../../middleware/validate');
const { authRequired, authOptional } = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const storage = require('../../storage');
const ctrl = require('../../controllers/books.controller');
const chaptersCtrl = require('../../controllers/chapters.controller');
const v = require('../../validators/books.validators');
const cv = require('../../validators/chapters.validators');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

router.get('/', authOptional, validate(v.list), ctrl.list);
router.get('/by-id/:id', authOptional, validate({ params: idParam }), ctrl.getById);
router.get('/:slug', authOptional, validate(v.bySlug), ctrl.getBySlug);

router.post('/', authRequired, requireRole('author', 'admin'), validate(v.create), ctrl.create);
router.patch('/:id', authRequired, requireRole('author', 'admin'), validate({ params: idParam, body: v.update.body }), ctrl.update);
router.delete('/:id', authRequired, requireRole('author', 'admin'), validate({ params: idParam }), ctrl.remove);

router.post('/:id/cover',
  authRequired, requireRole('author', 'admin'),
  validate({ params: idParam }),
  storage.middleware('cover'),
  ctrl.uploadCover,
);

router.post('/:id/report',
  authRequired,
  validate({ params: idParam, body: v.report.body }),
  ctrl.report,
);

router.get('/:id/chapters',
  authOptional,
  validate({ params: idParam }),
  chaptersCtrl.listForBook,
);
router.post('/:id/chapters',
  authRequired, requireRole('author', 'admin'),
  validate({ params: idParam, body: cv.create.body }),
  chaptersCtrl.createInBook,
);

module.exports = router;
