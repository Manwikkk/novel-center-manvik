'use strict';

const router = require('express').Router();
const Joi = require('joi');

const validate = require('../../middleware/validate');
const { authRequired, authOptional } = require('../../middleware/auth');
const ctrl = require('../../controllers/comments.controller');
const v = require('../../validators/comments.validators');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

router.get('/',         authOptional, validate(v.list),       ctrl.list);
router.post('/',        authRequired, validate(v.create),     ctrl.create);
router.patch('/:id',    authRequired, validate({ params: idParam, body: v.update.body }), ctrl.update);
router.delete('/:id',   authRequired, validate({ params: idParam }), ctrl.remove);

module.exports = router;
