-- Novel Center: extra columns on books for the dynamic home page,
-- plus a book_tags join table that maps a book into one or more
-- home sections (weekly_featured, new_arrivals, rising_fictions, ...).
--
-- Idempotent: every ALTER is gated by an INFORMATION_SCHEMA check so the
-- migration can be re-run without manual rollback.

SET NAMES utf8mb4;

-- books.score
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'books'
               AND COLUMN_NAME = 'score');
SET @sql := IF(@col = 0,
  'ALTER TABLE books ADD COLUMN score DECIMAL(3,2) NULL AFTER status',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- books.chapter_num
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'books'
               AND COLUMN_NAME = 'chapter_num');
SET @sql := IF(@col = 0,
  'ALTER TABLE books ADD COLUMN chapter_num INT UNSIGNED NOT NULL DEFAULT 0 AFTER score',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- books.external_book_id
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'books'
               AND COLUMN_NAME = 'external_book_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE books ADD COLUMN external_book_id VARCHAR(64) NULL AFTER chapter_num',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- books.external_link
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'books'
               AND COLUMN_NAME = 'external_link');
SET @sql := IF(@col = 0,
  'ALTER TABLE books ADD COLUMN external_link VARCHAR(500) NULL AFTER external_book_id',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Unique key on books.external_book_id
SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'books'
               AND INDEX_NAME = 'uniq_books_external_book_id');
SET @sql := IF(@idx = 0,
  'ALTER TABLE books ADD UNIQUE KEY uniq_books_external_book_id (external_book_id)',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- book_tags join table (one row per (book, section) pair).
CREATE TABLE IF NOT EXISTS book_tags (
  book_id BIGINT UNSIGNED NOT NULL,
  tag     VARCHAR(64)     NOT NULL,
  PRIMARY KEY (book_id, tag),
  KEY idx_book_tags_tag (tag),
  CONSTRAINT fk_book_tags_book FOREIGN KEY (book_id)
    REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
