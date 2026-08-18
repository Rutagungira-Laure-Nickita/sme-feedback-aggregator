-- Phase 11 - Customer Profiles
-- Adds business-scoped customers and optional feedback links.
-- Existing feedback customer snapshot columns are preserved and no historical backfill is performed.

CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(160) NOT NULL,
    `first_name` VARCHAR(100) NULL,
    `last_name` VARCHAR(100) NULL,
    `email` VARCHAR(255) NULL,
    `normalized_email` VARCHAR(255) NULL,
    `phone` VARCHAR(40) NULL,
    `normalized_phone` VARCHAR(40) NULL,
    `status` ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `archived_at` DATETIME(3) NULL,
    `created_by_membership_id` VARCHAR(191) NULL,
    `updated_by_membership_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customers_business_id_status_idx`(`business_id`, `status`),
    INDEX `customers_business_id_normalized_email_idx`(`business_id`, `normalized_email`),
    INDEX `customers_business_id_normalized_phone_idx`(`business_id`, `normalized_phone`),
    INDEX `customers_business_id_updated_at_idx`(`business_id`, `updated_at`),
    INDEX `customers_business_id_display_name_idx`(`business_id`, `display_name`),
    INDEX `customers_created_by_membership_id_idx`(`created_by_membership_id`),
    INDEX `customers_updated_by_membership_id_idx`(`updated_by_membership_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `feedback` ADD COLUMN `customer_id` VARCHAR(191) NULL;

CREATE TABLE `customer_activities` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `type` ENUM('CREATED', 'UPDATED', 'ARCHIVED', 'REACTIVATED', 'FEEDBACK_LINKED', 'FEEDBACK_UNLINKED') NOT NULL,
    `actor_membership_id` VARCHAR(191) NULL,
    `feedback_id` VARCHAR(191) NULL,
    `field_name` VARCHAR(80) NULL,
    `from_value` VARCHAR(255) NULL,
    `to_value` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customer_activities_customer_id_created_at_idx`(`customer_id`, `created_at`),
    INDEX `customer_activities_business_id_created_at_idx`(`business_id`, `created_at`),
    INDEX `customer_activities_feedback_id_idx`(`feedback_id`),
    INDEX `customer_activities_actor_membership_id_idx`(`actor_membership_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `feedback_customer_id_received_at_idx` ON `feedback`(`customer_id`, `received_at`);

ALTER TABLE `customers` ADD CONSTRAINT `customers_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `customers` ADD CONSTRAINT `customers_created_by_membership_id_fkey` FOREIGN KEY (`created_by_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `customers` ADD CONSTRAINT `customers_updated_by_membership_id_fkey` FOREIGN KEY (`updated_by_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `feedback` ADD CONSTRAINT `feedback_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `customer_activities` ADD CONSTRAINT `customer_activities_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `customer_activities` ADD CONSTRAINT `customer_activities_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `customer_activities` ADD CONSTRAINT `customer_activities_actor_membership_id_fkey` FOREIGN KEY (`actor_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `customer_activities` ADD CONSTRAINT `customer_activities_feedback_id_fkey` FOREIGN KEY (`feedback_id`) REFERENCES `feedback`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
