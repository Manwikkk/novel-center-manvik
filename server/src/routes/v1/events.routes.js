'use strict';

const router = require('express').Router();
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { authRequired } = require('../../middleware/auth');
const ctrl = require('../../controllers/events.controller');
const v = require('../../validators/events.validators');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

router.use(authRequired);
router.get('/promoted', ctrl.promoted);
router.get('/', ctrl.list);
router.get('/:id', validate({ params: idParam }), ctrl.detail);
router.post('/:id/register', validate({ params: idParam }), ctrl.register);
router.post('/:id/dismiss', validate({ params: idParam }), ctrl.dismiss);
router.post('/:id/rewards/:rewardId/claim', validate({ params: v.rewardParam }), ctrl.claim);

module.exports = router;
