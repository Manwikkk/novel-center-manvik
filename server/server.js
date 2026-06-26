'use strict';

const app = require('./src/app');
const env = require('./src/config/env');
const { startPublishScheduledChaptersJob } = require('./src/jobs/publishScheduledChapters');
const { startExpireTemporarySuspensionsJob } = require('./src/jobs/expireTemporarySuspensions');

let publishJobId = null;
let expireSuspensionsJobId = null;

const server = app.listen(env.port, () => {
  console.log(`> Novel Center API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  publishJobId = startPublishScheduledChaptersJob();
  expireSuspensionsJobId = startExpireTemporarySuspensionsJob();
});

function shutdown(signal) {
  console.log(`\n> ${signal} received, shutting down...`);
  if (publishJobId) clearInterval(publishJobId);
  if (expireSuspensionsJobId) clearInterval(expireSuspensionsJobId);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
