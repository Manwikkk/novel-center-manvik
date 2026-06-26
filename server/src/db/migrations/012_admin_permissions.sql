-- Staff role + per-page admin permissions
ALTER TABLE users
  MODIFY role ENUM('admin','staff','author','user') NOT NULL DEFAULT 'user';

CREATE TABLE IF NOT EXISTS admin_permissions (
  user_id BIGINT UNSIGNED NOT NULL,
  permission VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission),
  CONSTRAINT fk_admin_permissions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
