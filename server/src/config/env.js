'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function required(name) {
  const v = process.env[name];
  if (!v || String(v).trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '4000')),
  db: {
    host: optional('DB_HOST', '127.0.0.1'),
    port: Number(optional('DB_PORT', '3306')),
    user: required('DB_USER'),
    password: optional('DB_PASSWORD', ''),
    database: required('DB_NAME'),
    connectionLimit: Number(optional('DB_CONNECTION_LIMIT', '10')),
  },
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: optional('JWT_ACCESS_TTL', '15m'),
    refreshTtl: optional('JWT_REFRESH_TTL', '7d'),
  },
  cors: {
    origins: optional('CORS_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  google: {
    clientId: optional('GOOGLE_CLIENT_ID', ''),
  },
  storage: {
    driver: optional('STORAGE_DRIVER', 'local'),
    localDir: optional('STORAGE_LOCAL_DIR', 'uploads'),
    publicBaseUrl: optional('STORAGE_PUBLIC_BASE_URL', 'http://localhost:4000/uploads'),
    gcs: {
      projectId: optional('GCS_PROJECT_ID', ''),
      clientEmail: optional('GCS_CLIENT_EMAIL', ''),
      privateKey: optional('GCS_PRIVATE_KEY', ''),
      bucket: optional('GCS_BUCKET', ''),
      publicBaseUrl: optional('GCS_PUBLIC_BASE_URL', 'https://storage.googleapis.com'),
    },
    s3: {
      bucket: optional('S3_BUCKET', ''),
      region: optional('S3_REGION', ''),
      accessKeyId: optional('S3_ACCESS_KEY_ID', ''),
      secretAccessKey: optional('S3_SECRET_ACCESS_KEY', ''),
      publicBaseUrl: optional('S3_PUBLIC_BASE_URL', ''),
    },
  },
};

module.exports = env;
