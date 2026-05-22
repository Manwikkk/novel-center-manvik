-- Novel Center: author book metadata (type, genre, length, content rating, etc.)

SET NAMES utf8mb4;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'book_type');
SET @sql := IF(@col = 0,
  "ALTER TABLE books ADD COLUMN book_type ENUM('novel','fan_fic') NOT NULL DEFAULT 'novel' AFTER title",
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'leading_gender');
SET @sql := IF(@col = 0,
  "ALTER TABLE books ADD COLUMN leading_gender ENUM('male','female') NOT NULL DEFAULT 'male' AFTER book_type",
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'genre');
SET @sql := IF(@col = 0,
  'ALTER TABLE books ADD COLUMN genre VARCHAR(80) NULL AFTER leading_gender',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'abbreviation');
SET @sql := IF(@col = 0,
  'ALTER TABLE books ADD COLUMN abbreviation VARCHAR(15) NULL AFTER genre',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'book_length');
SET @sql := IF(@col = 0,
  "ALTER TABLE books ADD COLUMN book_length ENUM('novels','short_stories','super_short_stories') NULL AFTER abbreviation",
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'warning_notice');
SET @sql := IF(@col = 0,
  "ALTER TABLE books ADD COLUMN warning_notice ENUM(
    'general_audiences',
    'parental_guidance',
    'parents_cautioned',
    'restricted',
    'no_one_17'
  ) NULL AFTER book_length",
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
