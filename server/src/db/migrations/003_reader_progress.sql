-- Novel Center: per-user reading progress per chapter.
-- Idempotent: safe to re-run.
--
-- Each (user, chapter) pair has at most one row. We track the latest
-- scroll percent (0-100) and a coarse position so the home screen can
-- power "Continue Reading" / "Recently Opened" with real data.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS reader_progress (
  user_id     BIGINT UNSIGNED  NOT NULL,
  chapter_id  BIGINT UNSIGNED  NOT NULL,
  book_id     BIGINT UNSIGNED  NOT NULL,
  percent     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  position    INT UNSIGNED     NOT NULL DEFAULT 0,
  updated_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, chapter_id),
  KEY idx_progress_user_updated (user_id, updated_at),
  KEY idx_progress_user_book    (user_id, book_id, updated_at),
  CONSTRAINT fk_progress_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_progress_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_book    FOREIGN KEY (book_id)    REFERENCES books(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
