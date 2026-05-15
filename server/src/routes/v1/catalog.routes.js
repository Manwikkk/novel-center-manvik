'use strict';

const router = require('express').Router();

const validate = require('../../middleware/validate');
const { authOptional } = require('../../middleware/auth');
const ctrl = require('../../controllers/catalog.controller');

router.get('/categories', authOptional, ctrl.listCategories);
router.get('/languages', authOptional, ctrl.listLanguages);
router.get('/content-tags', authOptional, ctrl.listContentTags);

module.exports = router;
