-- Novel Center: how a member uses the platform — reader, creator (author studio
-- first) or both. Drives the site navigation and the post-login landing page.
-- Idempotent: safe to run more than once.

SET NAMES utf8mb4;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'experience');
SET @sql := IF(@col = 0,
  "ALTER TABLE users ADD COLUMN experience ENUM('reader','creator','both') NOT NULL DEFAULT 'reader' AFTER role",
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Existing authors keep every tool they already had: reader features plus the studio.
UPDATE users SET experience = 'both' WHERE role IN ('author', 'admin') AND experience = 'reader';
