-- Author's note shown to readers above chapter comments (plain text).
ALTER TABLE chapters
  ADD COLUMN author_thought TEXT NULL
  AFTER content_html;
