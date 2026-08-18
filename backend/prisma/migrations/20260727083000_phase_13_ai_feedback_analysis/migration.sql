-- AlterTable
ALTER TABLE `feedback_activities` MODIFY `type` ENUM('STATUS_CHANGED', 'NOTE_ADDED', 'ASSIGNMENT_CHANGED', 'CATEGORY_CHANGED', 'PRIORITY_CHANGED', 'AI_RETRY_REQUESTED', 'AI_CATEGORY_APPLIED', 'AI_CATEGORY_DISMISSED') NOT NULL;

-- CreateTable
CREATE TABLE `feedback_ai_analyses` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `feedback_id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `sentiment` ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED') NULL,
    `sentiment_confidence` DOUBLE NULL,
    `sentiment_explanation` VARCHAR(240) NULL,
    `summary` VARCHAR(240) NULL,
    `detected_language` VARCHAR(40) NULL,
    `suggested_category_id` VARCHAR(191) NULL,
    `category_confidence` DOUBLE NULL,
    `suggestion_dismissed_at` DATETIME(3) NULL,
    `category_auto_applied_at` DATETIME(3) NULL,
    `category_application_result` VARCHAR(80) NULL,
    `provider` VARCHAR(40) NOT NULL DEFAULT 'gemini',
    `model` VARCHAR(120) NOT NULL,
    `prompt_version` VARCHAR(40) NOT NULL DEFAULT 'phase13-v1',
    `schema_version` VARCHAR(40) NOT NULL DEFAULT 'phase13-v1',
    `input_fingerprint` VARCHAR(64) NULL,
    `input_truncated` BOOLEAN NOT NULL DEFAULT false,
    `analyzed_char_count` INTEGER NOT NULL DEFAULT 0,
    `error_code` VARCHAR(80) NULL,
    `error_message` VARCHAR(500) NULL,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `max_retries` INTEGER NOT NULL DEFAULT 3,
    `next_retry_at` DATETIME(3) NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `processing_duration_ms` INTEGER NULL,
    `lock_token` VARCHAR(64) NULL,
    `locked_at` DATETIME(3) NULL,
    `last_attempt_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `feedback_ai_analyses_feedback_id_key`(`feedback_id`),
    INDEX `feedback_ai_analyses_business_id_status_next_retry_at_idx`(`business_id`, `status`, `next_retry_at`),
    INDEX `feedback_ai_analyses_status_next_retry_at_idx`(`status`, `next_retry_at`),
    INDEX `feedback_ai_analyses_status_locked_at_idx`(`status`, `locked_at`),
    INDEX `feedback_ai_analyses_sentiment_idx`(`sentiment`),
    INDEX `feedback_ai_analyses_suggested_category_id_idx`(`suggested_category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `feedback_ai_analyses` ADD CONSTRAINT `feedback_ai_analyses_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_ai_analyses` ADD CONSTRAINT `feedback_ai_analyses_feedback_id_fkey` FOREIGN KEY (`feedback_id`) REFERENCES `feedback`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_ai_analyses` ADD CONSTRAINT `feedback_ai_analyses_suggested_category_id_fkey` FOREIGN KEY (`suggested_category_id`) REFERENCES `feedback_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
