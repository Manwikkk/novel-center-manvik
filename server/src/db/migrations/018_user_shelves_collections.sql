-- User reading shelves (library status) and custom collections.
-- Idempotent: gated ALTERs + CREATE TABLE IF NOT EXISTS.

SET NAMES utf8mb4;

-- library.reading_status
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'library'
               AND COLUMN_NAME = 'reading_status');
SET @sql := IF(@col = 0,
  "ALTER TABLE library ADD COLUMN reading_status ENUM('active','on_hold','archive','dropped') NOT NULL DEFAULT 'active' AFTER added_at",
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- idx_library_user_status
SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'library'
               AND INDEX_NAME = 'idx_library_user_status');
SET @sql := IF(@idx = 0,
  'ALTER TABLE library ADD KEY idx_library_user_status (user_id, reading_status, added_at)',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS user_collections (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(120)    NOT NULL,
  visibility  ENUM('public','private') NOT NULL DEFAULT 'private',
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_collections_name (user_id, name),
  KEY idx_user_collections_user (user_id, updated_at),
  CONSTRAINT fk_user_collections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collection_books (
  collection_id BIGINT UNSIGNED NOT NULL,
  book_id       BIGINT UNSIGNED NOT NULL,
  added_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (collection_id, book_id),
  KEY idx_collection_books_book (book_id),
  CONSTRAINT fk_collection_books_collection FOREIGN KEY (collection_id) REFERENCES user_collections(id) ON DELETE CASCADE,
  CONSTRAINT fk_collection_books_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
