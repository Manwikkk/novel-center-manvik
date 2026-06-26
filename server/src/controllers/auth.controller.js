'use strict';

const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
});

const googleAuth = asyncHandler(async (req, res) => {
  const result = await authService.googleAuth(req.body);
  res.json(result);
});

const completeOnboarding = asyncHandler(async (req, res) => {
  const result = await authService.completeOnboarding(req.user.id, req.body);
  res.json(result);
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body);
  res.json(result);
});

const me = asyncHandler(async (req, res) => {
  const result = await authService.me(req.user.id);
  res.json(result);
});

const updateMe = asyncHandler(async (req, res) => {
  const result = await authService.updateMe(req.user.id, req.body);
  res.json(result);
});

module.exports = {
  register,
  login,
  googleAuth,
  completeOnboarding,
  refresh,
  me,
  updateMe,
};
