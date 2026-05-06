'use strict';

const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/home.service');

const getSections = asyncHandler(async (_req, res) => {
  const data = await svc.getHomeSections();
  res.json(data);
});

module.exports = { getSections };
