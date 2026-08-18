-- AlterTable
ALTER TABLE `integration_connections`
    ADD COLUMN `whatsapp_phone_number_id` VARCHAR(80) NULL,
    ADD COLUMN `whatsapp_business_account_id` VARCHAR(80) NULL,
    ADD COLUMN `whatsapp_display_phone_number` VARCHAR(40) NULL,
    ADD COLUMN `webhook_verify_token_hash` VARCHAR(64) NULL,
    ADD COLUMN `webhook_status` VARCHAR(40) NULL,
    ADD COLUMN `last_webhook_received_at` DATETIME(3) NULL,
    ADD COLUMN `last_webhook_verified_at` DATETIME(3) NULL,
    ADD COLUMN `last_inbound_message_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `integration_credentials`
    MODIFY `credential_type` ENUM('OAUTH2', 'IMAP_PASSWORD', 'META_WHATSAPP') NOT NULL,
    ADD COLUMN `encrypted_app_secret` TEXT NULL;

-- AlterTable
ALTER TABLE `synchronization_runs`
    MODIFY `trigger_type` ENUM('MANUAL', 'WEBHOOK') NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE `integration_webhook_deliveries` (
    `id` VARCHAR(191) NOT NULL,
    `connection_id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `provider` ENUM('GOOGLE_REVIEWS', 'WHATSAPP', 'EMAIL', 'X', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `external_event_id` VARCHAR(255) NULL,
    `payload_hash` VARCHAR(64) NOT NULL,
    `status` ENUM('RECEIVED', 'IMPORTED', 'DUPLICATE', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
    `result_code` VARCHAR(80) NULL,
    `safe_message` VARCHAR(500) NULL,
    `message_type` VARCHAR(40) NULL,
    `sender_hash` VARCHAR(64) NULL,
    `safe_preview` JSON NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `webhook_delivery_event_key`(`connection_id`, `external_event_id`),
    INDEX `webhook_delivery_business_received_idx`(`business_id`, `received_at`),
    INDEX `webhook_delivery_conn_received_idx`(`connection_id`, `received_at`),
    INDEX `webhook_delivery_status_received_idx`(`status`, `received_at`),
    INDEX `webhook_delivery_external_event_idx`(`external_event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `conn_whatsapp_phone_mode_key` ON `integration_connections`(`provider`, `mode`, `whatsapp_phone_number_id`);

-- CreateIndex
CREATE INDEX `conn_whatsapp_phone_idx` ON `integration_connections`(`whatsapp_phone_number_id`);

-- CreateIndex
CREATE INDEX `conn_webhook_status_idx` ON `integration_connections`(`webhook_status`);

-- AddForeignKey
ALTER TABLE `integration_webhook_deliveries` ADD CONSTRAINT `webhook_delivery_connection_fk` FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `integration_webhook_deliveries` ADD CONSTRAINT `webhook_delivery_business_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
