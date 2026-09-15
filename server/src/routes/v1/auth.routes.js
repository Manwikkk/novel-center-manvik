'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');

const validate = require('../../middleware/validate');
const { authRequired } = require('../../middleware/auth');
const ctrl = require('../../controllers/auth.controller');
const v = require('../../validators/auth.validators');

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.post('/register', authLimiter, validate(v.register), ctrl.register);
router.post('/login',    authLimiter, validate(v.login),    ctrl.login);
router.post('/google',   authLimiter, validate(v.googleAuth), ctrl.googleAuth);
router.post('/onboarding', authRequired, validate(v.completeOnboarding), ctrl.completeOnboarding);
router.post('/become-author', authRequired, ctrl.becomeAuthor);
router.post('/refresh',  authLimiter, validate(v.refresh),  ctrl.refresh);
router.post('/forgot-password', authLimiter, validate(v.forgotPassword), ctrl.forgotPassword);
router.get ('/reset-password',  authLimiter, validate(v.resetPasswordToken), ctrl.resetPasswordToken);
router.post('/reset-password',  authLimiter, validate(v.resetPassword), ctrl.resetPassword);
router.get ('/me',       authRequired,                       ctrl.me);
router.patch('/me',      authRequired, validate(v.updateMe), ctrl.updateMe);

module.exports = router;
