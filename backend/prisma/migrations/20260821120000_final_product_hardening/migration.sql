-- Final product hardening: preserve feedback ingestion/deduplication and audit history
-- while removing deleted feedback from normal product views.
ALTER TABLE `feedback`
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by_membership_id` VARCHAR(191) NULL;

ALTER TABLE `feedback_activities`
    MODIFY `type` ENUM(
        'FEEDBACK_EDITED',
        'FEEDBACK_DELETED',
        'STATUS_CHANGED',
        'NOTE_ADDED',
        'ASSIGNMENT_CHANGED',
        'CATEGORY_CHANGED',
        'PRIORITY_CHANGED',
        'AI_RETRY_REQUESTED',
        'AI_CATEGORY_APPLIED',
        'AI_CATEGORY_DISMISSED'
    ) NOT NULL;

CREATE INDEX `feedback_business_id_deleted_at_received_at_idx`
    ON `feedback`(`business_id`, `deleted_at`, `received_at`);
CREATE INDEX `feedback_deleted_by_membership_id_idx`
    ON `feedback`(`deleted_by_membership_id`);

ALTER TABLE `feedback`
    ADD CONSTRAINT `feedback_deleted_by_membership_id_fkey`
    FOREIGN KEY (`deleted_by_membership_id`) REFERENCES `business_memberships`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
