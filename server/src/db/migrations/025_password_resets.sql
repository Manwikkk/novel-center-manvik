-- Novel Center: single-use password reset / account invite tokens.
-- Only the SHA-256 hash of a token is stored; the raw token travels in the email link.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS password_resets (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64)        NOT NULL,
  purpose     ENUM('reset','invite') NOT NULL DEFAULT 'reset',
  expires_at  TIMESTAMP       NOT NULL,
  used_at     TIMESTAMP       NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_password_resets_token (token_hash),
  KEY idx_password_resets_user (user_id, created_at),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
