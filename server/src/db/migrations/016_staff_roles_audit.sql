-- Staff role templates + admin audit log.

ALTER TABLE users
  ADD COLUMN staff_role VARCHAR(64) NULL AFTER role;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id     BIGINT UNSIGNED NOT NULL,
  actor_email  VARCHAR(190)    NOT NULL,
  actor_role   VARCHAR(32)     NOT NULL,
  staff_role   VARCHAR(64)     NULL,
  action       VARCHAR(64)     NOT NULL,
  target_type  VARCHAR(64)     NULL,
  target_id    BIGINT UNSIGNED NULL,
  summary      VARCHAR(500)    NOT NULL,
  meta         JSON            NULL,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_created (created_at),
  KEY idx_audit_actor (actor_id),
  KEY idx_audit_action (action),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
