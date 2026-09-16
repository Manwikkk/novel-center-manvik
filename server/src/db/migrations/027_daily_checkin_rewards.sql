-- Daily Check-In system: continuous streaks, 14-day reward display, milestone
-- reward claims, a reusable reward inventory (coins / vouchers / novel passes)
-- and admin-configurable rules + campaigns.
-- Idempotent: gated ALTERs + CREATE TABLE IF NOT EXISTS.

SET NAMES utf8mb4;

-- ── daily_checkins: surrogate id + streak / display-day bookkeeping ─────────

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_checkins' AND COLUMN_NAME = 'id');
SET @sql := IF(@col = 0,
  'ALTER TABLE daily_checkins ADD COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE FIRST',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_checkins' AND COLUMN_NAME = 'streak_number');
SET @sql := IF(@col = 0,
  'ALTER TABLE daily_checkins ADD COLUMN streak_number INT UNSIGNED NOT NULL DEFAULT 0 AFTER checkin_date',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_checkins' AND COLUMN_NAME = 'display_day');
SET @sql := IF(@col = 0,
  'ALTER TABLE daily_checkins ADD COLUMN display_day TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER streak_number',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_checkins' AND COLUMN_NAME = 'bonus_coins');
SET @sql := IF(@col = 0,
  'ALTER TABLE daily_checkins ADD COLUMN bonus_coins INT UNSIGNED NOT NULL DEFAULT 0 AFTER xp_awarded',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_checkins' AND COLUMN_NAME = 'meta');
SET @sql := IF(@col = 0,
  'ALTER TABLE daily_checkins ADD COLUMN meta JSON NULL AFTER bonus_coins',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill streak_number / display_day for rows created before this migration
-- (consecutive calendar days form one streak; the 14-day display cycle wraps).
UPDATE daily_checkins dc
JOIN (
  SELECT user_id, checkin_date,
         ROW_NUMBER() OVER (PARTITION BY user_id, grp ORDER BY checkin_date) AS streak_no
    FROM (
      SELECT user_id, checkin_date,
             DATE_SUB(checkin_date, INTERVAL ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY checkin_date) DAY) AS grp
        FROM daily_checkins
    ) t
) s ON s.user_id = dc.user_id AND s.checkin_date = dc.checkin_date
   SET dc.streak_number = s.streak_no,
       dc.display_day = ((s.streak_no - 1) % 14) + 1
 WHERE dc.streak_number = 0;

-- ── users: lifetime check-in counter ─────────────────────────────────────────

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'total_checkins');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN total_checkins INT UNSIGNED NOT NULL DEFAULT 0 AFTER last_checkin_date',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE users u
  LEFT JOIN (SELECT user_id, COUNT(*) AS c FROM daily_checkins GROUP BY user_id) dc ON dc.user_id = u.id
   SET u.total_checkins = COALESCE(dc.c, 0)
 WHERE u.total_checkins = 0 AND COALESCE(dc.c, 0) > 0;

-- ── coin ledger: reward credits (milestone / campaign coins) ─────────────────

SET @col := (
  SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'type'
);
SET @sql := IF(
  @col IS NOT NULL AND @col NOT LIKE '%reward%',
  "ALTER TABLE transactions MODIFY COLUMN type ENUM('purchase','unlock','admin_adjust','reward') NOT NULL",
  'DO 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── reward inventory (reusable: check-in, tasks, achievements, campaigns) ────

CREATE TABLE IF NOT EXISTS user_rewards (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             BIGINT UNSIGNED NOT NULL,
  reward_type         ENUM('COINS','CHAPTER_DISCOUNT','BUNDLE_DISCOUNT','NOVEL_PASS','PLATFORM_WIDE_PASS') NOT NULL,
  source              VARCHAR(40)     NOT NULL DEFAULT 'checkin_milestone',
  source_ref          VARCHAR(80)     NULL,
  title               VARCHAR(160)    NOT NULL,
  description         VARCHAR(300)    NULL,
  amount              INT UNSIGNED    NOT NULL DEFAULT 0,
  max_discount_coins  INT UNSIGNED    NULL,
  duration_minutes    INT UNSIGNED    NULL,
  scope               ENUM('none','novel','platform') NOT NULL DEFAULT 'none',
  status              ENUM('issued','active','used','expired','revoked') NOT NULL DEFAULT 'issued',
  book_id             BIGINT UNSIGNED NULL,
  valid_until         DATETIME        NULL,
  activated_at        DATETIME        NULL,
  expires_at          DATETIME        NULL,
  used_at             DATETIME        NULL,
  meta                JSON            NULL,
  created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_rewards_user_status (user_id, status, reward_type),
  KEY idx_user_rewards_active (status, expires_at),
  CONSTRAINT fk_user_rewards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_rewards_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── milestone reward claims (one per milestone check-in) ────────────────────

CREATE TABLE IF NOT EXISTS checkin_milestone_claims (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id               BIGINT UNSIGNED NOT NULL,
  checkin_id            BIGINT UNSIGNED NOT NULL,
  milestone             TINYINT UNSIGNED NOT NULL,
  streak_number         INT UNSIGNED    NOT NULL,
  selected_option       VARCHAR(40)     NOT NULL,
  selected_reward_type  ENUM('COINS','CHAPTER_DISCOUNT','BUNDLE_DISCOUNT','NOVEL_PASS','PLATFORM_WIDE_PASS') NOT NULL,
  reward_id             BIGINT UNSIGNED NULL,
  issued_at             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_milestone_claim_checkin (checkin_id),
  KEY idx_milestone_claims_user (user_id, issued_at),
  CONSTRAINT fk_milestone_claims_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_milestone_claims_checkin FOREIGN KEY (checkin_id) REFERENCES daily_checkins(id) ON DELETE CASCADE,
  CONSTRAINT fk_milestone_claims_reward FOREIGN KEY (reward_id) REFERENCES user_rewards(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── admin configuration (single JSON document) + special campaigns ──────────

CREATE TABLE IF NOT EXISTS checkin_config (
  id          TINYINT UNSIGNED NOT NULL,
  config      JSON             NOT NULL,
  updated_by  BIGINT UNSIGNED  NULL,
  updated_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checkin_campaigns (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name              VARCHAR(160)    NOT NULL,
  description       VARCHAR(300)    NULL,
  starts_at         DATETIME        NOT NULL,
  ends_at           DATETIME        NOT NULL,
  enabled           TINYINT(1)      NOT NULL DEFAULT 1,
  exp_multiplier    DECIMAL(4,2)    NOT NULL DEFAULT 1.00,
  bonus_coins       INT UNSIGNED    NOT NULL DEFAULT 0,
  novel_pass_hours  INT UNSIGNED    NULL,
  created_by        BIGINT UNSIGNED NULL,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_checkin_campaigns_window (enabled, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── achievements fed by check-ins ────────────────────────────────────────────

INSERT INTO achievements (code, title, description, icon, category, xp_reward) VALUES
  ('streak_100',   '100 Days',  'Check in 100 days in a row.',      'military_tech',   'milestones', 300),
  ('checkins_100', 'Regular',   'Claim 100 daily check-ins.',       'event_available', 'milestones', 150),
  ('checkins_500', 'Devoted',   'Claim 500 daily check-ins.',       'event_repeat',    'milestones', 400)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  icon = VALUES(icon),
  category = VALUES(category),
  xp_reward = VALUES(xp_reward);
