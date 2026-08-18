-- Phase 14 follow-up: add DEFAULT ownership and backfill historical feedback
-- field-source rows without mutating feedback values or executing automation rules.

ALTER TABLE `feedback_field_states`
  MODIFY `source` ENUM('DEFAULT', 'HUMAN', 'AI', 'AUTOMATION', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM';

INSERT IGNORE INTO `feedback_field_states`
  (`id`, `business_id`, `feedback_id`, `field`, `source`, `source_rule_id`, `updated_by_membership_id`, `updated_at`)
SELECT
  CONCAT('ffs_', SHA2(CONCAT(f.`id`, ':STATUS'), 256)),
  f.`business_id`,
  f.`id`,
  'STATUS',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM `feedback_activities` fa
      WHERE fa.`feedback_id` = f.`id`
        AND fa.`actor_type` = 'HUMAN'
        AND fa.`type` = 'STATUS_CHANGED'
    ) THEN 'HUMAN'
    ELSE 'SYSTEM'
  END,
  NULL,
  NULL,
  f.`updated_at`
FROM `feedback` f;

INSERT IGNORE INTO `feedback_field_states`
  (`id`, `business_id`, `feedback_id`, `field`, `source`, `source_rule_id`, `updated_by_membership_id`, `updated_at`)
SELECT
  CONCAT('ffs_', SHA2(CONCAT(f.`id`, ':PRIORITY'), 256)),
  f.`business_id`,
  f.`id`,
  'PRIORITY',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM `feedback_activities` fa
      WHERE fa.`feedback_id` = f.`id`
        AND fa.`actor_type` = 'HUMAN'
        AND fa.`type` = 'PRIORITY_CHANGED'
    ) THEN 'HUMAN'
    ELSE 'DEFAULT'
  END,
  NULL,
  NULL,
  f.`updated_at`
FROM `feedback` f;

INSERT IGNORE INTO `feedback_field_states`
  (`id`, `business_id`, `feedback_id`, `field`, `source`, `source_rule_id`, `updated_by_membership_id`, `updated_at`)
SELECT
  CONCAT('ffs_', SHA2(CONCAT(f.`id`, ':CATEGORY'), 256)),
  f.`business_id`,
  f.`id`,
  'CATEGORY',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM `feedback_ai_analyses` aia
      WHERE aia.`feedback_id` = f.`id`
        AND aia.`category_auto_applied_at` IS NOT NULL
        AND aia.`category_application_result` = 'AUTO_APPLIED'
    ) THEN 'AI'
    WHEN EXISTS (
      SELECT 1
      FROM `feedback_activities` fa
      WHERE fa.`feedback_id` = f.`id`
        AND fa.`actor_type` = 'HUMAN'
        AND fa.`type` = 'CATEGORY_CHANGED'
    ) THEN 'HUMAN'
    WHEN f.`category_id` IS NOT NULL THEN 'HUMAN'
    ELSE 'DEFAULT'
  END,
  NULL,
  NULL,
  f.`updated_at`
FROM `feedback` f;

INSERT IGNORE INTO `feedback_field_states`
  (`id`, `business_id`, `feedback_id`, `field`, `source`, `source_rule_id`, `updated_by_membership_id`, `updated_at`)
SELECT
  CONCAT('ffs_', SHA2(CONCAT(f.`id`, ':ASSIGNMENT'), 256)),
  f.`business_id`,
  f.`id`,
  'ASSIGNMENT',
  CASE
    WHEN f.`assigned_to_membership_id` IS NOT NULL THEN 'HUMAN'
    WHEN EXISTS (
      SELECT 1
      FROM `feedback_activities` fa
      WHERE fa.`feedback_id` = f.`id`
        AND fa.`actor_type` = 'HUMAN'
        AND fa.`type` = 'ASSIGNMENT_CHANGED'
    ) THEN 'HUMAN'
    ELSE 'DEFAULT'
  END,
  NULL,
  NULL,
  f.`updated_at`
FROM `feedback` f;
