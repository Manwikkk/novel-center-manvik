'use strict';

const router = require('express').Router();

const validate = require('../../middleware/validate');
const { authRequired } = require('../../middleware/auth');
const ctrl = require('../../controllers/reading.controller');
const v = require('../../validators/reading.validators');

router.use(authRequired);

router.get('/recent',    validate(v.recent),       ctrl.recent);
router.post('/progress', validate(v.saveProgress), ctrl.saveProgress);

module.exports = router;
