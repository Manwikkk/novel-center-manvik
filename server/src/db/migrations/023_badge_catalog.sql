-- Expand achievement / badge catalog for enamel-style profile badges.
SET NAMES utf8mb4;

-- Widen category enum
SET @col := (
  SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'category'
);
SET @sql := IF(
  @col IS NOT NULL AND @col NOT LIKE '%events%',
  "ALTER TABLE achievements MODIFY COLUMN category ENUM('reading','social','author','milestones','events','genre') NOT NULL DEFAULT 'milestones'",
  'DO 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO achievements (code, title, description, icon, category, xp_reward) VALUES
  ('books_read_25',    'Story Hunter',     'Finish progress on 25 books.',              'local_library', 'reading',    120),
  ('streak_365',       '365',              'Check in for 365 days in a lifetime best.', 'calendar_month','milestones', 500),
  ('library_50',       'Archivist',        'Add 50 books to your library.',             'bookmarks',     'reading',    100),
  ('followers_100',    'Crowd Favorite',   'Reach 100 followers.',                      'diversity_3',   'social',     150),
  ('genre_fantasy',    'Fantasy',          'Add a Fantasy novel to your library.',      'auto_fix',    'genre',       25),
  ('genre_eastern',    'Cultivator',       'Add an Eastern novel to your library.',     'swords',        'genre',       25),
  ('genre_romance',    'Romance',          'Add a Romance novel to your library.',      'favorite',      'genre',       25),
  ('genre_horror',     'Horror',           'Add a Horror novel to your library.',       'skull',         'genre',       25),
  ('genre_scifi',      'Sci-Fi',           'Add a Sci-Fi novel to your library.',       'rocket_launch', 'genre',       25),
  ('event_new_year',   'New Year',         'Celebrate the reading year with us.',       'celebration',   'events',      40),
  ('event_halloween',  'Halloween',        'Spooky season reader badge.',               'nightlife',     'events',      40),
  ('event_anniversary','Anniversary',      'Novel Center anniversary badge.',           'cake',          'events',      60),
  ('event_winter',     'Winter Read',      'Cozy winter reading badge.',                'ac_unit',       'events',      40),
  ('premium_member',   'Premium',          'Active premium membership.',                'workspace_premium','milestones', 0),
  ('verified_reader',  'Verified',         'Verified reader profile.',                  'verified',      'milestones',   0),
  ('night_owl',        'Night Owl',        'Read after midnight (local).',              'dark_mode',     'milestones',  35),
  ('critic',           'Critic',           'Write 5 book reviews.',                     'rate_review',   'social',      80),
  ('social_butterfly', 'Social Butterfly', 'Leave 25 comments.',                        'forum',         'social',      70)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  icon = VALUES(icon),
  category = VALUES(category),
  xp_reward = VALUES(xp_reward);
