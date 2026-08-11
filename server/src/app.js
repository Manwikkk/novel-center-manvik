'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const env = require('./config/env');
const v1 = require('./routes/v1');
const { errorHandler, notFoundHandler } = require('./middleware/error');

const app = express();

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (env.cors.origins.includes('*') || env.cors.origins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  }),
);

if (env.nodeEnv !== 'test') app.use(morgan('dev'));

// Static uploads (local storage adapter)
if (env.storage.driver === 'local') {
  const root = path.resolve(__dirname, '..', env.storage.localDir);
  app.use('/uploads', express.static(root, { maxAge: '7d' }));
}

// Editorial cover artwork lives under client/public/stitch on the web. The
// mobile app pulls these from the API host, so we re-expose them here.
const stitchDir = path.resolve(__dirname, '..', '..', 'client', 'public', 'stitch');
app.use('/stitch', express.static(stitchDir, { maxAge: '7d' }));
const imagesDir = path.resolve(__dirname, '..', '..', 'client', 'public', 'images');
app.use('/images', express.static(imagesDir, { maxAge: '7d' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'novel-center-api', env: env.nodeEnv });
});

app.use('/api/v1', v1);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
