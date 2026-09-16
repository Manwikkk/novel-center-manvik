'use strict';

const router = require('express').Router();
const Joi = require('joi');

const validate = require('../../middleware/validate');
const { authRequired, authOptional } = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const ctrl = require('../../controllers/chapters.controller');
const v = require('../../validators/chapters.validators');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

router.get('/:id',     authOptional,                                 validate({ params: idParam }), ctrl.getById);
router.patch('/:id',   authRequired, requireRole('author', 'admin'), validate({ params: idParam, body: v.update.body }), ctrl.update);
router.delete('/:id',  authRequired, requireRole('author', 'admin'), validate({ params: idParam }), ctrl.remove);
const unlockBody = Joi.object({ useVoucher: Joi.boolean() });
const bundleBody = Joi.object({
  count: Joi.number().integer().min(2).max(20),
  useVoucher: Joi.boolean(),
});

router.post('/:id/unlock', authRequired,                              validate({ params: idParam, body: unlockBody }), ctrl.unlock);
router.post('/:id/unlock-bundle', authRequired,                       validate({ params: idParam, body: bundleBody }), ctrl.unlockBundle);

module.exports = router;
