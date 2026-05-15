-- Novel Center seed data — pixel-aligned with the Stitch designs.
-- All seeded users share password: Password123!
-- The password_hash below is bcrypt(Password123!, 12).
--
-- Image assets live in client/public/stitch/ and are served from
-- /stitch/<file>.jpg.  The cover_url column simply records that path
-- so the same value works in dev and production.

SET NAMES utf8mb4;

DELETE FROM comments;
DELETE FROM transactions;
DELETE FROM chapter_unlocks;
DELETE FROM chapters;
DELETE FROM book_content_tags;
DELETE FROM book_tags;
DELETE FROM books;
DELETE FROM wallets;
DELETE FROM users;
ALTER TABLE users        AUTO_INCREMENT = 1;
ALTER TABLE books        AUTO_INCREMENT = 1;
ALTER TABLE chapters     AUTO_INCREMENT = 1;
ALTER TABLE transactions AUTO_INCREMENT = 1;
ALTER TABLE comments     AUTO_INCREMENT = 1;

-- bcrypt hash for "Password123!" generated with cost 12
SET @pw := '$2b$12$OI6BWJusqeC7hrOH9OEkau3r4.bCWX.aGDu7vKOUlMg5HdhJUgaEO';

-- =====================================================================
-- Users
-- =====================================================================
INSERT INTO users (id, email, password_hash, display_name, role, avatar_url, bio) VALUES
  (1, 'admin@novelcenter.io',  @pw, 'Avery Stone',
   'admin',  '/stitch/avatar-admin.jpg',
   'Steward of the Novel Centre. Oversees moderation, publishing standards, and the editorial calendar.'),
  (2, 'author@novelcenter.io', @pw, 'Eleanor Vance',
   'author', '/stitch/author-eleanor-vance.jpg',
   'Award-winning author known for her meticulous historical research and evocative prose. Lives in London.'),
  (3, 'reader@novelcenter.io', @pw, 'Jonas Reed',
   'user',   NULL,
   'Avid reader of slow, atmospheric novels.'),
  (4, 'elena@novelcenter.io',  @pw, 'Elena R.',
   'user',   '/stitch/avatar-elena.jpg',
   'Note-taker, marginalia enthusiast.'),
  (5, 'marcus@novelcenter.io', @pw, 'Marcus T.',
   'user',   '/stitch/avatar-marcus.jpg',
   'Reads everything twice. The first time for the story, the second for the architecture.');

INSERT INTO wallets (user_id, balance) VALUES
  (1, 0),
  (2, 0),
  (3, 500),
  (4, 240),
  (5, 180);

