'use strict';

const router = require('express').Router();
const validate = require('../../middleware/validate');
const { authRequired } = require('../../middleware/auth');
const ctrl = require('../../controllers/tasks.controller');

router.get('/', authRequired, ctrl.board);

module.exports = router;
