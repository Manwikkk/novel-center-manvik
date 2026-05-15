-- Novel Center: per-comment like/dislike (one reaction per user per comment)
-- and optional spoiler flag on comments.
--
-- Idempotent: gated ALTER / CREATE IF NOT EXISTS.

SET NAMES utf8mb4;

-- comments.is_spoiler
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'comments'
               AND COLUMN_NAME = 'is_spoiler');
SET @sql := IF(@col = 0,
  'ALTER TABLE comments ADD COLUMN is_spoiler TINYINT(1) NOT NULL DEFAULT 0 AFTER body',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS comment_reactions (
  comment_id BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  reaction   ENUM('like','dislike') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id, user_id),
  KEY idx_comment_reactions_user (user_id),
  CONSTRAINT fk_comment_reactions_comment FOREIGN KEY (comment_id)
    REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_reactions_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
