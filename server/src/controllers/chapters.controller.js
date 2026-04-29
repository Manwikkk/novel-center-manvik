'use strict';

const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/chapters.service');
const wallet = require('../services/wallet.service');

const listForBook = asyncHandler(async (req, res) => {
  const items = await svc.listForBook(Number(req.params.id), req.user || null);
  res.json({ items });
});

const createInBook = asyncHandler(async (req, res) => {
  const chapter = await svc.createInBook(Number(req.params.id), req.body, req.user);
  res.status(201).json({ chapter });
});

const getById = asyncHandler(async (req, res) => {
  const chapter = await svc.getById(Number(req.params.id), req.user || null);
  res.json({ chapter });
});

const update = asyncHandler(async (req, res) => {
  const chapter = await svc.update(Number(req.params.id), req.body, req.user);
  res.json({ chapter });
});

const remove = asyncHandler(async (req, res) => {
  await svc.remove(Number(req.params.id), req.user);
  res.status(204).end();
});

const unlock = asyncHandler(async (req, res) => {
  const result = await wallet.unlockChapter(req.user.id, Number(req.params.id));
  res.json(result);
});

module.exports = { listForBook, createInBook, getById, update, remove, unlock };
