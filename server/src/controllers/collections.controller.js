'use strict';

const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/collections.service');

function parseBookIds(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

const list = asyncHandler(async (req, res) => {
  res.json(await svc.list({ userId: req.user.id, ...req.query }));
});

const create = asyncHandler(async (req, res) => {
  const collection = await svc.create(req.user.id, req.body);
  res.status(201).json({ collection });
});

const update = asyncHandler(async (req, res) => {
  const collection = await svc.update(req.user.id, Number(req.params.id), req.body);
  res.json({ collection });
});

const remove = asyncHandler(async (req, res) => {
  res.json(await svc.remove(req.user.id, Number(req.params.id)));
});

const listBooks = asyncHandler(async (req, res) => {
  res.json(await svc.listBooks(req.user.id, Number(req.params.id), req.query));
});

const addBook = asyncHandler(async (req, res) => {
  const result = await svc.addBook(req.user.id, Number(req.params.id), Number(req.body.bookId));
  res.status(201).json(result);
});

const removeBook = asyncHandler(async (req, res) => {
  res.json(await svc.removeBook(req.user.id, Number(req.params.id), Number(req.params.bookId)));
});

const contains = asyncHandler(async (req, res) => {
  res.json(await svc.containsMany(req.user.id, parseBookIds(req.query.bookIds)));
});

module.exports = { list, create, update, remove, listBooks, addBook, removeBook, contains };
