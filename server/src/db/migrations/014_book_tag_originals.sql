-- GS Originals home section: dedicated `originals` book_tags shelf.
-- Backfill from legacy behavior (rising_fictions, else editors_choice).

INSERT IGNORE INTO book_tags (book_id, tag)
SELECT book_id, 'originals'
  FROM book_tags
 WHERE tag = 'rising_fictions';

INSERT IGNORE INTO book_tags (book_id, tag)
SELECT bt.book_id, 'originals'
  FROM book_tags bt
 WHERE bt.tag = 'editors_choice'
   AND NOT EXISTS (SELECT 1 FROM book_tags WHERE tag = 'rising_fictions');
