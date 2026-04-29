'use strict';

const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/authors.service');

const list = asyncHandler(async (req, res) => {
  res.json(await svc.list(req.query));
});

const getById = asyncHandler(async (req, res) => {
  const result = await svc.getById(Number(req.params.id), req.query);
  res.json(result);
});

module.exports = { list, getById };
