'use strict';

// S3-compatible storage adapter stub. Mirrors local.js's interface so it can
// be swapped via STORAGE_DRIVER=s3 once the AWS SDK is wired in.

const multer = require('multer');

function notImplemented() {
  const err = new Error('S3 storage adapter is not configured. Set STORAGE_DRIVER=local or implement src/storage/s3.js.');
  err.status = 500;
  err.code = 'STORAGE_NOT_CONFIGURED';
  throw err;
}

function middleware(field = 'file') {
  // Buffer in memory; a real impl would stream to S3 inside persist().
  return multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }).single(field);
}

async function persist(_file /*, opts */) { notImplemented(); }
async function remove(_key) { notImplemented(); }

module.exports = { middleware, persist, remove };
