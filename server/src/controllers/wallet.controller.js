'use strict';

const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/wallet.service');

const getMine = asyncHandler(async (req, res) => {
  const wallet = await svc.getMine(req.user.id);
  res.json({ wallet, packs: svc.PACKS });
});

const listTransactions = asyncHandler(async (req, res) => {
  const result = await svc.listTransactions(req.user.id, req.query);
  res.json(result);
});

const purchase = asyncHandler(async (req, res) => {
  const result = await svc.purchase(req.user.id, req.body);
  res.json(result);
});

module.exports = { getMine, listTransactions, purchase };
