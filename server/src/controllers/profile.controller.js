'use strict';

const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/profile.service');
const notificationsSvc = require('../services/notifications.service');

const getMe = asyncHandler(async (req, res) => {
  const data = await svc.getOverview(req.user.id, req.user.id);
  res.json(data);
});

const getById = asyncHandler(async (req, res) => {
  const viewerId = req.user?.id || null;
  const data = await svc.getOverview(Number(req.params.id), viewerId);
  res.json(data);
});

const updateMe = asyncHandler(async (req, res) => {
  const data = await svc.updateProfile(req.user.id, req.body);
  res.json(data);
});

const uploadAvatar = asyncHandler(async (req, res) => {
  const data = await svc.uploadAvatar(req.user.id, req.file);
  res.json(data);
});

const uploadBanner = asyncHandler(async (req, res) => {
  const data = await svc.uploadBanner(req.user.id, req.file);
  res.json(data);
});

const checkIn = asyncHandler(async (req, res) => {
  const data = await svc.checkIn(req.user.id);
  res.json(data);
});

const follow = asyncHandler(async (req, res) => {
  const data = await svc.follow(req.user.id, Number(req.params.id));
  res.json(data);
});

const unfollow = asyncHandler(async (req, res) => {
  const data = await svc.unfollow(req.user.id, Number(req.params.id));
  res.json(data);
});

const followers = asyncHandler(async (req, res) => {
  const data = await svc.listFollowers(Number(req.params.id), req.user?.id || null, req.query);
  res.json(data);
});

const following = asyncHandler(async (req, res) => {
  const data = await svc.listFollowing(Number(req.params.id), req.user?.id || null, req.query);
  res.json(data);
});

const notifications = asyncHandler(async (req, res) => {
  const data = await notificationsSvc.list(req.user.id, {
    page: req.query.page,
    pageSize: req.query.pageSize,
    unreadOnly: req.query.unread === true || req.query.unread === 'true',
  });
  res.json(data);
});

const markNotificationsRead = asyncHandler(async (req, res) => {
  const data = await notificationsSvc.markRead(req.user.id, { ids: req.body.ids, all: !!req.body.all });
  res.json(data);
});

const novels = asyncHandler(async (req, res) => {
  const viewerId = req.user?.id || null;
  const data = await svc.listProfileNovels(Number(req.params.id), {
    viewerId,
    page: req.query.page,
    pageSize: req.query.pageSize,
    statusFilter: req.query.status,
  });
  res.json(data);
});

const setNovelVisibility = asyncHandler(async (req, res) => {
  const data = await svc.setNovelProfileVisibility(
    req.user.id,
    Number(req.params.bookId),
    req.body.showOnProfile,
  );
  res.json(data);
});

const library = asyncHandler(async (req, res) => {
  const data = await svc.listLibrary(Number(req.params.id), req.user.id, req.query);
  res.json(data);
});

const reviews = asyncHandler(async (req, res) => {
  const viewerId = req.user?.id || null;
  const data = await svc.listReviews(Number(req.params.id), viewerId, req.query);
  res.json(data);
});

const comments = asyncHandler(async (req, res) => {
  const viewerId = req.user?.id || null;
  const data = await svc.listComments(Number(req.params.id), viewerId, req.query);
  res.json(data);
});

const achievements = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  const isOwner = req.user?.id != null && Number(req.user.id) === userId;
  const data = await svc.listAchievements(userId, { withProgress: isOwner });
  res.json(data);
});

const setBadgeShowcase = asyncHandler(async (req, res) => {
  const data = await svc.setBadgeShowcase(req.user.id, req.body.codes);
  res.json(data);
});

const collections = asyncHandler(async (req, res) => {
  const viewerId = req.user?.id || null;
  const data = await svc.listPublicCollections(Number(req.params.id), viewerId, req.query);
  res.json(data);
});

const collectionDetail = asyncHandler(async (req, res) => {
  const viewerId = req.user?.id || null;
  const data = await svc.getPublicCollection(
    Number(req.params.id),
    Number(req.params.collectionId),
    viewerId,
  );
  res.json(data);
});

const levelBenefits = asyncHandler(async (_req, res) => {
  const items = await svc.listLevelBenefits();
  res.json({ items });
});

const changePassword = asyncHandler(async (req, res) => {
  const data = await svc.changePassword(req.user.id, req.body);
  res.json(data);
});

const updateEmail = asyncHandler(async (req, res) => {
  const data = await svc.updateEmail(req.user.id, req.body);
  res.json(data);
});

const deleteAccount = asyncHandler(async (req, res) => {
  const data = await svc.deleteAccount(req.user.id, req.body);
  res.json(data);
});

module.exports = {
  getMe,
  getById,
  updateMe,
  uploadAvatar,
  uploadBanner,
  checkIn,
  follow,
  unfollow,
  followers,
  following,
  notifications,
  markNotificationsRead,
  novels,
  setNovelVisibility,
  library,
  reviews,
  comments,
  achievements,
  setBadgeShowcase,
  collections,
  collectionDetail,
  levelBenefits,
  changePassword,
  updateEmail,
  deleteAccount,
};
