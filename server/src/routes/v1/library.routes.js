'use strict';

const router = require('express').Router();

const validate = require('../../middleware/validate');
const { authRequired } = require('../../middleware/auth');
const ctrl = require('../../controllers/library.controller');
const v = require('../../validators/library.validators');

router.use(authRequired);

router.get('/',           validate(v.list),       ctrl.list);
router.get('/contains',   validate(v.contains),   ctrl.contains);
router.get('/status',     validate(v.statusMany), ctrl.statusMany);
router.post('/',          validate(v.add),        ctrl.add);
router.patch('/:bookId/status', validate(v.setStatus), ctrl.setStatus);
router.delete('/:bookId', validate(v.remove),     ctrl.remove);

module.exports = router;