-- =====================================================================
-- Books — every book is authored by Eleanor Vance (id 2) so the
-- Author Studio dashboard shows a populated catalogue.
-- =====================================================================
INSERT INTO books (id, slug, author_id, title, synopsis, cover_url, category, language, status) VALUES
  (1, 'the-silent-tide', 2,
   'The Silent Tide',
   'Set against the turbulent backdrop of 1920s coastal Cornwall, ''The Silent Tide'' weaves a masterful tale of secrets, betrayals, and the enduring power of memory. When young archivist Thomas arrives to catalog the crumbling estate of the reclusive Blackwood family, he uncovers letters that rewrite not only the family''s history but the town''s darkest maritime tragedy.',
   '/stitch/book-silent-tide.jpg',
   'Historical Fiction', 'en', 'published'),

  (2, 'the-architecture-of-silence', 2,
   'The Architecture of Silence',
   'In the slow-decaying Grand Archive, a Keeper and a Cartographer discover that the city itself was tuned to resonate — and someone, or something, is starting to play it again.',
   '/stitch/book-architecture-silence.jpg',
   'Literary Fiction', 'en', 'published'),

  (3, 'the-gilded-age', 2,
   'The Gilded Age',
   'A sweeping portrait of 19th-century industry, lineage, and quiet rebellion told through the diaries of three sisters.',
   '/stitch/book-gilded-age.jpg',
   'Historical Fiction', 'en', 'published'),

  (4, 'midnight-city', 2,
   'Midnight City',
   'A rain-slick procedural set in a city that never quite turns its lights off. Detective Halcott chases a thief who only steals what no one will report missing.',
   '/stitch/book-midnight-city.jpg',
   'Thriller', 'en', 'published'),

  (5, 'whispers-in-wind', 2,
   'Whispers in Wind',
   'A poetry collection on patience, weather, and the small consolations of being unobserved.',
   '/stitch/book-whispers-wind.jpg',
   'Poetry', 'en', 'published'),

  (6, 'dune-echoes', 2,
   'Dune Echoes',
   'Two moons, three guilds, and a cartographer who insists that the desert remembers everyone who ever crossed it.',
   '/stitch/book-dune-echoes.jpg',
   'Science Fiction', 'en', 'published'),

  (7, 'midnight-variables', 2,
   'Midnight Variables',
   'A literary thriller in which a statistician begins to find her own private decisions appearing in the open data of the city.',
   '/stitch/book-midnight-variables.jpg',
   'Thriller', 'en', 'published'),

  (8, 'botany-of-desire', 2,
   'Botany of Desire',
   'An essay-novel that follows four plants through human history and asks who, exactly, has been domesticating whom.',
   '/stitch/book-botany-desire.jpg',
   'Non-Fiction', 'en', 'published'),

  (9, 'the-design-of-everyday-things', 2,
   'The Design of Everyday Things',
   'A field guide for the things we live with: doors that lie, switches that flatter, kettles that confess.',
   '/stitch/book-design-everyday.jpg',
   'Non-Fiction', 'en', 'published'),

  (10, 'theory-of-shadows', 2,
   'Theory of Shadows',
   'A chess prodigy in 1940s Paris discovers a parallel game played only between players who have already lost.',
   '/stitch/book-theory-shadows.jpg',
   'Literary Fiction', 'en', 'published'),

  (11, 'concrete-island', 2,
   'Concrete Island',
   'A driver crashes onto a forgotten triangle of land between three motorways and finds it was never quite empty.',
   '/stitch/book-concrete-island.jpg',
   'Speculative', 'en', 'published'),

  (12, 'the-master-and-margarita', 2,
   'The Master and Margarita',
   'A travelling magician arrives in a quiet republic with a black cat and a long memory.',
   '/stitch/book-master-margarita.jpg',
   'Classic', 'en', 'published'),

  (13, 'the-kings-decree', 2,
   'The King''s Decree',
   'Working title — a draft Eleanor is keeping close, mostly notes and a single chapter.',
   NULL,
   'Historical Fiction', 'en', 'draft');

-- Link books to catalog FKs when migration 007 has been applied.
UPDATE books SET language_id = (SELECT id FROM catalog_languages WHERE code = 'en' LIMIT 1)
 WHERE EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'language_id')
   AND language_id IS NULL;
UPDATE books b
 INNER JOIN catalog_categories c ON c.label = b.category
   SET b.category_id = c.id
 WHERE EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'category_id')
   AND b.category IS NOT NULL AND b.category <> '';

-- =====================================================================
-- Home page shelves: `book_tags` drives /api/v1/home (weekly_featured,
-- new_arrivals, …).  Without these rows every section is empty.
-- =====================================================================
INSERT INTO book_tags (book_id, tag) VALUES
  -- Weekly hero + “New Arrivals” strip (page maps weekly_featured → New Arrivals UI)
  (1, 'weekly_featured'),
  (2, 'weekly_featured'),
  (10, 'weekly_featured'),
  (11, 'weekly_featured'),
  -- “Recommended” strip (page maps new_arrivals → Recommended UI)
  (3, 'new_arrivals'),
  (4, 'new_arrivals'),
  (5, 'new_arrivals'),
  (6, 'new_arrivals'),
  (12, 'new_arrivals'),
  -- Ranking Novels — three rails
  (1, 'potential_starlet'),
  (7, 'potential_starlet'),
  (8, 'potential_starlet'),
  (2, 'rising_fictions'),
  (9, 'rising_fictions'),
  (12, 'rising_fictions'),
  -- Updated Today
  (3, 'cheering_reads'),
  (4, 'cheering_reads'),
  (5, 'cheering_reads'),
  (6, 'cheering_reads'),
  -- Editors’ Choice + Completed row
  (7, 'editors_choice'),
  (8, 'editors_choice'),
  (9, 'editors_choice'),
  (11, 'completed_novel'),
  (12, 'completed_novel');

