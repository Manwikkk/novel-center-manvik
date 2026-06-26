-- Scheduled chapter auto-publish
ALTER TABLE chapters
  ADD COLUMN scheduled_publish_at TIMESTAMP NULL DEFAULT NULL AFTER status;

CREATE INDEX idx_chapters_scheduled_publish
  ON chapters (scheduled_publish_at, status);
