'use strict';

const asyncHandler = require('../utils/asyncHandler');
const catalog = require('../services/catalog.service');

const listCategories = asyncHandler(async (_req, res) => {
  res.json({ items: await catalog.listCategoriesAdmin() });
});

const listLanguages = asyncHandler(async (_req, res) => {
  res.json({ items: await catalog.listLanguagesAdmin() });
});

const listContentTags = asyncHandler(async (_req, res) => {
  res.json({ items: await catalog.listContentTagsAdmin() });
});

const createCategory = asyncHandler(async (req, res) => {
  const row = await catalog.createCategory(req.body);
  res.status(201).json({ item: row });
});

const updateCategory = asyncHandler(async (req, res) => {
  res.json({ item: await catalog.updateCategory(Number(req.params.id), req.body) });
});

const deleteCategory = asyncHandler(async (req, res) => {
  res.json(await catalog.deleteCategory(Number(req.params.id)));
});

const createLanguage = asyncHandler(async (req, res) => {
  const row = await catalog.createLanguage(req.body);
  res.status(201).json({ item: row });
});

const updateLanguage = asyncHandler(async (req, res) => {
  res.json({ item: await catalog.updateLanguage(Number(req.params.id), req.body) });
});

const deleteLanguage = asyncHandler(async (req, res) => {
  res.json(await catalog.deleteLanguage(Number(req.params.id)));
});

const createContentTag = asyncHandler(async (req, res) => {
  const row = await catalog.createContentTag(req.body);
  res.status(201).json({ item: row });
});

const updateContentTag = asyncHandler(async (req, res) => {
  res.json({ item: await catalog.updateContentTag(Number(req.params.id), req.body) });
});

const deleteContentTag = asyncHandler(async (req, res) => {
  res.json(await catalog.deleteContentTag(Number(req.params.id)));
});

module.exports = {
  listCategories,
  listLanguages,
  listContentTags,
  createCategory,
  updateCategory,
  deleteCategory,
  createLanguage,
  updateLanguage,
  deleteLanguage,
  createContentTag,
  updateContentTag,
  deleteContentTag,
};
