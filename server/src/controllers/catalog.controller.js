'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { errors } = require('../utils/HttpError');
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

const createContentTag = asyncHandler(async (req, res) => {
  if (!req.user || !['author', 'admin'].includes(req.user.role)) {
    throw errors.forbidden('Only authors can create tags');
  }
  const tag = await catalog.findOrCreateContentTag(req.body);
  res.status(201).json({ tag });
});

module.exports = { listCategories, listLanguages, listContentTags, createContentTag };
