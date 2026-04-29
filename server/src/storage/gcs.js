'use strict';

const crypto = require('crypto');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const env = require('../config/env');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    const err = new Error('Unsupported image type');
    err.status = 422;
    err.code = 'UNSUPPORTED_FILE_TYPE';
    return cb(err);
  }
  return cb(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_BYTES },
});

function middleware(field = 'file') {
  return upload.single(field);
}

function requiredStorageEnv() {
  const cfg = env.storage.gcs || {};
  const missing = [];
  if (!cfg.projectId) missing.push('GCS_PROJECT_ID');
  if (!cfg.clientEmail) missing.push('GCS_CLIENT_EMAIL');
  if (!cfg.privateKey) missing.push('GCS_PRIVATE_KEY');
  if (!cfg.bucket) missing.push('GCS_BUCKET');
  if (missing.length) {
    const err = new Error(`GCS storage adapter is not configured. Missing: ${missing.join(', ')}`);
    err.status = 500;
    err.code = 'STORAGE_NOT_CONFIGURED';
    throw err;
  }
  return cfg;
}

function storageClient() {
  const cfg = requiredStorageEnv();
  // Support both real newlines and literal "\n" sequences.
  const privateKey = String(cfg.privateKey).includes('\\n')
    ? String(cfg.privateKey).replace(/\\n/g, '\n')
    : String(cfg.privateKey);

  return new Storage({
    projectId: cfg.projectId,
    credentials: {
      client_email: cfg.clientEmail,
      private_key: privateKey,
    },
  });
}

function extFor(mimetype, originalname) {
  const extByMime = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };
  return extByMime[mimetype] || (originalname && originalname.includes('.') ? `.${originalname.split('.').pop()}` : '');
}

async function persist(file, opts = {}) {
  if (!file) {
    const err = new Error('No file provided');
    err.status = 400;
    err.code = 'NO_FILE';
    throw err;
  }
  const cfg = requiredStorageEnv();
  const prefix = opts.prefix || 'covers';

  const id = crypto.randomBytes(12).toString('hex');
  const ext = extFor(file.mimetype, file.originalname);
  const key = `${prefix}/${id}${ext}`;

  const client = storageClient();
  const bucket = client.bucket(cfg.bucket);
  const gcsFile = bucket.file(key);

  await gcsFile.save(file.buffer, {
    resumable: false,
    contentType: file.mimetype,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  // Public URL assumes bucket/object is readable (Uniform public access or signed URLs).
  const base = (cfg.publicBaseUrl || 'https://storage.googleapis.com').replace(/\/$/, '');
  const url = `${base}/${cfg.bucket}/${key}`;

  return { url, key };
}

async function remove(key) {
  if (!key) return;
  const cfg = requiredStorageEnv();
  const client = storageClient();
  const bucket = client.bucket(cfg.bucket);
  await bucket.file(key).delete({ ignoreNotFound: true });
}

module.exports = { middleware, persist, remove };

