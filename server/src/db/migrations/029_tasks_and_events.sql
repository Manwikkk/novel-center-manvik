-- Task & Challenge System: Getting Started, admin-configurable Daily / Weekly /
-- Monthly tasks (EXP only), genuine novel completion, and a separate event
-- framework. Idempotent: gated ALTERs + CREATE TABLE IF NOT EXISTS + INSERT IGNORE.

SET NAMES utf8mb4;

-- ── reader progress: the moment a chapter was genuinely read ────────────────

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reader_progress' AND COLUMN_NAME = 'qualified_at');
SET @sql := IF(@col = 0,
  'ALTER TABLE reader_progress ADD COLUMN qualified_at DATETIME NULL AFTER position',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reader_progress' AND COLUMN_NAME = 'qualified_day');
SET @sql := IF(@col = 0,
  'ALTER TABLE reader_progress ADD COLUMN qualified_day DATE NULL AFTER qualified_at',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reader_progress' AND INDEX_NAME = 'idx_progress_user_qualified');
SET @sql := IF(@idx = 0,
  'ALTER TABLE reader_progress ADD KEY idx_progress_user_qualified (user_id, qualified_day)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill only chapters the reader could actually read (free, unlocked, or their own).
UPDATE reader_progress rp
  JOIN chapters c ON c.id = rp.chapter_id
  JOIN books b ON b.id = rp.book_id
  LEFT JOIN chapter_unlocks u ON u.user_id = rp.user_id AND u.chapter_id = rp.chapter_id
   SET rp.qualified_at = COALESCE(rp.qualified_at, rp.updated_at),
       rp.qualified_day = COALESCE(rp.qualified_day, DATE(rp.updated_at))
 WHERE rp.percent >= 80
   AND rp.qualified_at IS NULL
   AND c.status = 'published'
   AND c.recycled_at IS NULL
   AND b.status = 'published'
   AND b.recycled_at IS NULL
   AND (
     c.is_paid = 0 OR c.token_price = 0 OR u.user_id IS NOT NULL OR b.author_id = rp.user_id
   );

-- ── XP ledger can record task grants (events already have a source) ─────────

SET @col := (
  SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_xp_events' AND COLUMN_NAME = 'source'
);
SET @sql := IF(
  @col IS NOT NULL AND @col NOT LIKE '%tasks%',
  "ALTER TABLE user_xp_events MODIFY COLUMN source ENUM('reading','reviews','comments','check_in','events','other','tasks') NOT NULL",
  'DO 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── profile cosmetics granted by events ──────────────────────────────────────

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_title');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN profile_title VARCHAR(80) NULL AFTER bio',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_cosmetic');
SET @sql := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN profile_cosmetic VARCHAR(80) NULL AFTER profile_title',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── novel ratings (separate from long-form reviews) ─────────────────────────

CREATE TABLE IF NOT EXISTS book_ratings (
  user_id      BIGINT UNSIGNED NOT NULL,
  book_id      BIGINT UNSIGNED NOT NULL,
  score        TINYINT UNSIGNED NOT NULL,
  new_arrival  TINYINT(1) NOT NULL DEFAULT 0,
  rated_day    DATE NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, book_id),
  KEY idx_book_ratings_day (user_id, new_arrival, rated_day),
  CONSTRAINT fk_book_ratings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_book_ratings_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── genuine novel completions (sticky: undoing progress does not revoke) ────

CREATE TABLE IF NOT EXISTS novel_completions (
  user_id          BIGINT UNSIGNED NOT NULL,
  book_id          BIGINT UNSIGNED NOT NULL,
  published_count  INT UNSIGNED NOT NULL,
  read_count       INT UNSIGNED NOT NULL,
  completed_day    DATE NOT NULL,
  completed_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, book_id),
  KEY idx_novel_completions_day (user_id, completed_day),
  CONSTRAINT fk_novel_completions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_novel_completions_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── reading-time cursor + activity facts used by tasks and events ───────────

CREATE TABLE IF NOT EXISTS reading_time_cursors (
  user_id     BIGINT UNSIGNED NOT NULL,
  chapter_id  BIGINT UNSIGNED NOT NULL,
  last_ms     BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_reading_cursor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_facts (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  fact_type    VARCHAR(40) NOT NULL,
  fact_key     VARCHAR(120) NOT NULL,
  book_id      BIGINT UNSIGNED NULL,
  chapter_id   BIGINT UNSIGNED NULL,
  amount       INT UNSIGNED NOT NULL DEFAULT 0,
  new_arrival  TINYINT(1) NOT NULL DEFAULT 0,
  occurred_at  DATETIME NOT NULL,
  day_key      DATE NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_task_fact (user_id, fact_type, fact_key),
  KEY idx_task_facts_user_type_day (user_id, fact_type, day_key),
  KEY idx_task_facts_user_book (user_id, book_id, fact_type),
  KEY idx_task_facts_occurred (user_id, fact_type, occurred_at),
  CONSTRAINT fk_task_facts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── admin-configurable task catalogue ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_definitions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code          VARCHAR(80) NOT NULL,
  title         VARCHAR(160) NOT NULL,
  description   VARCHAR(400) NOT NULL,
  frequency     ENUM('once','daily','weekly','monthly') NOT NULL,
  condition_key VARCHAR(64) NOT NULL,
  params        JSON NOT NULL,
  exp_reward    INT UNSIGNED NOT NULL DEFAULT 0,
  enabled       TINYINT(1) NOT NULL DEFAULT 1,
  system_task   TINYINT(1) NOT NULL DEFAULT 0,
  sort_order    INT NOT NULL DEFAULT 0,
  starts_at     DATETIME NULL,
  ends_at       DATETIME NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_task_definitions_code (code),
  KEY idx_task_definitions_live (frequency, enabled, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_task_progress (
  user_id      BIGINT UNSIGNED NOT NULL,
  task_id      BIGINT UNSIGNED NOT NULL,
  period_key   VARCHAR(20) NOT NULL,
  progress     INT UNSIGNED NOT NULL DEFAULT 0,
  target       INT UNSIGNED NOT NULL DEFAULT 1,
  completed_at DATETIME NULL,
  exp_awarded  INT UNSIGNED NOT NULL DEFAULT 0,
  rewarded     TINYINT(1) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, task_id, period_key),
  KEY idx_user_task_progress_period (task_id, period_key, completed_at),
  CONSTRAINT fk_user_task_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_task_progress_task FOREIGN KEY (task_id) REFERENCES task_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Getting Started. EXP matches the product spec. INSERT IGNORE so a re-run
-- does not overwrite an EXP value an admin has already changed.
INSERT IGNORE INTO task_definitions
  (code, title, description, frequency, condition_key, params, exp_reward, enabled, system_task, sort_order)
VALUES
  ('gs_first_chapter', 'First Chapter', 'Read your first chapter.', 'once', 'gs_first_chapter', JSON_OBJECT(), 5, 1, 1, 10),
  ('gs_first_novel', 'First Novel', 'Read your first novel.', 'once', 'gs_first_novel', JSON_OBJECT(), 10, 1, 1, 20),
  ('gs_first_completion', 'First Completion', 'Genuinely complete your first novel.', 'once', 'gs_first_completion', JSON_OBJECT(), 20, 1, 1, 30),
  ('gs_first_library', 'First Library Add', 'Add your first novel to your Library.', 'once', 'gs_first_library', JSON_OBJECT(), 5, 1, 1, 40),
  ('gs_first_collection', 'First Collection', 'Create your first personal or public collection.', 'once', 'gs_first_collection', JSON_OBJECT(), 5, 1, 1, 50),
  ('gs_first_follow', 'First Follow', 'Follow your first author.', 'once', 'gs_first_follow', JSON_OBJECT(), 5, 1, 1, 60),
  ('gs_first_rating', 'First Rating', 'Submit your first novel rating.', 'once', 'gs_first_rating', JSON_OBJECT(), 5, 1, 1, 70),
  ('gs_first_comment', 'First Comment', 'Post your first comment.', 'once', 'gs_first_comment', JSON_OBJECT(), 5, 1, 1, 80),
  ('gs_first_review', 'First Review', 'Submit your first review.', 'once', 'gs_first_review', JSON_OBJECT(), 10, 1, 1, 90),
  ('gs_first_checkin', 'First Check-In', 'Successfully claim your first Daily Check-In.', 'once', 'gs_first_checkin', JSON_OBJECT(), 5, 1, 1, 100),
  ('gs_first_achievement', 'First Achievement', 'Unlock your first achievement.', 'once', 'gs_first_achievement', JSON_OBJECT(), 5, 1, 1, 110);

-- Daily catalogue. Only the 20-minute read is enabled; 10/30/60 are alternatives.
-- New Arrival reading requires 5 minutes, not merely opening a chapter.
INSERT IGNORE INTO task_definitions
  (code, title, description, frequency, condition_key, params, exp_reward, enabled, system_task, sort_order)
VALUES
  ('daily_read_10', 'Read for 10 minutes', 'Spend 10 minutes reading today.', 'daily', 'read_minutes', JSON_OBJECT('minutes', 10), 10, 0, 0, 10),
  ('daily_read_20', 'Read for 20 minutes', 'Spend 20 minutes reading today.', 'daily', 'read_minutes', JSON_OBJECT('minutes', 20), 15, 1, 0, 20),
  ('daily_read_30', 'Read for 30 minutes', 'Spend 30 minutes reading today.', 'daily', 'read_minutes', JSON_OBJECT('minutes', 30), 20, 0, 0, 30),
  ('daily_read_60', 'Read for 60 minutes', 'A harder reading goal for today. Enable it instead of a shorter one.', 'daily', 'read_minutes', JSON_OBJECT('minutes', 60), 30, 0, 0, 40),
  ('daily_read_new_arrival', 'Read a New Arrival', 'Spend at least 5 minutes reading a current New Arrival.', 'daily', 'read_new_arrival', JSON_OBJECT('minMinutes', 5), 20, 1, 0, 50);

INSERT IGNORE INTO task_definitions
  (code, title, description, frequency, condition_key, params, exp_reward, enabled, system_task, sort_order)
VALUES
  ('weekly_read_chapters', 'Read 30 chapters', 'Read 30 chapters this week.', 'weekly', 'read_chapters', JSON_OBJECT('target', 30), 40, 1, 0, 10),
  ('weekly_review_new_arrival', 'Review a New Arrival', 'Write one eligible review of a current New Arrival this week.', 'weekly', 'review_new_arrival', JSON_OBJECT('target', 1), 25, 1, 0, 20),
  ('weekly_rate_new_arrivals', 'Rate New Arrivals', 'Rate 3 current New Arrivals this week.', 'weekly', 'rate_new_arrivals', JSON_OBJECT('target', 3), 15, 1, 0, 30),
  ('weekly_complete_novels', 'Complete 2 novels', 'Genuinely complete 2 novels this week.', 'weekly', 'complete_novels', JSON_OBJECT('target', 2), 50, 1, 0, 40);

INSERT IGNORE INTO task_definitions
  (code, title, description, frequency, condition_key, params, exp_reward, enabled, system_task, sort_order)
VALUES
  ('monthly_read_new_arrivals', 'Read 4 New Arrivals', 'Meaningfully read 4 New Arrivals this month (at least 5 minutes each).', 'monthly', 'read_new_arrivals', JSON_OBJECT('target', 4, 'minMinutes', 5), 40, 1, 0, 10),
  ('monthly_review_new_arrivals', 'Review 2 New Arrivals', 'Write eligible reviews of 2 New Arrivals this month.', 'monthly', 'review_new_arrivals', JSON_OBJECT('target', 2), 35, 1, 0, 20),
  ('monthly_read_chapters', 'Read 150 chapters', 'Read 150 chapters this month.', 'monthly', 'read_chapters', JSON_OBJECT('target', 150), 80, 1, 0, 30),
  ('monthly_complete_novels', 'Complete 5 novels', 'Genuinely complete 5 novels this month.', 'monthly', 'complete_novels', JSON_OBJECT('target', 5), 100, 1, 0, 40);

-- ── events (registration, independent progress, their own rewards) ──────────

CREATE TABLE IF NOT EXISTS platform_events (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(80) NOT NULL,
  name         VARCHAR(160) NOT NULL,
  summary      VARCHAR(300) NULL,
  description  TEXT NULL,
  starts_at    DATETIME NOT NULL,
  ends_at      DATETIME NOT NULL,
  enabled      TINYINT(1) NOT NULL DEFAULT 1,
  promoted     TINYINT(1) NOT NULL DEFAULT 1,
  created_by   BIGINT UNSIGNED NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_platform_events_slug (slug),
  KEY idx_platform_events_window (enabled, promoted, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_activities (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id      BIGINT UNSIGNED NOT NULL,
  code          VARCHAR(64) NOT NULL,
  condition_key VARCHAR(64) NOT NULL,
  params        JSON NOT NULL,
  title         VARCHAR(160) NOT NULL,
  description   VARCHAR(300) NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_activity (event_id, code),
  CONSTRAINT fk_event_activities_event FOREIGN KEY (event_id) REFERENCES platform_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_rewards (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id     BIGINT UNSIGNED NOT NULL,
  code         VARCHAR(64) NOT NULL,
  title        VARCHAR(160) NOT NULL,
  description  VARCHAR(300) NULL,
  reward_type  ENUM('COINS','EXP','CHAPTER_DISCOUNT','BUNDLE_DISCOUNT','NOVEL_PASS','PLATFORM_WIDE_PASS','BADGE','TITLE','COSMETIC') NOT NULL,
  payload      JSON NOT NULL,
  requires_json JSON NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_reward (event_id, code),
  CONSTRAINT fk_event_rewards_event FOREIGN KEY (event_id) REFERENCES platform_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_registrations (
  event_id      BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  KEY idx_event_registrations_user (user_id, registered_at),
  CONSTRAINT fk_event_registrations_event FOREIGN KEY (event_id) REFERENCES platform_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_registrations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_dismissals (
  event_id     BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  dismissed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  CONSTRAINT fk_event_dismissals_event FOREIGN KEY (event_id) REFERENCES platform_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_dismissals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_activity_progress (
  event_id     BIGINT UNSIGNED NOT NULL,
  activity_id  BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  progress     INT UNSIGNED NOT NULL DEFAULT 0,
  target       INT UNSIGNED NOT NULL DEFAULT 1,
  completed_at DATETIME NULL,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (activity_id, user_id),
  KEY idx_event_progress_user (user_id, event_id),
  CONSTRAINT fk_event_progress_event FOREIGN KEY (event_id) REFERENCES platform_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_progress_activity FOREIGN KEY (activity_id) REFERENCES event_activities(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_reward_claims (
  reward_id   BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  claimed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  grant_ref   VARCHAR(80) NULL,
  PRIMARY KEY (reward_id, user_id),
  CONSTRAINT fk_event_claims_reward FOREIGN KEY (reward_id) REFERENCES event_rewards(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_claims_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_profile_unlocks (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  kind        ENUM('title','cosmetic','badge') NOT NULL,
  unlock_key  VARCHAR(80) NOT NULL,
  label       VARCHAR(120) NOT NULL,
  source      VARCHAR(40) NOT NULL,
  source_ref  VARCHAR(80) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_profile_unlock (user_id, kind, unlock_key),
  CONSTRAINT fk_profile_unlocks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO platform_events (slug, name, summary, description, starts_at, ends_at, enabled, promoted)
SELECT 'reading-week',
       'Reading Week',
       'A limited reading campaign with its own progress and rewards.',
       'Register to take part. Chapters you read and minutes you spend after you register count toward Reading Week only — they are tracked separately from Daily, Weekly, and Monthly tasks. Rewards are claimed from the event, not from the task list.',
       NOW(),
       DATE_ADD(NOW(), INTERVAL 21 DAY),
       1,
       1
WHERE NOT EXISTS (SELECT 1 FROM platform_events WHERE slug = 'reading-week');

INSERT INTO event_activities (event_id, code, condition_key, params, title, description, sort_order)
SELECT e.id, 'read_chapter', 'read_chapters', JSON_OBJECT('target', 1),
       'Read a chapter', 'Meaningfully read 1 chapter during the event.', 10
  FROM platform_events e
 WHERE e.slug = 'reading-week'
   AND NOT EXISTS (
     SELECT 1 FROM event_activities a WHERE a.event_id = e.id AND a.code = 'read_chapter'
   );

INSERT INTO event_activities (event_id, code, condition_key, params, title, description, sort_order)
SELECT e.id, 'read_30', 'read_minutes', JSON_OBJECT('minutes', 30),
       'Read for 30 minutes', 'Spend 30 minutes reading during the event.', 20
  FROM platform_events e
 WHERE e.slug = 'reading-week'
   AND NOT EXISTS (
     SELECT 1 FROM event_activities a WHERE a.event_id = e.id AND a.code = 'read_30'
   );

INSERT INTO event_rewards (event_id, code, title, description, reward_type, payload, requires_json, sort_order)
SELECT e.id, 'chapter_exp', 'Reading Week EXP', 'Reader EXP for your first event chapter.',
       'EXP', JSON_OBJECT('exp', 10), JSON_OBJECT('type', 'activity', 'code', 'read_chapter'), 10
  FROM platform_events e
 WHERE e.slug = 'reading-week'
   AND NOT EXISTS (SELECT 1 FROM event_rewards r WHERE r.event_id = e.id AND r.code = 'chapter_exp');

INSERT INTO event_rewards (event_id, code, title, description, reward_type, payload, requires_json, sort_order)
SELECT e.id, 'finale_coins', 'Reading Week coins', 'A small coin bonus for finishing both event activities.',
       'COINS', JSON_OBJECT('amount', 5), JSON_OBJECT('type', 'all_activities'), 20
  FROM platform_events e
 WHERE e.slug = 'reading-week'
   AND NOT EXISTS (SELECT 1 FROM event_rewards r WHERE r.event_id = e.id AND r.code = 'finale_coins');

INSERT INTO event_rewards (event_id, code, title, description, reward_type, payload, requires_json, sort_order)
SELECT e.id, 'finale_pass', '72-hour Platform Pass', 'Read eligible locked chapters free for 72 hours after you activate it.',
       'PLATFORM_WIDE_PASS', JSON_OBJECT('hours', 72), JSON_OBJECT('type', 'all_activities'), 30
  FROM platform_events e
 WHERE e.slug = 'reading-week'
   AND NOT EXISTS (SELECT 1 FROM event_rewards r WHERE r.event_id = e.id AND r.code = 'finale_pass');

INSERT INTO event_rewards (event_id, code, title, description, reward_type, payload, requires_json, sort_order)
SELECT e.id, 'finale_title', 'Reading Week reader', 'An exclusive title on your profile.',
       'TITLE', JSON_OBJECT('key', 'reading_week', 'label', 'Reading Week reader'), JSON_OBJECT('type', 'all_activities'), 40
  FROM platform_events e
 WHERE e.slug = 'reading-week'
   AND NOT EXISTS (SELECT 1 FROM event_rewards r WHERE r.event_id = e.id AND r.code = 'finale_title');

-- ── permanent reading milestones (Profile achievements, not Tasks) ──────────

INSERT INTO achievements (code, title, description, icon, category, xp_reward) VALUES
  ('chapters_100',        'Hundred Chapters', 'Meaningfully read 100 chapters.',     'menu_book',    'reading', 80),
  ('chapters_1000',       'Thousand Chapters','Meaningfully read 1,000 chapters.',   'auto_stories', 'reading', 400),
  ('novels_completed_1',  'Finisher',         'Genuinely complete your first novel.','verified',     'reading', 30),
  ('novels_completed_10', 'Completionist',    'Genuinely complete 10 novels.',       'emoji_events', 'reading', 150)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  icon = VALUES(icon),
  category = VALUES(category),
  xp_reward = VALUES(xp_reward);
