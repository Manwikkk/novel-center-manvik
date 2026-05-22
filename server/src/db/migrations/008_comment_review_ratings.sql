-- Optional star ratings JSON for book-level review comments.
SET NAMES utf8mb4;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'comments'
               AND COLUMN_NAME = 'review_ratings');
SET @sql := IF(@col = 0,
  'ALTER TABLE comments ADD COLUMN review_ratings JSON NULL AFTER is_spoiler',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
