'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');

const validate = require('../../middleware/validate');
const { authRequired } = require('../../middleware/auth');
const ctrl = require('../../controllers/checkin.controller');
const v = require('../../validators/checkin.validators');

// Claims are idempotent per day, but keep hammering (and lucky-roll farming) out.
const claimLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20 });

router.use(authRequired);

router.get('/', ctrl.status);
router.post('/claim', claimLimiter, ctrl.claim);
router.post('/milestones/:checkinId/claim', claimLimiter, validate(v.claimMilestone), ctrl.claimMilestone);
router.get('/history', validate(v.history), ctrl.history);
router.get('/rewards', ctrl.inventory);
router.post('/rewards/:id/activate', claimLimiter, validate(v.activateReward), ctrl.activateReward);

module.exports = router;
