'use strict';

const pool = require('./pool');

// Run a function inside a single MySQL transaction. The provided fn receives
// a dedicated connection. If it throws, the tx is rolled back and the error
// re-thrown.
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* swallow */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { withTransaction };
