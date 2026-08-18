-- CreateTable
CREATE TABLE `feedback_ingestions` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `channel` ENUM('MANUAL', 'PUBLIC_FORM', 'QR_CODE', 'WHATSAPP', 'INSTAGRAM', 'X', 'GOOGLE_REVIEW', 'EMAIL', 'OTHER') NOT NULL,
    `external_id` VARCHAR(255) NULL,
    `idempotency_key` VARCHAR(255) NOT NULL,
    `payload_hash` VARCHAR(64) NOT NULL,
    `status` ENUM('PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PROCESSING',
    `processing_version` VARCHAR(40) NOT NULL DEFAULT 'phase4-v1',
    `error_code` VARCHAR(80) NULL,
    `error_message` VARCHAR(500) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `feedback_ingestions_status_idx`(`status`),
    INDEX `feedback_ingestions_business_id_created_at_idx`(`business_id`, `created_at`),
    INDEX `feedback_ingestions_status_created_at_idx`(`status`, `created_at`),
    UNIQUE INDEX `feedback_ingestions_business_id_channel_idempotency_key_key`(`business_id`, `channel`, `idempotency_key`),
    UNIQUE INDEX `feedback_ingestions_business_id_channel_external_id_key`(`business_id`, `channel`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feedback` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `ingestion_id` VARCHAR(191) NOT NULL,
    `channel` ENUM('MANUAL', 'PUBLIC_FORM', 'QR_CODE', 'WHATSAPP', 'INSTAGRAM', 'X', 'GOOGLE_REVIEW', 'EMAIL', 'OTHER') NOT NULL,
    `external_id` VARCHAR(255) NULL,
    `title` VARCHAR(250) NULL,
    `message` TEXT NOT NULL,
    `rating` INTEGER NULL,
    `customer_name` VARCHAR(160) NULL,
    `customer_email` VARCHAR(255) NULL,
    `customer_phone` VARCHAR(40) NULL,
    `source_url` VARCHAR(1024) NULL,
    `language_code` VARCHAR(20) NULL,
    `occurred_at` DATETIME(3) NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `source_metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `feedback_ingestion_id_key`(`ingestion_id`),
    INDEX `feedback_business_id_received_at_idx`(`business_id`, `received_at`),
    INDEX `feedback_branch_id_received_at_idx`(`branch_id`, `received_at`),
    INDEX `feedback_channel_idx`(`channel`),
    UNIQUE INDEX `feedback_business_id_channel_external_id_key`(`business_id`, `channel`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feedback_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `feedback_id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(120) NOT NULL,
    `size_bytes` INTEGER NULL,
    `external_url` VARCHAR(1024) NULL,
    `checksum` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `feedback_attachments_feedback_id_idx`(`feedback_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `feedback_ingestions` ADD CONSTRAINT `feedback_ingestions_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_ingestions` ADD CONSTRAINT `feedback_ingestions_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_ingestion_id_fkey` FOREIGN KEY (`ingestion_id`) REFERENCES `feedback_ingestions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_attachments` ADD CONSTRAINT `feedback_attachments_feedback_id_fkey` FOREIGN KEY (`feedback_id`) REFERENCES `feedback`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
