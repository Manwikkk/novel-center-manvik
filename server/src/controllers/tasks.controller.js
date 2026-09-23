'use strict';

const asyncHandler = require('../utils/asyncHandler');
const tasks = require('../services/tasks.service');

const board = asyncHandler(async (req, res) => {
  res.json(await tasks.getBoard(req.user.id));
});

const adminList = asyncHandler(async (req, res) => {
  res.json(await tasks.listAdmin());
});

const adminCreate = asyncHandler(async (req, res) => {
  const task = await tasks.createTask(req.body, req.user);
  res.status(201).json({ task });
});

const adminUpdate = asyncHandler(async (req, res) => {
  const task = await tasks.updateTask(Number(req.params.id), req.body, req.user);
  res.json({ task });
});

const adminRemove = asyncHandler(async (req, res) => {
  res.json(await tasks.removeTask(Number(req.params.id), req.user));
});

module.exports = { board, adminList, adminCreate, adminUpdate, adminRemove };
