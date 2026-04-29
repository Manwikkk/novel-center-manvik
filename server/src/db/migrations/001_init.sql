-- Novel Center initial schema
-- Engine: InnoDB, charset utf8mb4 for full Unicode (incl. emoji) support.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS chapter_unlocks;
DROP TABLE IF EXISTS chapters;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email           VARCHAR(190)     NOT NULL,
  password_hash   VARCHAR(255)     NOT NULL,
  display_name    VARCHAR(120)     NOT NULL,
  role            ENUM('admin','author','user') NOT NULL DEFAULT 'user',
  avatar_url      VARCHAR(500)     NULL,
  bio             TEXT             NULL,
  status          ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_users_email (email),
  KEY idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wallets (
  user_id     BIGINT UNSIGNED NOT NULL,
  balance     INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE books (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug              VARCHAR(220)    NOT NULL,
  author_id         BIGINT UNSIGNED NOT NULL,
  title             VARCHAR(220)    NOT NULL,
  synopsis          TEXT            NULL,
  cover_url         VARCHAR(500)    NULL,
  cover_storage_key VARCHAR(500)    NULL,
  category          VARCHAR(80)     NULL,
  language          VARCHAR(20)     NOT NULL DEFAULT 'en',
  status            ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_books_slug (slug),
  KEY idx_books_author_status (author_id, status),
  KEY idx_books_status_created (status, created_at),
  CONSTRAINT fk_books_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chapters (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  book_id      BIGINT UNSIGNED NOT NULL,
  idx          INT UNSIGNED    NOT NULL,
  title        VARCHAR(220)    NOT NULL,
  content_html LONGTEXT        NULL,
  is_paid      TINYINT(1)      NOT NULL DEFAULT 0,
  token_price  INT UNSIGNED    NOT NULL DEFAULT 0,
  status       ENUM('draft','published') NOT NULL DEFAULT 'draft',
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_chapters_book_idx (book_id, idx),
  KEY idx_chapters_book_status (book_id, status),
  CONSTRAINT fk_chapters_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chapter_unlocks (
  user_id      BIGINT UNSIGNED NOT NULL,
  chapter_id   BIGINT UNSIGNED NOT NULL,
  tokens_spent INT UNSIGNED    NOT NULL,
  unlocked_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, chapter_id),
  KEY idx_unlocks_user (user_id, unlocked_at),
  CONSTRAINT fk_unlocks_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_unlocks_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE transactions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  type            ENUM('purchase','unlock','admin_adjust') NOT NULL,
  tokens_delta    INT             NOT NULL,
  ref_chapter_id  BIGINT UNSIGNED NULL,
  meta            JSON            NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tx_user_created (user_id, created_at),
  KEY idx_tx_type_created (type, created_at),
  CONSTRAINT fk_tx_user    FOREIGN KEY (user_id)        REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_tx_chapter FOREIGN KEY (ref_chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comments (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  book_id     BIGINT UNSIGNED NULL,
  chapter_id  BIGINT UNSIGNED NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  parent_id   BIGINT UNSIGNED NULL,
  body        TEXT            NOT NULL,
  status      ENUM('visible','hidden','deleted') NOT NULL DEFAULT 'visible',
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_book    (book_id, created_at),
  KEY idx_comments_chapter (chapter_id, created_at),
  KEY idx_comments_parent  (parent_id),
  KEY idx_comments_user    (user_id, created_at),
  CONSTRAINT fk_comments_book    FOREIGN KEY (book_id)    REFERENCES books(id)     ON DELETE CASCADE,
  CONSTRAINT fk_comments_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id)  ON DELETE CASCADE,
  CONSTRAINT fk_comments_user    FOREIGN KEY (user_id)    REFERENCES users(id)     ON DELETE CASCADE,
  CONSTRAINT fk_comments_parent  FOREIGN KEY (parent_id)  REFERENCES comments(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
