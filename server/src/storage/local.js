'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');

const ROOT = path.resolve(__dirname, '../../', env.storage.localDir);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

ensureDir(ROOT);

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const sub = path.join(ROOT, 'covers');
    ensureDir(sub);
    cb(null, sub);
  },
  filename: (_req, file, cb) => {
    const id = crypto.randomBytes(12).toString('hex');
    const extByMime = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };
    const ext = extByMime[file.mimetype] || path.extname(file.originalname) || '';
    cb(null, `${id}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    const err = new Error('Unsupported image type');
    err.status = 422;
    err.code = 'UNSUPPORTED_FILE_TYPE';
    return cb(err);
  }
  return cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_BYTES } });

function middleware(field = 'file') {
  return upload.single(field);
}

async function persist(file /*, opts */) {
  // The file is already on disk thanks to multer.diskStorage.
  // Build URL relative to STORAGE_PUBLIC_BASE_URL.
  const rel = path.relative(ROOT, file.path).split(path.sep).join('/');
  const url = `${env.storage.publicBaseUrl.replace(/\/$/, '')}/${rel}`;
  return { url, key: rel };
}

async function remove(key) {
  if (!key) return;
  const p = path.join(ROOT, key);
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch (_) { /* ignore */ }
  }
}

module.exports = { middleware, persist, remove, _root: ROOT };
