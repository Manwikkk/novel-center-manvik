'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');

const validate = require('../../middleware/validate');
const { authRequired } = require('../../middleware/auth');
const ctrl = require('../../controllers/wallet.controller');
const v = require('../../validators/wallet.validators');

const purchaseLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30 });

router.get('/', authRequired, ctrl.getMine);
router.get('/transactions', authRequired, validate(v.list), ctrl.listTransactions);
router.post('/purchase', authRequired, purchaseLimiter, validate(v.purchase), ctrl.purchase);

module.exports = router;
