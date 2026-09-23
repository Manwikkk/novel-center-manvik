-- Engagement notifications: categories, structured metadata, dedupe keys,
-- and presented state so toast / celebration surfaces do not reappear after
-- refresh, route change, or reconnect. Idempotent gated ALTERs.

SET NAMES utf8mb4;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_notifications' AND COLUMN_NAME = 'category');
SET @sql := IF(@col = 0,
  "ALTER TABLE user_notifications ADD COLUMN category VARCHAR(40) NOT NULL DEFAULT 'system' AFTER type",
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_notifications' AND COLUMN_NAME = 'metadata');
SET @sql := IF(@col = 0,
  'ALTER TABLE user_notifications ADD COLUMN metadata JSON NULL AFTER link_url',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_notifications' AND COLUMN_NAME = 'dedupe_key');
SET @sql := IF(@col = 0,
  'ALTER TABLE user_notifications ADD COLUMN dedupe_key VARCHAR(160) NULL AFTER metadata',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_notifications' AND COLUMN_NAME = 'presentation');
SET @sql := IF(@col = 0,
  "ALTER TABLE user_notifications ADD COLUMN presentation ENUM('center','toast','celebration') NOT NULL DEFAULT 'center' AFTER dedupe_key",
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_notifications' AND COLUMN_NAME = 'presented_at');
SET @sql := IF(@col = 0,
  'ALTER TABLE user_notifications ADD COLUMN presented_at DATETIME NULL AFTER presentation',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_notifications' AND COLUMN_NAME = 'group_key');
SET @sql := IF(@col = 0,
  'ALTER TABLE user_notifications ADD COLUMN group_key VARCHAR(160) NULL AFTER presented_at',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_notifications' AND INDEX_NAME = 'uq_user_notifications_dedupe');
SET @sql := IF(@idx = 0,
  'ALTER TABLE user_notifications ADD UNIQUE KEY uq_user_notifications_dedupe (user_id, dedupe_key)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_notifications' AND INDEX_NAME = 'idx_user_notifications_surface');
SET @sql := IF(@idx = 0,
  'ALTER TABLE user_notifications ADD KEY idx_user_notifications_surface (user_id, presentation, presented_at, created_at)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_notifications' AND INDEX_NAME = 'idx_user_notifications_category');
SET @sql := IF(@idx = 0,
  'ALTER TABLE user_notifications ADD KEY idx_user_notifications_category (user_id, category, is_read, created_at)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill categories from legacy type values.
UPDATE user_notifications
   SET category = CASE type
     WHEN 'task' THEN 'tasks'
     WHEN 'reward' THEN 'rewards'
     WHEN 'checkin' THEN 'rewards'
     WHEN 'badge' THEN 'achievements'
     WHEN 'event' THEN 'events'
     WHEN 'follow' THEN 'system'
     WHEN 'chapter' THEN 'system'
     ELSE 'system'
   END
 WHERE category = 'system' OR category = '';
