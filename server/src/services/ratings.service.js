'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { calendarDate } = require('../utils/calendarDay');

async function isNewArrival(bookId) {
  const [rows] = await pool.execute(
    "SELECT 1 FROM book_tags WHERE book_id = ? AND tag = 'new_arrivals' LIMIT 1",
    [bookId],
  );
  return !!rows[0];
}

async function assertPublishedBook(bookId) {
  const [rows] = await pool.execute(
    `SELECT id FROM books
      WHERE id = ? AND status = 'published' AND recycled_at IS NULL
      LIMIT 1`,
    [bookId],
  );
  if (!rows[0]) throw errors.notFound('Book not found');
}

async function getMine(userId, bookId) {
  if (!userId) return { bookId: Number(bookId), score: null };
  const [rows] = await pool.execute(
    'SELECT score, created_at, updated_at FROM book_ratings WHERE user_id = ? AND book_id = ? LIMIT 1',
    [userId, bookId],
  );
  return {
    bookId: Number(bookId),
    score: rows[0] ? Number(rows[0].score) : null,
    createdAt: rows[0]?.created_at || null,
    updatedAt: rows[0]?.updated_at || null,
  };
}

async function rate(userId, bookId, score) {
  const value = Number(score);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw errors.badRequest('Rating must be a whole number from 1 to 5');
  }
  await assertPublishedBook(bookId);
  const [existing] = await pool.execute(
    'SELECT score FROM book_ratings WHERE user_id = ? AND book_id = ? LIMIT 1',
    [userId, bookId],
  );
  const created = !existing[0];
  const tasks = require('./tasks.service');
  const zone = await tasks.platformZone();
  const day = calendarDate(zone);
  const arrival = created ? await isNewArrival(bookId) : false;
  if (created) {
    await pool.execute(
      `INSERT INTO book_ratings (user_id, book_id, score, new_arrival, rated_day)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, bookId, value, arrival ? 1 : 0, day],
    );
    await tasks.safeIngest(userId);
  } else {
    await pool.execute(
      'UPDATE book_ratings SET score = ? WHERE user_id = ? AND book_id = ?',
      [value, userId, bookId],
    );
  }
  return { bookId: Number(bookId), score: value, created };
}

module.exports = { getMine, rate };
