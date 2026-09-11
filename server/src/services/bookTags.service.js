'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { HOME_SHELVES, HOME_SHELF_TAGS, isHomeShelfTag } = require('../constants/homeShelves');

function assertTag(tag) {
  if (!isHomeShelfTag(tag)) {
    throw errors.badRequest('Unknown home section');
  }
}

function rowToBook(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    coverUrl: row.cover_url,
    status: row.status,
    authorName: row.author_name || null,
    score: row.score == null ? null : Number(row.score),
  };
}

async function getPublishedBook(bookId) {
  const [rows] = await pool.execute(
    `SELECT b.id, b.slug, b.title, b.cover_url, b.status, b.score, b.recycled_at,
            u.display_name AS author_name
       FROM books b
       JOIN users u ON u.id = b.author_id
      WHERE b.id = ?
      LIMIT 1`,
    [bookId],
  );
  const book = rows[0];
  if (!book) throw errors.notFound('Book not found');
  if (book.recycled_at) throw errors.badRequest('This book is in the recycle bin');
  if (book.status !== 'published') {
    throw errors.badRequest('Only published books can appear on the home page');
  }
  return book;
}

async function listHomeShelves() {
  const [rows] = await pool.execute(
    `SELECT b.id, b.slug, b.title, b.cover_url, b.status, b.score,
            u.display_name AS author_name,
            bt.tag
       FROM book_tags bt
       JOIN books b ON b.id = bt.book_id
       JOIN users u ON u.id = b.author_id
      WHERE bt.tag IN (${HOME_SHELF_TAGS.map(() => '?').join(', ')})
        AND b.status = 'published'
        AND b.recycled_at IS NULL
      ORDER BY bt.tag ASC, b.id ASC`,
    HOME_SHELF_TAGS,
  );

  const byTag = Object.fromEntries(HOME_SHELF_TAGS.map((tag) => [tag, []]));
  for (const row of rows) {
    if (!byTag[row.tag]) continue;
    byTag[row.tag].push(rowToBook(row));
  }

  return {
    shelves: HOME_SHELVES.map((shelf) => ({
      ...shelf,
      books: byTag[shelf.tag] || [],
    })),
  };
}

async function addBookToShelf(tag, bookId) {
  assertTag(tag);
  await getPublishedBook(bookId);
  await pool.execute(
    'INSERT IGNORE INTO book_tags (book_id, tag) VALUES (?, ?)',
    [bookId, tag],
  );
  return listHomeShelves();
}

async function removeBookFromShelf(tag, bookId) {
  assertTag(tag);
  await pool.execute(
    'DELETE FROM book_tags WHERE book_id = ? AND tag = ?',
    [bookId, tag],
  );
  return listHomeShelves();
}

async function addBookToAllShelves(bookId) {
  const book = await getPublishedBook(bookId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const tag of HOME_SHELF_TAGS) {
      await conn.execute(
        'INSERT IGNORE INTO book_tags (book_id, tag) VALUES (?, ?)',
        [bookId, tag],
      );
    }
    if (book.score == null) {
      await conn.execute('UPDATE books SET score = 4.8 WHERE id = ? AND score IS NULL', [bookId]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return listHomeShelves();
}

module.exports = {
  listHomeShelves,
  addBookToShelf,
  removeBookFromShelf,
  addBookToAllShelves,
};
