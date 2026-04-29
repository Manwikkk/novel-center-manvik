'use strict';

const router = require('express').Router();

const { authRequired } = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const ctrl = require('../../controllers/author.controller');

router.use(authRequired, requireRole('author', 'admin'));

router.get('/earnings', ctrl.earnings);

module.exports = router;
