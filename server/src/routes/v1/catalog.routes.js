'use strict';

const router = require('express').Router();

const validate = require('../../middleware/validate');
const { authOptional, authRequired } = require('../../middleware/auth');
const ctrl = require('../../controllers/catalog.controller');
const v = require('../../validators/catalog.validators');

router.get('/categories', authOptional, ctrl.listCategories);
router.get('/languages', authOptional, ctrl.listLanguages);
router.get('/content-tags', authOptional, ctrl.listContentTags);
router.post('/content-tags', authRequired, validate(v.createContentTag), ctrl.createContentTag);

module.exports = router;
