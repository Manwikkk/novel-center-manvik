-- Novel Center: user library (saved books)
-- Idempotent: safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS library (
  user_id   BIGINT UNSIGNED NOT NULL,
  book_id   BIGINT UNSIGNED NOT NULL,
  added_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, book_id),
  KEY idx_library_user_added (user_id, added_at),
  KEY idx_library_book        (book_id),
  CONSTRAINT fk_library_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_library_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
