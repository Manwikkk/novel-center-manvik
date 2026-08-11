'use strict';

const asyncHandler = require('../utils/asyncHandler');
const financeAdmin = require('../services/financeAdmin.service');
const reportsSvc = require('../services/reports');

const actorOf = (req) => ({ ...req.user, staffRole: req.staffRole });

const listCampaigns = asyncHandler(async (_req, res) => {
  res.json(await financeAdmin.listCampaigns());
});

const createCampaign = asyncHandler(async (req, res) => {
  res.status(201).json({ campaign: await financeAdmin.createCampaign(req.body, actorOf(req)) });
});

const listCoupons = asyncHandler(async (_req, res) => {
  res.json(await financeAdmin.listCoupons());
});

const createCoupon = asyncHandler(async (req, res) => {
  res.status(201).json({ coupon: await financeAdmin.createCoupon(req.body, actorOf(req)) });
});

const updateCoupon = asyncHandler(async (req, res) => {
  res.json({ coupon: await financeAdmin.updateCoupon(Number(req.params.id), req.body, actorOf(req)) });
});

const createRefund = asyncHandler(async (req, res) => {
  res.status(201).json({ refund: await financeAdmin.createRefund(req.body, actorOf(req)) });
});

const generatePayout = asyncHandler(async (req, res) => {
  res.status(201).json({
    payout: await financeAdmin.generateAuthorPayoutDraft({
      authorId: req.body.authorId,
      periodStart: req.body.periodStart,
      periodEnd: req.body.periodEnd,
    }, actorOf(req)),
  });
});

const updatePayout = asyncHandler(async (req, res) => {
  res.json({ payout: await financeAdmin.updateAuthorPayout(Number(req.params.id), req.body, actorOf(req)) });
});

const listReconciliation = asyncHandler(async (req, res) => {
  res.json(await financeAdmin.listReconciliation(req.query));
});

const updateReconciliation = asyncHandler(async (req, res) => {
  res.json({
    record: await financeAdmin.updateReconciliation(Number(req.params.id), req.body, actorOf(req)),
  });
});

const listReports = asyncHandler(async (_req, res) => {
  res.json({ items: reportsSvc.catalog() });
});

const exportOpts = (req) => ({
  from: req.query.from,
  to: req.query.to,
  tabs: req.query.tabs,
  fields: req.query.fields,
  generatedBy: req.user?.displayName || req.user?.email || 'Admin',
});

const sendExport = (res, { buffer, filename, contentType }) => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

const exportReportPdf = asyncHandler(async (req, res) => {
  sendExport(res, await reportsSvc.generatePdf(req.params.type, exportOpts(req)));
});

const exportReportXlsx = asyncHandler(async (req, res) => {
  sendExport(res, await reportsSvc.generate(req.params.type, exportOpts(req)));
});

const downloadReport = asyncHandler(async (req, res) => {
  const opts = exportOpts(req);
  const format = req.query.format || 'xlsx';
  const result = format === 'pdf'
    ? await reportsSvc.generatePdf(req.params.type, opts)
    : await reportsSvc.generate(req.params.type, opts);
  sendExport(res, result);
});

const previewReport = asyncHandler(async (req, res) => {
  const data = await reportsSvc.preview(req.params.type, {
    from: req.query.from,
    to: req.query.to,
    tabs: req.query.tabs,
    fields: req.query.fields,
    generatedBy: req.user?.displayName || req.user?.email || 'Admin',
  });
  res.json(data);
});

module.exports = {
  listCampaigns,
  createCampaign,
  listCoupons,
  createCoupon,
  updateCoupon,
  createRefund,
  generatePayout,
  updatePayout,
  listReconciliation,
  updateReconciliation,
  listReports,
  previewReport,
  exportReportPdf,
  exportReportXlsx,
  downloadReport,
};
