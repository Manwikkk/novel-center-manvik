-- Novel Center: moderation queue support.
--   * comment_reports gain a resolution state so handled reports leave the queue.
--   * book_reports lets readers report a novel (one report per user per book).
-- Idempotent: gated ALTERs + CREATE TABLE IF NOT EXISTS.

SET NAMES utf8mb4;

-- comment_reports.status
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'comment_reports'
               AND COLUMN_NAME = 'status');
SET @sql := IF(@col = 0,
  "ALTER TABLE comment_reports ADD COLUMN status ENUM('open','resolved') NOT NULL DEFAULT 'open' AFTER details",
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- comment_reports.resolution
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'comment_reports'
               AND COLUMN_NAME = 'resolution');
SET @sql := IF(@col = 0,
  'ALTER TABLE comment_reports ADD COLUMN resolution VARCHAR(32) NULL AFTER status',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- comment_reports.resolved_by
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'comment_reports'
               AND COLUMN_NAME = 'resolved_by');
SET @sql := IF(@col = 0,
  'ALTER TABLE comment_reports ADD COLUMN resolved_by BIGINT UNSIGNED NULL AFTER resolution',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- comment_reports.resolved_at
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'comment_reports'
               AND COLUMN_NAME = 'resolved_at');
SET @sql := IF(@col = 0,
  'ALTER TABLE comment_reports ADD COLUMN resolved_at TIMESTAMP NULL AFTER resolved_by',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idx_comment_reports_status
SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'comment_reports'
               AND INDEX_NAME = 'idx_comment_reports_status');
SET @sql := IF(@idx = 0,
  'ALTER TABLE comment_reports ADD KEY idx_comment_reports_status (status, created_at)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS book_reports (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  book_id     BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  reason      VARCHAR(64)     NOT NULL,
  details     VARCHAR(500)    NULL,
  status      ENUM('open','resolved') NOT NULL DEFAULT 'open',
  resolution  VARCHAR(32)     NULL,
  resolved_by BIGINT UNSIGNED NULL,
  resolved_at TIMESTAMP       NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_book_reports_user (book_id, user_id),
  KEY idx_book_reports_book (book_id),
  KEY idx_book_reports_status (status, created_at),
  CONSTRAINT fk_book_reports_book FOREIGN KEY (book_id)
    REFERENCES books(id) ON DELETE CASCADE,
  CONSTRAINT fk_book_reports_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_book_reports_resolver FOREIGN KEY (resolved_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
