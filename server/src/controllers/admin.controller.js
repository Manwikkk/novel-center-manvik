'use strict';

const asyncHandler = require('../utils/asyncHandler');
const adminSvc = require('../services/admin.service');
const staffSvc = require('../services/adminPermissions.service');
const commentsSvc = require('../services/comments.service');
const pageSectionsSvc = require('../services/pageSections.service');
const bookTagsSvc = require('../services/bookTags.service');
const adminSettingsSvc = require('../services/adminSettings.service');
const { ADMIN_PERMISSION_DEFS, PAGE_PERMISSION_DEFS, CAPABILITY_PERMISSION_DEFS } = require('../constants/adminPermissions');
const { STAFF_ROLE_TEMPLATES } = require('../constants/staffRoles');
const auditSvc = require('../services/audit.service');
const recycleSvc = require('../services/recycle.service');

const listUsers = asyncHandler(async (req, res) => {
  res.json(await adminSvc.listUsers(req.query, req.user));
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await adminSvc.updateUser(Number(req.params.id), req.body, {
    ...req.user,
    staffRole: req.staffRole,
  });
  res.json({ user });
});

const listStaff = asyncHandler(async (_req, res) => {
  res.json(await staffSvc.listStaffUsers());
});

const createStaff = asyncHandler(async (req, res) => {
  res.status(201).json(await staffSvc.createStaffUser(req.body, {
    ...req.user,
    staffRole: req.staffRole,
  }));
});

const updateStaff = asyncHandler(async (req, res) => {
  res.json(await staffSvc.updateStaffUser(Number(req.params.id), req.body, {
    ...req.user,
    staffRole: req.staffRole,
  }));
});

const listPermissionDefs = asyncHandler(async (_req, res) => {
  res.json({
    permissions: ADMIN_PERMISSION_DEFS,
    pagePermissions: PAGE_PERMISSION_DEFS,
    capabilities: CAPABILITY_PERMISSION_DEFS,
    staffRoles: Object.values(STAFF_ROLE_TEMPLATES),
  });
});

const listAuditLogs = asyncHandler(async (req, res) => {
  res.json(await auditSvc.listLogs(req.query));
});

const listBookChapters = asyncHandler(async (req, res) => {
  res.json(await recycleSvc.listBookChapters(Number(req.params.id)));
});

const recycleBook = asyncHandler(async (req, res) => {
  res.json(await recycleSvc.recycleBook(Number(req.params.id), {
    ...req.user,
    staffRole: req.staffRole,
  }));
});

const recycleChapter = asyncHandler(async (req, res) => {
  res.json(await recycleSvc.recycleChapter(Number(req.params.id), {
    ...req.user,
    staffRole: req.staffRole,
  }));
});

const listRecycle = asyncHandler(async (req, res) => {
  res.json(await recycleSvc.listRecycle(req.query));
});

const restoreRecycle = asyncHandler(async (req, res) => {
  res.json(await recycleSvc.restoreItem(Number(req.params.id), {
    ...req.user,
    staffRole: req.staffRole,
  }));
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
  const comment = await commentsSvc.moderate(
    Number(req.params.id),
    req.body.status,
    { ...req.user, staffRole: req.staffRole },
    req.adminPermissions,
  );
  res.json({ comment });
});

const stats = asyncHandler(async (_req, res) => {
  res.json(await adminSvc.stats());
});

const getPageSections = asyncHandler(async (_req, res) => {
  res.json({ pageSections: await pageSectionsSvc.getPageSections() });
});

const patchPageSections = asyncHandler(async (req, res) => {
  const pageSections = await pageSectionsSvc.updatePageSections(req.body);
  res.json({ pageSections });
});

const getHomeShelves = asyncHandler(async (_req, res) => {
  res.json(await bookTagsSvc.listHomeShelves());
});

const addHomeShelfBook = asyncHandler(async (req, res) => {
  res.json(await bookTagsSvc.addBookToShelf(req.params.tag, Number(req.body.bookId)));
});

const removeHomeShelfBook = asyncHandler(async (req, res) => {
  res.json(await bookTagsSvc.removeBookFromShelf(req.params.tag, Number(req.params.bookId)));
});

const addBookToAllHomeShelves = asyncHandler(async (req, res) => {
  res.json(await bookTagsSvc.addBookToAllShelves(Number(req.body.bookId)));
});

const getSettings = asyncHandler(async (_req, res) => {
  res.json({ settings: await adminSettingsSvc.getSettings() });
});

const patchSettings = asyncHandler(async (req, res) => {
  const settings = await adminSettingsSvc.updateSettings(req.body);
  res.json({ settings });
});

module.exports = {
  listUsers, updateUser, listStaff, createStaff, updateStaff, listPermissionDefs,
  listBooks, listTransactions,
  listComments, commentsByBook, commentsByChapter, moderateComment,
  stats, getPageSections, patchPageSections,
  getHomeShelves, addHomeShelfBook, removeHomeShelfBook, addBookToAllHomeShelves,
  getSettings, patchSettings, listAuditLogs,
  listBookChapters, recycleBook, recycleChapter, listRecycle, restoreRecycle,
};
