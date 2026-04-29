'use strict';

const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/books.service');

const list = asyncHandler(async (req, res) => {
  const result = await svc.list(req.query, req.user || null);
  res.json(result);
});

const getBySlug = asyncHandler(async (req, res) => {
  const book = await svc.getBySlug(req.params.slug, req.user || null);
  res.json({ book });
});

const getById = asyncHandler(async (req, res) => {
  const book = await svc.getByIdForViewer(Number(req.params.id), req.user || null);
  res.json({ book });
});

const create = asyncHandler(async (req, res) => {
  const book = await svc.create(req.body, req.user.id);
  res.status(201).json({ book });
});

const update = asyncHandler(async (req, res) => {
  const book = await svc.update(Number(req.params.id), req.body, req.user);
  res.json({ book });
});

const remove = asyncHandler(async (req, res) => {
  await svc.remove(Number(req.params.id), req.user);
  res.status(204).end();
});

const uploadCover = asyncHandler(async (req, res) => {
  const book = await svc.setCover(Number(req.params.id), req.file, req.user);
  res.json({ book });
});

module.exports = { list, getBySlug, getById, create, update, remove, uploadCover };
