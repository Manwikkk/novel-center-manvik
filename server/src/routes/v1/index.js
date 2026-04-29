'use strict';

const router = require('express').Router();

router.use('/auth',     require('./auth.routes'));
router.use('/books',    require('./books.routes'));
router.use('/chapters', require('./chapters.routes'));
router.use('/wallet',   require('./wallet.routes'));
router.use('/comments', require('./comments.routes'));
router.use('/library',  require('./library.routes'));
router.use('/authors',  require('./authors.routes'));
router.use('/reading',  require('./reading.routes'));
router.use('/author',   require('./author.routes'));
router.use('/admin',    require('./admin.routes'));

module.exports = router;
