-- Novel Center: user reports on comments/reviews (one report per user per comment).
--
-- Idempotent: CREATE IF NOT EXISTS.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS comment_reports (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  comment_id BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  reason     VARCHAR(64)     NOT NULL,
  details    VARCHAR(500)    NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_comment_reports_user (comment_id, user_id),
  KEY idx_comment_reports_comment (comment_id),
  KEY idx_comment_reports_user (user_id),
  CONSTRAINT fk_comment_reports_comment FOREIGN KEY (comment_id)
    REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_reports_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
