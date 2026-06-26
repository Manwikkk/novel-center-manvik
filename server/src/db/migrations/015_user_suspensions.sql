-- User suspension enhancements + admin settings for temporary ban duration.

CREATE TABLE IF NOT EXISTS admin_settings (
  id                   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  temporary_ban_days   INT UNSIGNED     NOT NULL DEFAULT 5,
  updated_at           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO admin_settings (id, temporary_ban_days) VALUES (1, 5);

ALTER TABLE users
  ADD COLUMN suspension_type ENUM('permanent','temporary') NULL AFTER status,
  ADD COLUMN suspended_until TIMESTAMP NULL AFTER suspension_type,
  ADD COLUMN suspension_restrictions JSON NULL AFTER suspended_until;
