'use strict';

const asyncHandler = require('../utils/asyncHandler');
const authorService = require('../services/author.service');

const earnings = asyncHandler(async (req, res) => {
  const result = await authorService.getEarnings(req.user.id);
  res.json(result);
});

const bookStats = asyncHandler(async (req, res) => {
  const result = await authorService.getBookStats(req.user.id, Number(req.params.bookId));
  res.json(result);
});

module.exports = { earnings, bookStats };
