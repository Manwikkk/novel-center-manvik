'use strict';

const pool = require('../db/pool');

async function publishScheduledChapters() {
  // Compare against app-server UTC, not MySQL UTC_TIMESTAMP().
  // Remote DB hosts may have a skewed system clock; schedules are stored from client ISO (real UTC).
  const now = new Date();
  const [result] = await pool.execute(
    `UPDATE chapters
       SET status = 'published', scheduled_publish_at = NULL
     WHERE status = 'draft'
       AND scheduled_publish_at IS NOT NULL
       AND scheduled_publish_at <= ?`,
    [now],
  );
  const count = result.affectedRows || 0;
  if (count > 0) {
    console.log(`> Published ${count} scheduled chapter(s)`);
  }
  return count;
}

function startPublishScheduledChaptersJob(intervalMs = 60_000) {
  publishScheduledChapters().catch((err) => {
    console.error('> publishScheduledChapters failed:', err.message);
  });
  return setInterval(() => {
    publishScheduledChapters().catch((err) => {
      console.error('> publishScheduledChapters failed:', err.message);
    });
  }, intervalMs);
}

module.exports = { publishScheduledChapters, startPublishScheduledChaptersJob };
