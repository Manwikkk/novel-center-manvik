-- Finance foundation: payment orders, tax, coupons, refunds, author payouts, reconciliation.
-- Also wallet coin buckets + link from coin ledger (transactions) to payment_orders.

SET NAMES utf8mb4;

-- Wallet buckets (balance remains the sum of purchased + bonus + promo).
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallets' AND COLUMN_NAME = 'purchased_balance');
SET @sql := IF(@col = 0,
  'ALTER TABLE wallets ADD COLUMN purchased_balance INT UNSIGNED NOT NULL DEFAULT 0 AFTER balance',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallets' AND COLUMN_NAME = 'bonus_balance');
SET @sql := IF(@col = 0,
  'ALTER TABLE wallets ADD COLUMN bonus_balance INT UNSIGNED NOT NULL DEFAULT 0 AFTER purchased_balance',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallets' AND COLUMN_NAME = 'promo_balance');
SET @sql := IF(@col = 0,
  'ALTER TABLE wallets ADD COLUMN promo_balance INT UNSIGNED NOT NULL DEFAULT 0 AFTER bonus_balance',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill purchased_balance from current balance when buckets are all zero.
UPDATE wallets
   SET purchased_balance = balance
 WHERE purchased_balance = 0 AND bonus_balance = 0 AND promo_balance = 0 AND balance > 0;

CREATE TABLE IF NOT EXISTS campaigns (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(160)    NOT NULL,
  campaign_type   VARCHAR(64)     NOT NULL DEFAULT 'promo',
  start_at        TIMESTAMP       NULL,
  end_at          TIMESTAMP       NULL,
  status          ENUM('draft','active','ended') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_campaigns_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(64)     NOT NULL,
  name            VARCHAR(160)    NOT NULL,
  discount_type   ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  discount_value  DECIMAL(12,2)   NOT NULL DEFAULT 0,
  campaign_id     BIGINT UNSIGNED NULL,
  start_at        TIMESTAMP       NULL,
  end_at          TIMESTAMP       NULL,
  status          ENUM('active','inactive','expired') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_coupons_code (code),
  KEY idx_coupons_status (status),
  CONSTRAINT fk_coupons_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_orders (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_no            VARCHAR(64)     NOT NULL,
  user_id               BIGINT UNSIGNED NOT NULL,
  pack_key              VARCHAR(64)     NULL,
  product_name          VARCHAR(220)    NOT NULL,
  product_type          VARCHAR(64)     NOT NULL DEFAULT 'coin_pack',
  quantity              INT UNSIGNED    NOT NULL DEFAULT 1,
  currency              CHAR(3)         NOT NULL DEFAULT 'INR',
  unit_price            DECIMAL(12,2)   NOT NULL DEFAULT 0,
  gross_amount          DECIMAL(12,2)   NOT NULL DEFAULT 0,
  discount_amount       DECIMAL(12,2)   NOT NULL DEFAULT 0,
  tax_amount            DECIMAL(12,2)   NOT NULL DEFAULT 0,
  net_amount            DECIMAL(12,2)   NOT NULL DEFAULT 0,
  gateway_fee           DECIMAL(12,2)   NOT NULL DEFAULT 0,
  coins_added           INT UNSIGNED    NOT NULL DEFAULT 0,
  bonus_coins           INT UNSIGNED    NOT NULL DEFAULT 0,
  coupon_id             BIGINT UNSIGNED NULL,
  coupon_code           VARCHAR(64)     NULL,
  payment_method        VARCHAR(64)     NOT NULL DEFAULT 'mock',
  gateway               VARCHAR(64)     NOT NULL DEFAULT 'mock',
  gateway_order_id      VARCHAR(120)    NULL,
  gateway_transaction_id VARCHAR(120)   NULL,
  gateway_settlement_id VARCHAR(120)    NULL,
  status                ENUM('pending','success','failed','refunded','partially_refunded') NOT NULL DEFAULT 'pending',
  platform              VARCHAR(32)     NOT NULL DEFAULT 'web',
  country               VARCHAR(64)     NULL DEFAULT 'India',
  state_province        VARCHAR(64)     NULL,
  created_by            VARCHAR(64)     NOT NULL DEFAULT 'system',
  remarks               VARCHAR(500)    NULL,
  created_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_payment_orders_invoice (invoice_no),
  KEY idx_payment_orders_user_created (user_id, created_at),
  KEY idx_payment_orders_status_created (status, created_at),
  KEY idx_payment_orders_gateway (gateway, created_at),
  CONSTRAINT fk_payment_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_orders_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tax_lines (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_order_id BIGINT UNSIGNED NOT NULL,
  tax_type        VARCHAR(32)     NOT NULL DEFAULT 'GST',
  tax_rate        DECIMAL(8,4)    NOT NULL DEFAULT 0,
  tax_amount      DECIMAL(12,2)   NOT NULL DEFAULT 0,
  country         VARCHAR(64)     NOT NULL DEFAULT 'India',
  state_province  VARCHAR(64)     NULL,
  filing_status   ENUM('unfiled','filed') NOT NULL DEFAULT 'unfiled',
  filing_period   VARCHAR(32)     NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tax_lines_order (payment_order_id),
  KEY idx_tax_lines_period (filing_period),
  CONSTRAINT fk_tax_lines_order FOREIGN KEY (payment_order_id) REFERENCES payment_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  coupon_id       BIGINT UNSIGNED NOT NULL,
  payment_order_id BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  discount_amount DECIMAL(12,2)   NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_coupon_redemption_order (payment_order_id),
  KEY idx_coupon_redemptions_coupon (coupon_id),
  CONSTRAINT fk_coupon_redemptions_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  CONSTRAINT fk_coupon_redemptions_order FOREIGN KEY (payment_order_id) REFERENCES payment_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_coupon_redemptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_refunds (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_order_id BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  refund_amount   DECIMAL(12,2)   NOT NULL DEFAULT 0,
  currency        CHAR(3)         NOT NULL DEFAULT 'INR',
  reason          VARCHAR(500)    NULL,
  status          ENUM('pending','approved','rejected','completed') NOT NULL DEFAULT 'completed',
  approved_by     BIGINT UNSIGNED NULL,
  gateway_reference VARCHAR(120)  NULL,
  notes           VARCHAR(500)    NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payment_refunds_order (payment_order_id),
  KEY idx_payment_refunds_created (created_at),
  CONSTRAINT fk_payment_refunds_order FOREIGN KEY (payment_order_id) REFERENCES payment_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_refunds_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_refunds_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS author_payouts (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  author_id       BIGINT UNSIGNED NOT NULL,
  agreement_type  VARCHAR(64)     NOT NULL DEFAULT 'Revenue Share',
  payout_type     VARCHAR(64)     NOT NULL DEFAULT 'Royalty',
  period_start    DATE            NOT NULL,
  period_end      DATE            NOT NULL,
  gross_amount    DECIMAL(12,2)   NOT NULL DEFAULT 0,
  deductions      DECIMAL(12,2)   NOT NULL DEFAULT 0,
  net_amount      DECIMAL(12,2)   NOT NULL DEFAULT 0,
  currency        CHAR(3)         NOT NULL DEFAULT 'INR',
  status          ENUM('draft','approved','paid','cancelled') NOT NULL DEFAULT 'draft',
  payment_method  VARCHAR(64)     NULL,
  bank_reference  VARCHAR(120)    NULL,
  approved_by     BIGINT UNSIGNED NULL,
  paid_at         TIMESTAMP       NULL,
  notes           VARCHAR(500)    NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_author_payouts_author (author_id, created_at),
  KEY idx_author_payouts_status (status),
  CONSTRAINT fk_author_payouts_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_author_payouts_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS author_royalty_lines (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payout_id       BIGINT UNSIGNED NULL,
  author_id       BIGINT UNSIGNED NOT NULL,
  book_id         BIGINT UNSIGNED NOT NULL,
  period_start    DATE            NOT NULL,
  period_end      DATE            NOT NULL,
  chapters_sold   INT UNSIGNED    NOT NULL DEFAULT 0,
  coins_earned    INT UNSIGNED    NOT NULL DEFAULT 0,
  gross_novel_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  platform_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_revenue     DECIMAL(12,2)   NOT NULL DEFAULT 0,
  royalty_percent DECIMAL(8,4)    NOT NULL DEFAULT 70.0000,
  royalty_amount  DECIMAL(12,2)   NOT NULL DEFAULT 0,
  settlement_status ENUM('pending','available','paid') NOT NULL DEFAULT 'pending',
  available_at    TIMESTAMP       NULL,
  paid_at         TIMESTAMP       NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_royalty_author_period (author_id, period_start, period_end),
  KEY idx_royalty_payout (payout_id),
  CONSTRAINT fk_royalty_payout FOREIGN KEY (payout_id) REFERENCES author_payouts(id) ON DELETE SET NULL,
  CONSTRAINT fk_royalty_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_royalty_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reconciliation_records (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_order_id      BIGINT UNSIGNED NOT NULL,
  settlement_date       DATE            NULL,
  gateway               VARCHAR(64)     NOT NULL DEFAULT 'mock',
  gateway_transaction_id VARCHAR(120)   NULL,
  gateway_settlement_id VARCHAR(120)    NULL,
  currency              CHAR(3)         NOT NULL DEFAULT 'INR',
  gross_amount          DECIMAL(12,2)   NOT NULL DEFAULT 0,
  gateway_fee           DECIMAL(12,2)   NOT NULL DEFAULT 0,
  tax_on_gateway_fee    DECIMAL(12,2)   NOT NULL DEFAULT 0,
  net_settlement        DECIMAL(12,2)   NOT NULL DEFAULT 0,
  expected_settlement   DECIMAL(12,2)   NOT NULL DEFAULT 0,
  settlement_difference DECIMAL(12,2)   NOT NULL DEFAULT 0,
  reconciliation_status ENUM('matched','pending','mismatch','resolved') NOT NULL DEFAULT 'matched',
  settlement_status     ENUM('pending','settled','failed') NOT NULL DEFAULT 'settled',
  reconciled_by         BIGINT UNSIGNED NULL,
  reconciled_on         TIMESTAMP       NULL,
  notes                 VARCHAR(500)    NULL,
  created_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_recon_order (payment_order_id),
  KEY idx_recon_status (reconciliation_status, created_at),
  CONSTRAINT fk_recon_order FOREIGN KEY (payment_order_id) REFERENCES payment_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_recon_user FOREIGN KEY (reconciled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Link coin ledger to payment orders.
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'payment_order_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE transactions ADD COLUMN payment_order_id BIGINT UNSIGNED NULL AFTER ref_chapter_id',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions'
              AND CONSTRAINT_NAME = 'fk_tx_payment_order');
SET @sql := IF(@fk = 0,
  'ALTER TABLE transactions ADD CONSTRAINT fk_tx_payment_order FOREIGN KEY (payment_order_id) REFERENCES payment_orders(id) ON DELETE SET NULL',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Default GST rate in admin_settings (optional column).
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_settings' AND COLUMN_NAME = 'default_gst_rate');
SET @sql := IF(@col = 0,
  'ALTER TABLE admin_settings ADD COLUMN default_gst_rate DECIMAL(8,4) NOT NULL DEFAULT 18.0000 AFTER temporary_ban_days',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_settings' AND COLUMN_NAME = 'author_royalty_percent');
SET @sql := IF(@col = 0,
  'ALTER TABLE admin_settings ADD COLUMN author_royalty_percent DECIMAL(8,4) NOT NULL DEFAULT 70.0000 AFTER default_gst_rate',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
