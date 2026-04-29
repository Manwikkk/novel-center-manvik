'use strict';

const env = require('../config/env');
const local = require('./local');
const s3 = require('./s3');
const gcs = require('./gcs');

// Adapter interface (both implementations expose):
//   middleware()                  -> Express middleware exposing req.file
//   persist(file, opts)           -> { url, key }   (called with multer file)
//   remove(key)                   -> Promise<void>
const driver = (env.storage.driver || 'local').toLowerCase();
const adapter =
  driver === 's3' ? s3
    : driver === 'gcs' ? gcs
      : local;

module.exports = adapter;
