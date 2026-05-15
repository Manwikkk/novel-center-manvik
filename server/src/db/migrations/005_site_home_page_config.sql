-- Novel Center: toggles for public home page sections (admin-controlled).
-- Single-row table (id = 1). All flags default to visible (1).

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS site_home_page_config (
  id                   TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  weekly_book          TINYINT(1) NOT NULL DEFAULT 1,
  meet_webnovel        TINYINT(1) NOT NULL DEFAULT 1,
  recommended          TINYINT(1) NOT NULL DEFAULT 1,
  new_arrivals         TINYINT(1) NOT NULL DEFAULT 1,
  ranking_novels       TINYINT(1) NOT NULL DEFAULT 1,
  updated_today        TINYINT(1) NOT NULL DEFAULT 1,
  completed_novels     TINYINT(1) NOT NULL DEFAULT 1,
  editors_choice       TINYINT(1) NOT NULL DEFAULT 1,
  gs_originals         TINYINT(1) NOT NULL DEFAULT 1,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO site_home_page_config (id) VALUES (1);
