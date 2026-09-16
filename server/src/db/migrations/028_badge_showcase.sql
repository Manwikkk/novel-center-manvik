-- Badge showcase: readers pin up to four earned badges to the top of their profile.
-- Idempotent: gated ALTER.

SET NAMES utf8mb4;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_achievements' AND COLUMN_NAME = 'pinned_order');
SET @sql := IF(@col = 0,
  'ALTER TABLE user_achievements ADD COLUMN pinned_order TINYINT UNSIGNED NULL AFTER earned_at',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
