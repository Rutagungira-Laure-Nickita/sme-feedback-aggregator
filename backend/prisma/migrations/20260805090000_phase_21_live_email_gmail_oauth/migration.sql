-- AlterTable
ALTER TABLE `integration_connections`
    MODIFY `demo_scenario` ENUM('STANDARD_MIXED', 'PARTIAL_FAILURE') NULL DEFAULT 'STANDARD_MIXED',
    ADD COLUMN `live_provider_type` ENUM('GMAIL', 'MICROSOFT', 'IMAP') NULL,
    ADD COLUMN `provider_account_id` VARCHAR(255) NULL,
    ADD COLUMN `provider_account_label` VARCHAR(255) NULL,
    ADD COLUMN `provider_tenant_id` VARCHAR(255) NULL,
    ADD COLUMN `synchronization_folder` VARCHAR(120) NOT NULL DEFAULT 'INBOX',
    ADD COLUMN `last_provider_cursor` TEXT NULL,
    ADD COLUMN `last_provider_cursor_at` DATETIME(3) NULL,
    ADD COLUMN `requires_reauthorization` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `last_connection_test_at` DATETIME(3) NULL,
    ADD COLUMN `last_connection_test_status` VARCHAR(40) NULL;

-- AlterTable
ALTER TABLE `synchronization_runs`
    MODIFY `demo_scenario` ENUM('STANDARD_MIXED', 'PARTIAL_FAILURE') NULL;

-- CreateTable
CREATE TABLE `integration_credentials` (
    `id` VARCHAR(191) NOT NULL,
    `connection_id` VARCHAR(191) NOT NULL,
    `credential_type` ENUM('OAUTH2', 'IMAP_PASSWORD') NOT NULL,
    `encrypted_access_token` TEXT NULL,
    `encrypted_refresh_token` TEXT NULL,
    `encrypted_password` TEXT NULL,
    `encryption_key_version` INTEGER NOT NULL DEFAULT 1,
    `access_token_expires_at` DATETIME(3) NULL,
    `scope_summary` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `rotated_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,

    UNIQUE INDEX `integration_credentials_connection_id_credential_type_key`(`connection_id`, `credential_type`),
    INDEX `integration_credentials_revoked_at_idx`(`revoked_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `integration_oauth_states` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `connection_id` VARCHAR(191) NOT NULL,
    `membership_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `default_branch_id` VARCHAR(191) NOT NULL,
    `provider` ENUM('GOOGLE_REVIEWS', 'WHATSAPP', 'EMAIL', 'X', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `email_provider_type` ENUM('GMAIL', 'MICROSOFT', 'IMAP') NOT NULL,
    `action` ENUM('CONNECT', 'REAUTHORIZE') NOT NULL,
    `state_hash` VARCHAR(64) NOT NULL,
    `encrypted_code_verifier` TEXT NOT NULL,
    `redirect_path` VARCHAR(512) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `integration_oauth_states_state_hash_key`(`state_hash`),
    INDEX `integration_oauth_states_business_id_membership_id_idx`(`business_id`, `membership_id`),
    INDEX `integration_oauth_states_connection_id_idx`(`connection_id`),
    INDEX `integration_oauth_states_expires_at_idx`(`expires_at`),
    INDEX `integration_oauth_states_used_at_idx`(`used_at`),
    INDEX `integration_oauth_states_user_id_idx`(`user_id`),
    INDEX `integration_oauth_states_default_branch_id_idx`(`default_branch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `integration_connections_business_id_live_provider_type_idx` ON `integration_connections`(`business_id`, `live_provider_type`);

-- CreateIndex
CREATE INDEX `integration_connections_requires_reauthorization_idx` ON `integration_connections`(`requires_reauthorization`);

-- CreateIndex
CREATE INDEX `integration_connections_last_connection_test_at_idx` ON `integration_connections`(`last_connection_test_at`);

-- AddForeignKey
ALTER TABLE `integration_credentials` ADD CONSTRAINT `integration_credentials_connection_id_fkey` FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `integration_oauth_states` ADD CONSTRAINT `integration_oauth_states_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `integration_oauth_states` ADD CONSTRAINT `integration_oauth_states_connection_id_fkey` FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `integration_oauth_states` ADD CONSTRAINT `integration_oauth_states_membership_id_fkey` FOREIGN KEY (`membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `integration_oauth_states` ADD CONSTRAINT `integration_oauth_states_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `integration_oauth_states` ADD CONSTRAINT `integration_oauth_states_default_branch_id_fkey` FOREIGN KEY (`default_branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
