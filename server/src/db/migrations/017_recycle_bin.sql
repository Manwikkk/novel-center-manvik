-- Soft-delete recycle bin for books and chapters.

ALTER TABLE books
  ADD COLUMN recycled_at TIMESTAMP NULL AFTER updated_at,
  ADD COLUMN recycled_by BIGINT UNSIGNED NULL AFTER recycled_at,
  ADD KEY idx_books_recycled (recycled_at);

ALTER TABLE chapters
  ADD COLUMN recycled_at TIMESTAMP NULL AFTER updated_at,
  ADD COLUMN recycled_by BIGINT UNSIGNED NULL AFTER recycled_at,
  ADD KEY idx_chapters_recycled (recycled_at);

CREATE TABLE IF NOT EXISTS recycle_bin (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entity_type   ENUM('book','chapter') NOT NULL,
  entity_id     BIGINT UNSIGNED NOT NULL,
  book_id       BIGINT UNSIGNED NULL,
  title         VARCHAR(220)    NOT NULL,
  snapshot      JSON            NOT NULL,
  deleted_by    BIGINT UNSIGNED NOT NULL,
  deleted_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  restored_at   TIMESTAMP       NULL,
  restored_by   BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_recycle_active (restored_at, deleted_at),
  KEY idx_recycle_entity (entity_type, entity_id),
  CONSTRAINT fk_recycle_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
