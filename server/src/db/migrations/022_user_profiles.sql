-- User profiles: banner/avatar keys, social, privacy, follows, XP/levels, check-ins, achievements.
-- Idempotent: gated ALTERs + CREATE TABLE IF NOT EXISTS.

SET NAMES utf8mb4;

-- ── users profile columns ────────────────────────────────────────────────────

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'banner_url');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN banner_url VARCHAR(500) NULL AFTER avatar_url',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'banner_storage_key');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN banner_storage_key VARCHAR(500) NULL AFTER banner_url',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_storage_key');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN avatar_storage_key VARCHAR(500) NULL AFTER avatar_url',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'country');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN country VARCHAR(80) NULL AFTER bio',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'birth_date');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN birth_date DATE NULL AFTER country',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'social_links');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN social_links JSON NULL AFTER birth_date',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_verified');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER social_links',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_premium');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN is_premium TINYINT(1) NOT NULL DEFAULT 0 AFTER is_verified',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'show_reviews');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN show_reviews TINYINT(1) NOT NULL DEFAULT 1 AFTER is_premium',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'show_comments');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN show_comments TINYINT(1) NOT NULL DEFAULT 1 AFTER show_reviews',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'notify_email');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN notify_email TINYINT(1) NOT NULL DEFAULT 1 AFTER show_comments',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'notify_push');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN notify_push TINYINT(1) NOT NULL DEFAULT 1 AFTER notify_email',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'xp');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN xp INT UNSIGNED NOT NULL DEFAULT 0 AFTER notify_push',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'reader_level');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN reader_level TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER xp',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'current_streak');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN current_streak INT UNSIGNED NOT NULL DEFAULT 0 AFTER reader_level',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'longest_streak');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN longest_streak INT UNSIGNED NOT NULL DEFAULT 0 AFTER current_streak',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_checkin_date');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN last_checkin_date DATE NULL AFTER longest_streak',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_read_date');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN last_read_date DATE NULL AFTER last_checkin_date',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'membership_tier');
SET @sql := IF(@col = 0,
  "ALTER TABLE users ADD COLUMN membership_tier ENUM('none','basic','plus','premium') NOT NULL DEFAULT 'none' AFTER last_read_date",
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'membership_expires_at');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN membership_expires_at DATETIME NULL AFTER membership_tier',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'bonus_balance');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN bonus_balance INT UNSIGNED NOT NULL DEFAULT 0 AFTER membership_expires_at',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── books: serialization + profile visibility + view count ───────────────────

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'serialization_status');
SET @sql := IF(@col = 0,
  "ALTER TABLE books ADD COLUMN serialization_status ENUM('ongoing','completed','hiatus') NOT NULL DEFAULT 'ongoing' AFTER status",
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'show_on_profile');
SET @sql := IF(@col = 0,
  'ALTER TABLE books ADD COLUMN show_on_profile TINYINT(1) NOT NULL DEFAULT 1 AFTER serialization_status',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'view_count');
SET @sql := IF(@col = 0,
  'ALTER TABLE books ADD COLUMN view_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER show_on_profile',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── follows ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id  BIGINT UNSIGNED NOT NULL,
  followee_id  BIGINT UNSIGNED NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, followee_id),
  KEY idx_user_follows_followee (followee_id, created_at),
  CONSTRAINT fk_user_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_follows_followee FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── daily check-ins ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_checkins (
  user_id      BIGINT UNSIGNED NOT NULL,
  checkin_date DATE NOT NULL,
  xp_awarded   INT UNSIGNED NOT NULL DEFAULT 10,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, checkin_date),
  CONSTRAINT fk_daily_checkins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── xp ledger (audit of XP gains) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_xp_events (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  source       ENUM('reading','reviews','comments','check_in','events','other') NOT NULL,
  amount       INT NOT NULL,
  meta         JSON NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_xp_events_user (user_id, created_at),
  CONSTRAINT fk_user_xp_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── level benefits (1–15) ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reader_level_benefits (
  level        TINYINT UNSIGNED NOT NULL,
  title        VARCHAR(120) NOT NULL,
  description  VARCHAR(500) NOT NULL,
  xp_required  INT UNSIGNED NOT NULL,
  PRIMARY KEY (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO reader_level_benefits (level, title, description, xp_required) VALUES
  (1,  'Newcomer',        'Welcome to Novel Center. Start reading to earn XP.', 0),
  (2,  'Page Turner',     'Unlock a profile badge accent.', 50),
  (3,  'Dedicated Reader','+5 bonus coins on daily check-in.', 120),
  (4,  'Bookworm',        'Custom collection limit +5.', 220),
  (5,  'Story Seeker',    'Early access flair on comments.', 350),
  (6,  'Chapter Chaser',  '+10% XP from reading sessions.', 500),
  (7,  'Library Keeper',  'Highlight badge on profile.', 700),
  (8,  'Reviewer',        'Priority placement for reviews.', 950),
  (9,  'Critic',          'Unlock advanced review filters.', 1250),
  (10, 'Scholar',         'Exclusive Scholar frame on avatar.', 1600),
  (11, 'Archivist',       'Extra free preview chapters.', 2000),
  (12, 'Lore Master',     '+15 bonus coins on check-in.', 2500),
  (13, 'Patron',          'Patron badge + profile accent.', 3100),
  (14, 'Virtuoso',        'Top-tier XP boost weekends.', 3800),
  (15, 'Legend',          'Max level: Legend badge and all prior benefits.', 4600)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  xp_required = VALUES(xp_required);

-- ── achievements ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS achievements (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code         VARCHAR(64) NOT NULL,
  title        VARCHAR(120) NOT NULL,
  description  VARCHAR(500) NOT NULL,
  icon         VARCHAR(80) NULL,
  category     ENUM('reading','social','author','milestones') NOT NULL DEFAULT 'milestones',
  xp_reward    INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_achievements_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO achievements (code, title, description, icon, category, xp_reward) VALUES
  ('first_read',       'First Page',        'Open your first chapter.',           'menu_book',      'reading',    20),
  ('books_read_5',     'Five Stories',      'Finish progress on 5 books.',        'auto_stories',   'reading',    50),
  ('streak_7',         'Week Streak',       'Check in 7 days in a row.',          'local_fire_department', 'milestones', 70),
  ('streak_30',        'Month Streak',      'Check in 30 days in a row.',         'whatshot',       'milestones', 200),
  ('first_review',     'First Review',      'Write your first book review.',      'rate_review',    'social',     30),
  ('first_comment',    'Conversation',      'Leave your first comment.',          'chat',           'social',     15),
  ('first_follow',     'Social Spark',      'Follow another reader.',             'person_add',     'social',     10),
  ('followers_10',     'Rising Voice',      'Reach 10 followers.',                'groups',         'social',     40),
  ('first_novel',      'Debut Author',      'Publish your first novel.',          'edit',           'author',     100),
  ('library_10',       'Collector',         'Add 10 books to your library.',      'bookmark',       'reading',    40)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  icon = VALUES(icon),
  category = VALUES(category),
  xp_reward = VALUES(xp_reward);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id         BIGINT UNSIGNED NOT NULL,
  achievement_id  BIGINT UNSIGNED NOT NULL,
  earned_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id),
  KEY idx_user_achievements_earned (achievement_id, earned_at),
  CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_achievements_achievement FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── soft notifications stub ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_notifications (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  type         VARCHAR(40) NOT NULL,
  title        VARCHAR(200) NOT NULL,
  body         VARCHAR(500) NULL,
  link_url     VARCHAR(500) NULL,
  is_read      TINYINT(1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_notifications_user (user_id, is_read, created_at),
  CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
