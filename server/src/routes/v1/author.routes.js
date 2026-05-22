'use strict';

const router = require('express').Router();

const { authRequired } = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const ctrl = require('../../controllers/author.controller');
const v = require('../../validators/author.validators');

router.use(authRequired, requireRole('author', 'admin'));

router.get('/earnings', ctrl.earnings);
router.get('/books/:bookId/stats', validate(v.bookStats), ctrl.bookStats);

module.exports = router;
