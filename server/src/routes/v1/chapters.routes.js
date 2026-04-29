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
router.post('/:id/unlock', authRequired,                              validate({ params: idParam }), ctrl.unlock);

module.exports = router;
