-- Existing businesses retain their current status. Only businesses created after this
-- migration enter the explicit platform-administrator approval workflow.
ALTER TABLE `businesses`
  MODIFY `status` ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'ARCHIVED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE `platform_settings`
  ADD COLUMN `platform_description` VARCHAR(500) NOT NULL DEFAULT 'A secure multi-channel feedback workspace for growing businesses.',
  ADD COLUMN `hero_supporting_text` VARCHAR(320) NOT NULL DEFAULT 'Bring every customer voice into one clear workspace, understand what matters, and act with confidence.',
  ADD COLUMN `primary_cta_label` VARCHAR(60) NOT NULL DEFAULT 'Get started',
  ADD COLUMN `secondary_cta_label` VARCHAR(60) NOT NULL DEFAULT 'See how it works',
  ADD COLUMN `support_email` VARCHAR(255) NOT NULL DEFAULT 'support@example.com',
  ADD COLUMN `support_phone` VARCHAR(40) NULL,
  ADD COLUMN `default_report_range_days` INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN `report_footer_text` VARCHAR(180) NOT NULL DEFAULT 'Confidential platform report';

-- Move untouched Phase 25.1 defaults to the Phase 25.2 pink design system while
-- preserving any colors already customized by a platform administrator.
UPDATE `platform_settings`
SET `primary_color` = '#DB2777'
WHERE `primary_color` = '#4F46E5';

UPDATE `platform_settings`
SET `accent_color` = '#F472B6'
WHERE `accent_color` = '#0F9F7F';

CREATE TABLE `platform_admin_activities` (
  `id` VARCHAR(191) NOT NULL,
  `actor_user_id` VARCHAR(191) NOT NULL,
  `action` VARCHAR(80) NOT NULL,
  `target_type` VARCHAR(40) NOT NULL,
  `target_id` VARCHAR(191) NULL,
  `summary` VARCHAR(240) NOT NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `platform_admin_activities_actor_user_id_created_at_idx` (`actor_user_id`, `created_at`),
  INDEX `platform_admin_activities_target_type_target_id_idx` (`target_type`, `target_id`),
  INDEX `platform_admin_activities_created_at_idx` (`created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `platform_admin_activities_actor_user_id_fkey`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
