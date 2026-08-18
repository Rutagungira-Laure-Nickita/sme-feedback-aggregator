-- AlterTable
ALTER TABLE `feedback_activities` ADD COLUMN `actor_type` ENUM('HUMAN', 'SYSTEM') NOT NULL DEFAULT 'HUMAN',
    ADD COLUMN `automation_rule_id` VARCHAR(191) NULL,
    ADD COLUMN `automation_rule_name` VARCHAR(120) NULL;

-- CreateTable
CREATE TABLE `feedback_field_states` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `feedback_id` VARCHAR(191) NOT NULL,
    `field` ENUM('STATUS', 'PRIORITY', 'CATEGORY', 'ASSIGNMENT') NOT NULL,
    `source` ENUM('HUMAN', 'AI', 'AUTOMATION', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
    `source_rule_id` VARCHAR(191) NULL,
    `updated_by_membership_id` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `feedback_field_states_business_id_field_idx`(`business_id`, `field`),
    INDEX `feedback_field_states_source_rule_id_idx`(`source_rule_id`),
    INDEX `feedback_field_states_updated_by_membership_id_idx`(`updated_by_membership_id`),
    UNIQUE INDEX `feedback_field_states_feedback_id_field_key`(`feedback_id`, `field`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_rules` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(500) NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `branch_scope` ENUM('ALL_BRANCHES', 'SELECTED_BRANCHES') NOT NULL DEFAULT 'ALL_BRANCHES',
    `trigger` ENUM('FEEDBACK_CREATED', 'AI_ANALYSIS_COMPLETED') NOT NULL,
    `match_mode` ENUM('ALL', 'ANY') NOT NULL DEFAULT 'ALL',
    `stop_processing_after_match` BOOLEAN NOT NULL DEFAULT false,
    `position` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_by_membership_id` VARCHAR(191) NULL,
    `updated_by_membership_id` VARCHAR(191) NULL,
    `archived_at` DATETIME(3) NULL,
    `last_triggered_at` DATETIME(3) NULL,
    `execution_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `automation_rules_business_id_status_trigger_position_idx`(`business_id`, `status`, `trigger`, `position`),
    INDEX `automation_rules_business_id_status_idx`(`business_id`, `status`),
    INDEX `automation_rules_created_by_membership_id_idx`(`created_by_membership_id`),
    INDEX `automation_rules_updated_by_membership_id_idx`(`updated_by_membership_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_rule_branches` (
    `rule_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,

    INDEX `automation_rule_branches_branch_id_idx`(`branch_id`),
    PRIMARY KEY (`rule_id`, `branch_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_conditions` (
    `id` VARCHAR(191) NOT NULL,
    `rule_id` VARCHAR(191) NOT NULL,
    `type` ENUM('BRANCH', 'CHANNEL', 'RATING', 'STATUS', 'PRIORITY', 'CATEGORY', 'ASSIGNMENT_STATE', 'CUSTOMER_LINK_STATE', 'AI_STATUS', 'SENTIMENT', 'SENTIMENT_CONFIDENCE', 'AI_SUGGESTED_CATEGORY', 'AI_CATEGORY_CONFIDENCE', 'AI_SUGGESTION_STATE') NOT NULL,
    `operator` ENUM('EQUALS', 'NOT_EQUALS', 'IN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL', 'IS_EMPTY', 'IS_NOT_EMPTY') NOT NULL,
    `position` INTEGER NOT NULL,
    `value_string` VARCHAR(255) NULL,
    `value_number` DOUBLE NULL,
    `value_json` JSON NULL,
    `branch_id` VARCHAR(191) NULL,
    `category_id` VARCHAR(191) NULL,

    INDEX `automation_conditions_rule_id_position_idx`(`rule_id`, `position`),
    INDEX `automation_conditions_branch_id_idx`(`branch_id`),
    INDEX `automation_conditions_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_actions` (
    `id` VARCHAR(191) NOT NULL,
    `rule_id` VARCHAR(191) NOT NULL,
    `type` ENUM('SET_PRIORITY', 'SET_CATEGORY', 'ASSIGN_TO_MEMBERSHIP', 'UNASSIGN', 'SET_STATUS') NOT NULL,
    `position` INTEGER NOT NULL,
    `value_string` VARCHAR(255) NULL,
    `category_id` VARCHAR(191) NULL,
    `target_membership_id` VARCHAR(191) NULL,

    INDEX `automation_actions_rule_id_position_idx`(`rule_id`, `position`),
    INDEX `automation_actions_category_id_idx`(`category_id`),
    INDEX `automation_actions_target_membership_id_idx`(`target_membership_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_events` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `feedback_id` VARCHAR(191) NOT NULL,
    `trigger` ENUM('FEEDBACK_CREATED', 'AI_ANALYSIS_COMPLETED') NOT NULL,
    `status` ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `event_key` VARCHAR(96) NOT NULL,
    `input_fingerprint` VARCHAR(64) NOT NULL,
    `event_chain_id` VARCHAR(64) NOT NULL,
    `event_depth` INTEGER NOT NULL DEFAULT 0,
    `lock_token` VARCHAR(64) NULL,
    `locked_at` DATETIME(3) NULL,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `max_retries` INTEGER NOT NULL DEFAULT 3,
    `error_code` VARCHAR(80) NULL,
    `error_message` VARCHAR(500) NULL,
    `queued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `automation_events_event_key_key`(`event_key`),
    INDEX `automation_events_status_locked_at_queued_at_idx`(`status`, `locked_at`, `queued_at`),
    INDEX `automation_events_business_id_trigger_status_idx`(`business_id`, `trigger`, `status`),
    INDEX `automation_events_feedback_id_queued_at_idx`(`feedback_id`, `queued_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_executions` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NULL,
    `rule_id` VARCHAR(191) NULL,
    `feedback_id` VARCHAR(191) NOT NULL,
    `trigger` ENUM('FEEDBACK_CREATED', 'AI_ANALYSIS_COMPLETED') NOT NULL,
    `status` ENUM('SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED', 'NOT_MATCHED') NOT NULL,
    `matched` BOOLEAN NOT NULL DEFAULT false,
    `rule_version` INTEGER NULL,
    `rule_snapshot` JSON NULL,
    `condition_results` JSON NULL,
    `input_fingerprint` VARCHAR(64) NOT NULL,
    `execution_key` VARCHAR(128) NOT NULL,
    `safe_error_code` VARCHAR(80) NULL,
    `safe_error_message` VARCHAR(500) NULL,
    `actions_succeeded` INTEGER NOT NULL DEFAULT 0,
    `actions_skipped` INTEGER NOT NULL DEFAULT 0,
    `actions_failed` INTEGER NOT NULL DEFAULT 0,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `duration_ms` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `automation_executions_execution_key_key`(`execution_key`),
    INDEX `automation_executions_business_id_created_at_idx`(`business_id`, `created_at`),
    INDEX `automation_executions_rule_id_created_at_idx`(`rule_id`, `created_at`),
    INDEX `automation_executions_feedback_id_created_at_idx`(`feedback_id`, `created_at`),
    INDEX `automation_executions_event_id_idx`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_action_executions` (
    `id` VARCHAR(191) NOT NULL,
    `execution_id` VARCHAR(191) NOT NULL,
    `action_id` VARCHAR(191) NULL,
    `action_type` ENUM('SET_PRIORITY', 'SET_CATEGORY', 'ASSIGN_TO_MEMBERSHIP', 'UNASSIGN', 'SET_STATUS') NOT NULL,
    `action_position` INTEGER NOT NULL,
    `status` ENUM('SUCCESS', 'SKIPPED', 'FAILED', 'CONFLICTED') NOT NULL,
    `field_name` VARCHAR(40) NULL,
    `previous_value` VARCHAR(255) NULL,
    `new_value` VARCHAR(255) NULL,
    `safe_error_code` VARCHAR(80) NULL,
    `safe_error_message` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `automation_action_executions_execution_id_action_position_idx`(`execution_id`, `action_position`),
    INDEX `automation_action_executions_action_id_idx`(`action_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `feedback_activities_automation_rule_id_idx` ON `feedback_activities`(`automation_rule_id`);

-- AddForeignKey
ALTER TABLE `feedback_activities` ADD CONSTRAINT `feedback_activities_automation_rule_id_fkey` FOREIGN KEY (`automation_rule_id`) REFERENCES `automation_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_field_states` ADD CONSTRAINT `feedback_field_states_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_field_states` ADD CONSTRAINT `feedback_field_states_feedback_id_fkey` FOREIGN KEY (`feedback_id`) REFERENCES `feedback`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_field_states` ADD CONSTRAINT `feedback_field_states_source_rule_id_fkey` FOREIGN KEY (`source_rule_id`) REFERENCES `automation_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_field_states` ADD CONSTRAINT `feedback_field_states_updated_by_membership_id_fkey` FOREIGN KEY (`updated_by_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_rules` ADD CONSTRAINT `automation_rules_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_rules` ADD CONSTRAINT `automation_rules_created_by_membership_id_fkey` FOREIGN KEY (`created_by_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_rules` ADD CONSTRAINT `automation_rules_updated_by_membership_id_fkey` FOREIGN KEY (`updated_by_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_rule_branches` ADD CONSTRAINT `automation_rule_branches_rule_id_fkey` FOREIGN KEY (`rule_id`) REFERENCES `automation_rules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_rule_branches` ADD CONSTRAINT `automation_rule_branches_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_conditions` ADD CONSTRAINT `automation_conditions_rule_id_fkey` FOREIGN KEY (`rule_id`) REFERENCES `automation_rules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_conditions` ADD CONSTRAINT `automation_conditions_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_conditions` ADD CONSTRAINT `automation_conditions_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `feedback_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_actions` ADD CONSTRAINT `automation_actions_rule_id_fkey` FOREIGN KEY (`rule_id`) REFERENCES `automation_rules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_actions` ADD CONSTRAINT `automation_actions_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `feedback_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_actions` ADD CONSTRAINT `automation_actions_target_membership_id_fkey` FOREIGN KEY (`target_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_events` ADD CONSTRAINT `automation_events_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_events` ADD CONSTRAINT `automation_events_feedback_id_fkey` FOREIGN KEY (`feedback_id`) REFERENCES `feedback`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_executions` ADD CONSTRAINT `automation_executions_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_executions` ADD CONSTRAINT `automation_executions_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `automation_events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_executions` ADD CONSTRAINT `automation_executions_rule_id_fkey` FOREIGN KEY (`rule_id`) REFERENCES `automation_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_executions` ADD CONSTRAINT `automation_executions_feedback_id_fkey` FOREIGN KEY (`feedback_id`) REFERENCES `feedback`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_action_executions` ADD CONSTRAINT `automation_action_executions_execution_id_fkey` FOREIGN KEY (`execution_id`) REFERENCES `automation_executions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_action_executions` ADD CONSTRAINT `automation_action_executions_action_id_fkey` FOREIGN KEY (`action_id`) REFERENCES `automation_actions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
