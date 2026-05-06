'use strict';

const router = require('express').Router({ mergeParams: true });

const { authOptional } = require('../../middleware/auth');
const ctrl = require('../../controllers/home.controller');

router.get('/', authOptional, ctrl.getSections);

module.exports = router;
