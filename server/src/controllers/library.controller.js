'use strict';

const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/library.service');

function parseBookIds(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

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
  res.json(await svc.containsMany(req.user.id, parseBookIds(req.query.bookIds)));
});

const statusMany = asyncHandler(async (req, res) => {
  res.json(await svc.statusMany(req.user.id, parseBookIds(req.query.bookIds)));
});

const setStatus = asyncHandler(async (req, res) => {
  const result = await svc.setStatus(req.user.id, Number(req.params.bookId), req.body.status);
  res.json(result);
});

module.exports = { list, add, remove, contains, statusMany, setStatus };
