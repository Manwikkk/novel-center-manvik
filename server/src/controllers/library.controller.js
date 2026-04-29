'use strict';

const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/library.service');

const list = asyncHandler(async (req, res) => {
  res.json(await svc.list({ userId: req.user.id, ...req.query }));
});

const add = asyncHandler(async (req, res) => {
  const entry = await svc.add(req.user.id, Number(req.body.bookId));
  res.status(201).json({ entry });
});

const remove = asyncHandler(async (req, res) => {
  const result = await svc.remove(req.user.id, Number(req.params.bookId));
  res.json(result);
});

const contains = asyncHandler(async (req, res) => {
  const ids = String(req.query.bookIds || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  res.json(await svc.containsMany(req.user.id, ids));
});

module.exports = { list, add, remove, contains };