-- Star ratings for ranking “Highly rated” rail (pickTopRated needs score > 0).
UPDATE books SET score = CASE id
  WHEN 1  THEN 4.92 WHEN 2  THEN 4.90 WHEN 3  THEN 4.76 WHEN 4  THEN 4.84
  WHEN 5  THEN 4.68 WHEN 6  THEN 4.79 WHEN 7  THEN 4.72 WHEN 8  THEN 4.87
  WHEN 9  THEN 4.74 WHEN 10 THEN 4.91 WHEN 11 THEN 4.69 WHEN 12 THEN 4.96
  ELSE score
END
WHERE id BETWEEN 1 AND 12;

-- Ensure home layout toggles are on after seed (table from migration 005).
INSERT INTO site_home_page_config (id, weekly_book, meet_webnovel, recommended, new_arrivals, ranking_novels, updated_today, completed_novels, editors_choice, gs_originals)
VALUES (1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE
  weekly_book = VALUES(weekly_book),
  meet_webnovel = VALUES(meet_webnovel),
  recommended = VALUES(recommended),
  new_arrivals = VALUES(new_arrivals),
  ranking_novels = VALUES(ranking_novels),
  updated_today = VALUES(updated_today),
  completed_novels = VALUES(completed_novels),
  editors_choice = VALUES(editors_choice),
  gs_originals = VALUES(gs_originals);

-- =====================================================================
-- Chapters — Book 1 (The Silent Tide) gets the full ToC the Stitch
-- Book Detail screen shows.  Book 2 (Architecture of Silence) gets the
-- chapter the Reading Interface design quotes verbatim.
-- =====================================================================
INSERT INTO chapters (id, book_id, idx, title, content_html, is_paid, token_price, status) VALUES
  -- Book 1 — The Silent Tide
  (1, 1, 1, 'The Arrival',
   '<p>The commission arrived on a morning so still that Thomas could hear the floorboards remembering. He read the letter twice, then a third time, before he allowed himself to believe its address — a house at the end of the cliff road, one he had passed a dozen times as a boy without ever wondering who lived inside.</p><p>By the time he stepped from the train at the seafront, the light had turned the colour of old paper. Somewhere a gull complained at length about a herring. He shouldered his case and started walking.</p>',
   0, 0, 'published'),

  (2, 1, 2, 'Dust and Echoes',
   '<p>The library had not been opened in fourteen years and it took itself seriously about the fact. The dust was arranged like furniture. The light came in narrow, deliberate slices, as though the windows had decided which parts of the room to forgive.</p><p>He set the case down. The ledgers, when he found them, were not where he had been told they would be.</p>',
   0, 0, 'published'),

  (3, 1, 3, 'The First Letter',
   '<p>Folio 12 was unsigned, but the handwriting was unmistakable; he had seen it earlier that morning on the back of a household receipt for tea, in the hand of someone who, the family insisted, had never once been to Cornwall.</p>',
   1, 15, 'published'),

  (4, 1, 4, 'Shadows on the Moor',
   '<p>By the time he reached the moor it was no longer a question of whether he was being followed but who had been doing the following first.</p>',
   1, 15, 'published'),

  -- Book 2 — The Architecture of Silence
  (5, 2, 1, 'The Lower Wards',
   '<p>The unrest in the lower wards began the same way it had begun in every chronicle Seraphina had ever read: with a single, very ordinary complaint about the water.</p>',
   0, 0, 'published'),

  (6, 2, 2, 'A Map of Voids',
   '<p>The map was drawn on linen. Whoever had made it had not been an architect, but they had clearly been listening to one.</p>',
   0, 0, 'published'),

  (7, 2, 3, 'The Keeper''s Ledger',
   '<p>The ledger was older than the Order itself. That, by the rules of the Order, should have been impossible.</p>',
   1, 20, 'published'),

  (8, 2, 4, 'The Architecture of Silence',
   '<p>The wind carried a scent of old paper and rain across the cobblestones. Elias stood at the threshold of the Grand Archive, a monolith of pale stone that seemed to absorb the twilight rather than reflect it. For centuries, this building had been the repository of the city''s memory, a silent witness to eras of prosperity and inevitable decay.</p><p>He pushed against the heavy bronze doors, their surfaces worn smooth by generations of hands seeking answers, or perhaps, absolution. The hinges groaned — a low, resonant sound that echoed through the cavernous hall within. Dust motes danced in the pale shafts of moonlight filtering through the high clerestory windows, illuminating rows upon rows of towering bookshelves that stretched into the impenetrable darkness.</p><p>"You''re late," a voice murmured from the shadows.</p><p>Elias didn''t startle. He had expected her. Seraphina emerged from an aisle, clutching a leather-bound ledger. The dim light caught the silver threads in her hair, though her posture remained unyielding, a testament to the discipline the Order demanded of its Keepers.</p><p>"The lower wards were restless tonight," Elias replied, stepping into the hall and letting the doors thud shut behind him, sealing them in the silence. "The curfew is barely holding."</p><p>Seraphina sighed, placing the ledger on a nearby reading table. The wood was deeply scarred, mapped with the ink stains of countless scholars. "The unrest is a symptom, Elias. Not the disease. They feel the shift in the foundation just as we do, even if they lack the vocabulary to describe it."</p><blockquote>"A city is not merely stone and mortar; it is the physical manifestation of the collective will of its inhabitants. When the will fractures, the walls follow."</blockquote><p>He walked over to the table, trailing his fingers along the edge. "Have you found it? The architectural drafts for the lower aqueducts?"</p><p>"I found something," she said cautiously, tapping the cover of the ledger. "But it is not a draft of water lines. It is a map of the voids — the spaces left intentionally empty when the city was built. They weren''t just saving stone, Elias. They were tuning the city to resonate."</p><p>The implications settled heavily between them. The silence of the Archive felt less like an absence of sound and more like a held breath. If the city was an instrument, who, or what, had been playing it? And more pressingly, what happened when the music stopped?</p>',
   1, 25, 'published'),

  -- Book 3 — The Gilded Age (one teaser chapter)
  (9, 3, 1, 'The First Diary',
   '<p>The first diary was written in a hand that had not yet decided whether it was going to be patient.</p>',
   0, 0, 'published'),

  -- Book 4 — Midnight City (one teaser chapter)
  (10, 4, 1, 'Hours Past Midnight',
   '<p>The city did not, as people sometimes claimed, sleep. It only changed the subject.</p>',
   0, 0, 'published'),

  -- Book 13 — The King''s Decree (draft chapter shown in Author Dashboard)
  (11, 13, 1, 'The Council Convenes',
   '<p>The throne had been polished, badly, by someone in a hurry.</p>',
   1, 20, 'draft');

-- =====================================================================
-- Comments — populate the Reader Notes section the Reading Interface
-- design shows under chapter 8 (Architecture of Silence, Ch. 4).
-- =====================================================================
INSERT INTO comments (book_id, chapter_id, user_id, parent_id, body, status) VALUES
  (2, 8, 4, NULL,
   'The concept of the city being ''tuned to resonate'' is fascinating. Reminds me of the acoustic design in ancient amphitheatres, but applied on a macro scale.',
   'visible'),
  (2, 8, 5, NULL,
   'I wonder if Elias is immune to the ''shift in the foundation'' Seraphina mentioned, or just better at hiding it.',
   'visible'),
  (1, NULL, 3, NULL,
   'The premise alone is gorgeous. Already taken with the prose.',
   'visible'),
  (1, 1, 3, NULL,
   'That opening line has stayed with me all day.',
   'visible');

-- =====================================================================
-- Transactions — give the admin dashboard something realistic to render
-- =====================================================================
INSERT INTO transactions (user_id, type, tokens_delta, ref_chapter_id, meta, created_at) VALUES
  (3, 'purchase',     500, NULL, JSON_OBJECT('package','starter'),   NOW() - INTERVAL 5 DAY),
  (4, 'purchase',     250, NULL, JSON_OBJECT('package','standard'),  NOW() - INTERVAL 3 DAY),
  (5, 'purchase',     200, NULL, JSON_OBJECT('package','starter'),   NOW() - INTERVAL 2 DAY),
  (3, 'unlock',       -15, 3,    JSON_OBJECT('book_id', 1),          NOW() - INTERVAL 1 DAY),
  (4, 'unlock',       -25, 8,    JSON_OBJECT('book_id', 2),          NOW() - INTERVAL 6 HOUR),
  (5, 'unlock',       -20, 7,    JSON_OBJECT('book_id', 2),          NOW() - INTERVAL 2 HOUR);

-- Mirror the unlocks above into chapter_unlocks so the reading flow
-- treats those chapters as already paid for.
INSERT INTO chapter_unlocks (user_id, chapter_id, tokens_spent) VALUES
  (3, 3, 15),
  (4, 8, 25),
  (5, 7, 20);
