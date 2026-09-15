'use strict';

const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/reading.service');

const saveProgress = asyncHandler(async (req, res) => {
  const { chapterId, percent, position } = req.body;
  const out = await svc.upsertProgress(req.user.id, Number(chapterId), Number(percent), Number(position || 0));
  res.json({ progress: out });
});

const recent = asyncHandler(async (req, res) => {
  res.json(await svc.recent(req.user.id, req.query));
});

const bookProgress = asyncHandler(async (req, res) => {
  const progress = await svc.latestForBook(req.user.id, Number(req.params.bookId));
  res.json({ progress });
});

module.exports = { saveProgress, recent, bookProgress };
