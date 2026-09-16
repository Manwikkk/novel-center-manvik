'use strict';

const { expireStale } = require('../services/rewards.service');

// Reward expiry is evaluated lazily on every read; this job only persists it so
// inventories and admin counts stay tidy.
async function runExpireRewards() {
  const count = await expireStale();
  if (count > 0) {
    console.log(`> Expired ${count} reward(s)`);
  }
  return count;
}

function startExpireRewardsJob(intervalMs = 5 * 60_000) {
  runExpireRewards().catch((err) => {
    console.error('> expireRewards failed:', err.message);
  });
  return setInterval(() => {
    runExpireRewards().catch((err) => {
      console.error('> expireRewards failed:', err.message);
    });
  }, intervalMs);
}

module.exports = { runExpireRewards, startExpireRewardsJob };
