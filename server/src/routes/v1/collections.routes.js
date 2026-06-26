'use strict';

const router = require('express').Router();

const validate = require('../../middleware/validate');
const { authRequired } = require('../../middleware/auth');
const ctrl = require('../../controllers/collections.controller');
const v = require('../../validators/collections.validators');

router.use(authRequired);

router.get('/contains', validate(v.contains), ctrl.contains);
router.get('/',        validate(v.list),     ctrl.list);
router.post('/',       validate(v.create),   ctrl.create);
router.patch('/:id',   validate(v.update),   ctrl.update);
router.delete('/:id',  validate(v.remove),   ctrl.remove);
router.get('/:id/books',              validate(v.listBooks),  ctrl.listBooks);
router.post('/:id/books',             validate(v.addBook),    ctrl.addBook);
router.delete('/:id/books/:bookId', validate(v.removeBook), ctrl.removeBook);

module.exports = router;
