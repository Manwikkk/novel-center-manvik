'use strict';

const pool = require('../db/pool');

const DEFAULT_TEMPORARY_BAN_DAYS = 5;

async function getSettings() {
  try {
    const [rows] = await pool.execute(
      'SELECT temporary_ban_days FROM admin_settings WHERE id = 1 LIMIT 1',
    );
    const days = rows[0] ? Number(rows[0].temporary_ban_days) : DEFAULT_TEMPORARY_BAN_DAYS;
    return { temporaryBanDays: days > 0 ? days : DEFAULT_TEMPORARY_BAN_DAYS };
  } catch (e) {
    if (e && e.code === 'ER_NO_SUCH_TABLE') {
      return { temporaryBanDays: DEFAULT_TEMPORARY_BAN_DAYS };
    }
    throw e;
  }
}

async function getTemporaryBanDays() {
  const { temporaryBanDays } = await getSettings();
  return temporaryBanDays;
}

async function updateSettings(patch) {
  const current = await getSettings();
  const next = { ...current };
  if (Object.prototype.hasOwnProperty.call(patch, 'temporaryBanDays')) {
    next.temporaryBanDays = patch.temporaryBanDays;
  }

  await pool.execute(
    `INSERT INTO admin_settings (id, temporary_ban_days)
     VALUES (1, ?)
     ON DUPLICATE KEY UPDATE temporary_ban_days = VALUES(temporary_ban_days)`,
    [next.temporaryBanDays],
  );
  return next;
}

module.exports = {
  DEFAULT_TEMPORARY_BAN_DAYS,
  getSettings,
  getTemporaryBanDays,
  updateSettings,
};
