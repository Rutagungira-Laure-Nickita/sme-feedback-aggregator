-- Phase 25.1 stores one safe, globally readable platform-branding record.
CREATE TABLE `platform_settings` (
  `id` VARCHAR(32) NOT NULL DEFAULT 'platform',
  `platform_name` VARCHAR(80) NOT NULL DEFAULT 'SME Feedback Aggregator',
  `brand_tagline` VARCHAR(120) NOT NULL DEFAULT 'Multi-channel intelligence',
  `headline` VARCHAR(180) NOT NULL DEFAULT 'Turn customer feedback into business growth',
  `logo_url` VARCHAR(2048) NULL,
  `primary_color` CHAR(7) NOT NULL DEFAULT '#4F46E5',
  `accent_color` CHAR(7) NOT NULL DEFAULT '#0F9F7F',
  `default_appearance` ENUM('SYSTEM', 'LIGHT', 'DARK') NOT NULL DEFAULT 'SYSTEM',
  `footer_text` VARCHAR(180) NOT NULL DEFAULT 'Copyright 2026 SME Feedback Aggregator. All rights reserved.',
  `updated_by_user_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `platform_settings` (
  `id`,
  `platform_name`,
  `brand_tagline`,
  `headline`,
  `primary_color`,
  `accent_color`,
  `default_appearance`,
  `footer_text`,
  `created_at`,
  `updated_at`
) VALUES (
  'platform',
  'SME Feedback Aggregator',
  'Multi-channel intelligence',
  'Turn customer feedback into business growth',
  '#4F46E5',
  '#0F9F7F',
  'SYSTEM',
  'Copyright 2026 SME Feedback Aggregator. All rights reserved.',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
);
