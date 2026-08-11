'use strict';

const router = require('express').Router();
const validate = require('../../middleware/validate');
const { authRequired, authOptional } = require('../../middleware/auth');
const storage = require('../../storage');
const ctrl = require('../../controllers/profile.controller');
const v = require('../../validators/profile.validators');

router.get('/levels', ctrl.levelBenefits);

router.get('/me', authRequired, ctrl.getMe);
router.patch('/me', authRequired, validate(v.updateProfile), ctrl.updateMe);
router.post('/me/avatar', authRequired, storage.middleware('avatar'), ctrl.uploadAvatar);
router.post('/me/banner', authRequired, storage.middleware('banner'), ctrl.uploadBanner);
router.post('/me/check-in', authRequired, ctrl.checkIn);
router.post('/me/password', authRequired, validate(v.changePassword), ctrl.changePassword);
router.patch('/me/email', authRequired, validate(v.updateEmail), ctrl.updateEmail);
router.post('/me/delete', authRequired, validate(v.deleteAccount), ctrl.deleteAccount);
router.patch(
  '/me/novels/:bookId',
  authRequired,
  validate(v.novelVisibility),
  ctrl.setNovelVisibility,
);

router.get('/:id', authOptional, validate(v.idParam), ctrl.getById);
router.post('/:id/follow', authRequired, validate(v.idParam), ctrl.follow);
router.delete('/:id/follow', authRequired, validate(v.idParam), ctrl.unfollow);

router.get('/:id/novels', authOptional, validate({ ...v.idParam, ...v.novelsQuery }), ctrl.novels);
router.get('/:id/library', authRequired, validate({ ...v.idParam, ...v.pagination }), ctrl.library);
router.get('/:id/reviews', authOptional, validate({ ...v.idParam, ...v.pagination }), ctrl.reviews);
router.get('/:id/comments', authOptional, validate({ ...v.idParam, ...v.pagination }), ctrl.comments);
router.get('/:id/achievements', authOptional, validate(v.idParam), ctrl.achievements);
router.get('/:id/collections', authOptional, validate({ ...v.idParam, ...v.pagination }), ctrl.collections);
router.get(
  '/:id/collections/:collectionId',
  authOptional,
  validate(v.collectionParam),
  ctrl.collectionDetail,
);

module.exports = router;
