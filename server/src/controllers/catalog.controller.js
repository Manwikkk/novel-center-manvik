'use strict';

const asyncHandler = require('../utils/asyncHandler');
const catalog = require('../services/catalog.service');

const listCategories = asyncHandler(async (_req, res) => {
  res.json({ items: await catalog.listCategoriesPublic() });
});

const listLanguages = asyncHandler(async (_req, res) => {
  res.json({ items: await catalog.listLanguagesPublic() });
});

const listContentTags = asyncHandler(async (_req, res) => {
  res.json({ items: await catalog.listContentTagsPublic() });
});

module.exports = { listCategories, listLanguages, listContentTags };
