-- Novel Center: curated categories & languages for books, plus author-facing
-- content tags (separate from `book_tags`, which remains for home-section shelves).
--
-- Idempotent: CREATE IF NOT EXISTS + gated ALTERs.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS catalog_categories (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(64)     NOT NULL,
  label        VARCHAR(120)    NOT NULL,
  sort_order   INT             NOT NULL DEFAULT 0,
  is_active    TINYINT(1)      NOT NULL DEFAULT 1,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_catalog_categories_slug (slug),
  KEY idx_catalog_categories_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_languages (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code         VARCHAR(20)     NOT NULL,
  label        VARCHAR(80)     NOT NULL,
  sort_order   INT             NOT NULL DEFAULT 0,
  is_active    TINYINT(1)      NOT NULL DEFAULT 1,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_catalog_languages_code (code),
  KEY idx_catalog_languages_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_content_tags (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(64)     NOT NULL,
  label        VARCHAR(120)    NOT NULL,
  sort_order   INT             NOT NULL DEFAULT 0,
  is_active    TINYINT(1)      NOT NULL DEFAULT 1,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_catalog_content_tags_slug (slug),
  KEY idx_catalog_content_tags_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS book_content_tags (
  book_id BIGINT UNSIGNED NOT NULL,
  tag_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (book_id, tag_id),
  KEY idx_book_content_tags_tag (tag_id),
  CONSTRAINT fk_book_content_tags_book FOREIGN KEY (book_id)
    REFERENCES books(id) ON DELETE CASCADE,
  CONSTRAINT fk_book_content_tags_tag FOREIGN KEY (tag_id)
    REFERENCES catalog_content_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- books.category_id
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'books'
               AND COLUMN_NAME = 'category_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE books ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER category',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'books'
               AND CONSTRAINT_NAME = 'fk_books_catalog_category');
SET @sql := IF(@idx = 0,
  'ALTER TABLE books ADD CONSTRAINT fk_books_catalog_category FOREIGN KEY (category_id) REFERENCES catalog_categories(id) ON DELETE SET NULL',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- books.language_id
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'books'
               AND COLUMN_NAME = 'language_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE books ADD COLUMN language_id BIGINT UNSIGNED NULL AFTER language',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'books'
               AND CONSTRAINT_NAME = 'fk_books_catalog_language');
SET @sql := IF(@idx = 0,
  'ALTER TABLE books ADD CONSTRAINT fk_books_catalog_language FOREIGN KEY (language_id) REFERENCES catalog_languages(id) ON DELETE SET NULL',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Seed default catalog rows (safe to re-run).
INSERT INTO catalog_languages (code, label, sort_order, is_active) VALUES
  ('en', 'English', 10, 1),
  ('es', 'Spanish', 20, 1),
  ('fr', 'French', 30, 1),
  ('de', 'German', 40, 1),
  ('bn', 'Bengali', 50, 1),
  ('hi', 'Hindi', 60, 1)
ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order), is_active = VALUES(is_active);

INSERT INTO catalog_categories (slug, label, sort_order, is_active) VALUES
  ('historical-fiction', 'Historical Fiction', 10, 1),
  ('literary-fiction', 'Literary Fiction', 20, 1),
  ('mystery', 'Mystery', 30, 1),
  ('romance', 'Romance', 40, 1),
  ('fantasy', 'Fantasy', 50, 1),
  ('science-fiction', 'Science Fiction', 60, 1),
  ('thriller', 'Thriller', 70, 1),
  ('general-fiction', 'General Fiction', 80, 1),
  ('poetry', 'Poetry', 90, 1),
  ('non-fiction', 'Non-Fiction', 100, 1),
  ('speculative', 'Speculative', 110, 1),
  ('classic', 'Classic', 120, 1)
ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order), is_active = VALUES(is_active);

INSERT INTO catalog_content_tags (slug, label, sort_order, is_active) VALUES
  ('slow-burn', 'Slow burn', 10, 1),
  ('dual-pov', 'Dual POV', 20, 1),
  ('found-family', 'Found family', 30, 1),
  ('epistolary', 'Epistolary', 40, 1),
  ('historical-setting', 'Historical setting', 50, 1)
ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order), is_active = VALUES(is_active);

-- Backfill FKs from legacy varchar columns where labels match.
UPDATE books b
  JOIN catalog_categories c ON c.label = b.category
   SET b.category_id = c.id
 WHERE b.category IS NOT NULL AND b.category <> '' AND (b.category_id IS NULL OR b.category_id = 0);

UPDATE books b
  JOIN catalog_languages l ON l.code = b.language
   SET b.language_id = l.id
 WHERE b.language IS NOT NULL AND b.language <> '' AND b.language_id IS NULL;

UPDATE books SET language_id = (SELECT id FROM catalog_languages WHERE code = 'en' LIMIT 1)
 WHERE language_id IS NULL;
