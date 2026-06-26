-- Admin toggle for Continue Reading home section.

SET NAMES utf8mb4;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'site_home_page_config'
               AND COLUMN_NAME = 'continue_reading');
SET @sql := IF(@col = 0,
  'ALTER TABLE site_home_page_config ADD COLUMN continue_reading TINYINT(1) NOT NULL DEFAULT 1 AFTER recommended',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
