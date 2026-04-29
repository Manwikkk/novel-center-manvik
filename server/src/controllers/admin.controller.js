'use strict';

const asyncHandler = require('../utils/asyncHandler');
const adminSvc = require('../services/admin.service');
const commentsSvc = require('../services/comments.service');

const listUsers = asyncHandler(async (req, res) => {
  res.json(await adminSvc.listUsers(req.query));
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await adminSvc.updateUser(Number(req.params.id), req.body);
  res.json({ user });
});

const listBooks = asyncHandler(async (req, res) => {
  res.json(await adminSvc.listBooks(req.query));
});

const listTransactions = asyncHandler(async (req, res) => {
  res.json(await adminSvc.listTransactions(req.query));
});

const listComments = asyncHandler(async (req, res) => {
  res.json(await adminSvc.listComments(req.query));
});

const commentsByBook = asyncHandler(async (req, res) => {
  res.json(await adminSvc.commentsByBook(req.query));
});

const commentsByChapter = asyncHandler(async (req, res) => {
  res.json(await adminSvc.commentsByChapter(req.query));
});

const moderateComment = asyncHandler(async (req, res) => {
  const comment = await commentsSvc.moderate(Number(req.params.id), req.body.status);
  res.json({ comment });
});

const stats = asyncHandler(async (_req, res) => {
  res.json(await adminSvc.stats());
});

module.exports = {
  listUsers, updateUser, listBooks, listTransactions,
  listComments, commentsByBook, commentsByChapter, moderateComment,
  stats,
};
