-- Google OAuth + onboarding completion flag for new social sign-ups.

SET NAMES utf8mb4;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users'
               AND COLUMN_NAME = 'google_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL AFTER password_hash',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users'
               AND COLUMN_NAME = 'onboarding_completed');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN onboarding_completed TINYINT(1) NOT NULL DEFAULT 1 AFTER role',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users'
               AND INDEX_NAME = 'uniq_users_google_id');
SET @sql := IF(@idx = 0,
  'ALTER TABLE users ADD UNIQUE KEY uniq_users_google_id (google_id)',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Allow Google-only accounts (no local password).
ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL;
