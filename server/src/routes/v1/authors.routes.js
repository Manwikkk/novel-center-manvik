'use strict';

const router = require('express').Router();

const validate = require('../../middleware/validate');
const ctrl = require('../../controllers/authors.controller');
const v = require('../../validators/authors.validators');

router.get('/',     validate(v.list),    ctrl.list);
router.get('/:id',  validate(v.getById), ctrl.getById);

module.exports = router;
