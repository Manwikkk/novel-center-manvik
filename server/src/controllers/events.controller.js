'use strict';

const asyncHandler = require('../utils/asyncHandler');
const events = require('../services/events.service');

const list = asyncHandler(async (req, res) => {
  res.json(await events.listForUser(req.user.id));
});

const promoted = asyncHandler(async (req, res) => {
  res.json(await events.promoted(req.user.id));
});

const detail = asyncHandler(async (req, res) => {
  res.json(await events.detailFor(req.user.id, req.params.id));
});

const register = asyncHandler(async (req, res) => {
  res.status(201).json(await events.register(req.user.id, req.params.id));
});

const dismiss = asyncHandler(async (req, res) => {
  res.json(await events.dismiss(req.user.id, req.params.id));
});

const claim = asyncHandler(async (req, res) => {
  res.json(await events.claim(req.user.id, Number(req.params.id), Number(req.params.rewardId)));
});

const adminList = asyncHandler(async (req, res) => {
  res.json(await events.adminList());
});

const adminCreate = asyncHandler(async (req, res) => {
  const event = await events.createEvent(req.body, req.user);
  res.status(201).json({ event });
});

const adminUpdate = asyncHandler(async (req, res) => {
  const event = await events.updateEvent(Number(req.params.id), req.body, req.user);
  res.json({ event });
});

const adminRemove = asyncHandler(async (req, res) => {
  res.json(await events.removeEvent(Number(req.params.id), req.user));
});

module.exports = {
  list, promoted, detail, register, dismiss, claim,
  adminList, adminCreate, adminUpdate, adminRemove,
};
