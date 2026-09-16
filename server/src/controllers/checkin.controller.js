'use strict';

const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/checkin.service');
const rewards = require('../services/rewards.service');
const config = require('../services/checkinConfig.service');
const auditSvc = require('../services/audit.service');

const status = asyncHandler(async (req, res) => {
  res.json(await svc.getStatus(req.user.id));
});

const claim = asyncHandler(async (req, res) => {
  res.json(await svc.claim(req.user.id));
});

const claimMilestone = asyncHandler(async (req, res) => {
  res.json(await svc.claimMilestone(req.user.id, Number(req.params.checkinId), req.body.option));
});

const history = asyncHandler(async (req, res) => {
  res.json(await svc.history(req.user.id, { month: req.query.month }));
});

const inventory = asyncHandler(async (req, res) => {
  res.json(await rewards.listInventory(req.user.id));
});

const activateReward = asyncHandler(async (req, res) => {
  const reward = await rewards.activatePass(req.user.id, Number(req.params.id), { bookId: req.body.bookId });
  res.json({ reward, inventory: await rewards.listInventory(req.user.id) });
});

// ── admin ────────────────────────────────────────────────────────────────────

const adminOverview = asyncHandler(async (_req, res) => {
  const [cfg, campaigns, stats] = await Promise.all([
    config.getConfig({ fresh: true }),
    config.listCampaigns(),
    svc.adminStats(),
  ]);
  res.json({ config: cfg, campaigns, stats });
});

const adminUpdateConfig = asyncHandler(async (req, res) => {
  const cfg = await config.updateConfig(req.body, req.user);
  await auditSvc.logAction({
    actor: req.user,
    action: 'checkin.config.update',
    targetType: 'checkin_config',
    targetId: 1,
    summary: 'Updated Daily Check-In configuration',
    meta: { keys: Object.keys(req.body || {}) },
  });
  res.json({ config: cfg });
});

const adminCreateCampaign = asyncHandler(async (req, res) => {
  const campaign = await config.createCampaign(req.body, req.user);
  await auditSvc.logAction({
    actor: req.user,
    action: 'checkin.campaign.create',
    targetType: 'checkin_campaign',
    targetId: campaign.id,
    summary: `Created check-in campaign "${campaign.name}"`,
  });
  res.status(201).json({ campaign });
});

const adminUpdateCampaign = asyncHandler(async (req, res) => {
  const campaign = await config.updateCampaign(Number(req.params.id), req.body);
  await auditSvc.logAction({
    actor: req.user,
    action: 'checkin.campaign.update',
    targetType: 'checkin_campaign',
    targetId: campaign.id,
    summary: `Updated check-in campaign "${campaign.name}"`,
    meta: { keys: Object.keys(req.body || {}) },
  });
  res.json({ campaign });
});

const adminDeleteCampaign = asyncHandler(async (req, res) => {
  await config.deleteCampaign(Number(req.params.id));
  await auditSvc.logAction({
    actor: req.user,
    action: 'checkin.campaign.delete',
    targetType: 'checkin_campaign',
    targetId: Number(req.params.id),
    summary: `Deleted check-in campaign #${req.params.id}`,
  });
  res.json({ ok: true });
});

module.exports = {
  status,
  claim,
  claimMilestone,
  history,
  inventory,
  activateReward,
  adminOverview,
  adminUpdateConfig,
  adminCreateCampaign,
  adminUpdateCampaign,
  adminDeleteCampaign,
};
