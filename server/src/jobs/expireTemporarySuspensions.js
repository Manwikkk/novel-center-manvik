'use strict';

const { expireTemporarySuspensions } = require('../services/suspension.service');

async function runExpireTemporarySuspensions() {
  const count = await expireTemporarySuspensions();
  if (count > 0) {
    console.log(`> Cleared ${count} expired temporary suspension(s)`);
  }
  return count;
}

function startExpireTemporarySuspensionsJob(intervalMs = 60_000) {
  runExpireTemporarySuspensions().catch((err) => {
    console.error('> expireTemporarySuspensions failed:', err.message);
  });
  return setInterval(() => {
    runExpireTemporarySuspensions().catch((err) => {
      console.error('> expireTemporarySuspensions failed:', err.message);
    });
  }, intervalMs);
}

module.exports = { runExpireTemporarySuspensions, startExpireTemporarySuspensionsJob };
