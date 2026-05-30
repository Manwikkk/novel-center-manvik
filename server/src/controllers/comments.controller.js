'use strict';

const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/comments.service');

const list = asyncHandler(async (req, res) => {
  const result = await svc.list(req.query, req.user || null);
  res.json(result);
});

const create = asyncHandler(async (req, res) => {
  const comment = await svc.create(req.body, req.user.id);
  res.status(201).json({ comment });
});

const update = asyncHandler(async (req, res) => {
  const comment = await svc.update(Number(req.params.id), req.body, req.user);
  res.json({ comment });
});

const report = asyncHandler(async (req, res) => {
  await svc.reportComment(Number(req.params.id), req.body, req.user.id);
  res.status(201).json({ ok: true });
});

const remove = asyncHandler(async (req, res) => {
  await svc.remove(Number(req.params.id), req.user);
  res.status(204).end();
});

const setReaction = asyncHandler(async (req, res) => {
  const out = await svc.setReaction(Number(req.params.id), req.user.id, req.body.reaction);
  res.json(out);
});

module.exports = { list, create, update, remove, setReaction, report };
