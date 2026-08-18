-- AlterEnum
ALTER TABLE `feedback_ingestions` MODIFY `channel` ENUM('MANUAL', 'PUBLIC_FORM', 'QR_CODE', 'WHATSAPP', 'INSTAGRAM', 'X', 'GOOGLE_REVIEW', 'EMAIL', 'FACEBOOK', 'OTHER') NOT NULL;

-- AlterEnum
ALTER TABLE `feedback` MODIFY `channel` ENUM('MANUAL', 'PUBLIC_FORM', 'QR_CODE', 'WHATSAPP', 'INSTAGRAM', 'X', 'GOOGLE_REVIEW', 'EMAIL', 'FACEBOOK', 'OTHER') NOT NULL;

-- CreateTable
CREATE TABLE `integration_connections` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `provider` ENUM('GOOGLE_REVIEWS', 'WHATSAPP', 'EMAIL', 'X', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `mode` ENUM('DEMO', 'LIVE') NOT NULL DEFAULT 'DEMO',
    `status` ENUM('CONNECTED', 'PAUSED', 'DISCONNECTED', 'ERROR') NOT NULL DEFAULT 'CONNECTED',
    `display_name` VARCHAR(120) NOT NULL,
    `default_branch_id` VARCHAR(191) NOT NULL,
    `demo_scenario` ENUM('STANDARD_MIXED', 'PARTIAL_FAILURE') NOT NULL DEFAULT 'STANDARD_MIXED',
    `created_by_membership_id` VARCHAR(191) NULL,
    `updated_by_membership_id` VARCHAR(191) NULL,
    `connected_at` DATETIME(3) NULL,
    `paused_at` DATETIME(3) NULL,
    `disconnected_at` DATETIME(3) NULL,
    `last_attempted_sync_at` DATETIME(3) NULL,
    `last_successful_sync_at` DATETIME(3) NULL,
    `last_error_code` VARCHAR(80) NULL,
    `total_imported` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `integration_connections_business_id_provider_mode_key`(`business_id`, `provider`, `mode`),
    INDEX `integration_connections_business_id_provider_idx`(`business_id`, `provider`),
    INDEX `integration_connections_business_id_status_idx`(`business_id`, `status`),
    INDEX `integration_connections_default_branch_id_idx`(`default_branch_id`),
    INDEX `integration_connections_last_successful_sync_at_idx`(`last_successful_sync_at`),
    INDEX `integration_connections_created_by_membership_id_idx`(`created_by_membership_id`),
    INDEX `integration_connections_updated_by_membership_id_idx`(`updated_by_membership_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `synchronization_runs` (
    `id` VARCHAR(191) NOT NULL,
    `connection_id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `provider` ENUM('GOOGLE_REVIEWS', 'WHATSAPP', 'EMAIL', 'X', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `mode` ENUM('DEMO', 'LIVE') NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `trigger_type` ENUM('MANUAL') NOT NULL DEFAULT 'MANUAL',
    `started_by_membership_id` VARCHAR(191) NULL,
    `demo_scenario` ENUM('STANDARD_MIXED', 'PARTIAL_FAILURE') NOT NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `duration_ms` INTEGER NULL,
    `items_fetched` INTEGER NOT NULL DEFAULT 0,
    `items_processed` INTEGER NOT NULL DEFAULT 0,
    `items_imported` INTEGER NOT NULL DEFAULT 0,
    `items_duplicated` INTEGER NOT NULL DEFAULT 0,
    `items_skipped` INTEGER NOT NULL DEFAULT 0,
    `items_failed` INTEGER NOT NULL DEFAULT 0,
    `error_code` VARCHAR(80) NULL,
    `safe_summary` VARCHAR(500) NULL,
    `lock_token` VARCHAR(64) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `next_attempt_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `synchronization_runs_connection_id_created_at_idx`(`connection_id`, `created_at`),
    INDEX `synchronization_runs_business_id_created_at_idx`(`business_id`, `created_at`),
    INDEX `synchronization_runs_status_next_attempt_at_idx`(`status`, `next_attempt_at`),
    INDEX `synchronization_runs_provider_created_at_idx`(`provider`, `created_at`),
    INDEX `synchronization_runs_started_by_membership_id_idx`(`started_by_membership_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `synchronization_items` (
    `id` VARCHAR(191) NOT NULL,
    `run_id` VARCHAR(191) NOT NULL,
    `connection_id` VARCHAR(191) NOT NULL,
    `provider` ENUM('GOOGLE_REVIEWS', 'WHATSAPP', 'EMAIL', 'X', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `external_id` VARCHAR(255) NOT NULL,
    `payload_hash` VARCHAR(64) NOT NULL,
    `status` ENUM('IMPORTED', 'DUPLICATE', 'SKIPPED', 'FAILED') NOT NULL,
    `feedback_ingestion_id` VARCHAR(191) NULL,
    `feedback_id` VARCHAR(191) NULL,
    `result_code` VARCHAR(80) NULL,
    `safe_message` VARCHAR(500) NULL,
    `external_received_at` DATETIME(3) NULL,
    `source_label` VARCHAR(160) NULL,
    `safe_preview` JSON NULL,
    `processed_at` DATETIME(3) NULL,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `synchronization_items_connection_id_external_id_key`(`connection_id`, `external_id`),
    INDEX `synchronization_items_run_id_idx`(`run_id`),
    INDEX `synchronization_items_connection_id_created_at_idx`(`connection_id`, `created_at`),
    INDEX `synchronization_items_feedback_id_idx`(`feedback_id`),
    INDEX `synchronization_items_feedback_ingestion_id_idx`(`feedback_ingestion_id`),
    INDEX `synchronization_items_status_created_at_idx`(`status`, `created_at`),
    INDEX `synchronization_items_external_id_idx`(`external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `integration_connections` ADD CONSTRAINT `integration_connections_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `integration_connections` ADD CONSTRAINT `integration_connections_default_branch_id_fkey` FOREIGN KEY (`default_branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `integration_connections` ADD CONSTRAINT `integration_connections_created_by_membership_id_fkey` FOREIGN KEY (`created_by_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `integration_connections` ADD CONSTRAINT `integration_connections_updated_by_membership_id_fkey` FOREIGN KEY (`updated_by_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `synchronization_runs` ADD CONSTRAINT `synchronization_runs_connection_id_fkey` FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `synchronization_runs` ADD CONSTRAINT `synchronization_runs_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `synchronization_runs` ADD CONSTRAINT `synchronization_runs_started_by_membership_id_fkey` FOREIGN KEY (`started_by_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `synchronization_items` ADD CONSTRAINT `synchronization_items_run_id_fkey` FOREIGN KEY (`run_id`) REFERENCES `synchronization_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `synchronization_items` ADD CONSTRAINT `synchronization_items_connection_id_fkey` FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `synchronization_items` ADD CONSTRAINT `synchronization_items_feedback_ingestion_id_fkey` FOREIGN KEY (`feedback_ingestion_id`) REFERENCES `feedback_ingestions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `synchronization_items` ADD CONSTRAINT `synchronization_items_feedback_id_fkey` FOREIGN KEY (`feedback_id`) REFERENCES `feedback`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
