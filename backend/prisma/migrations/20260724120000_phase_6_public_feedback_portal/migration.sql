-- AlterTable
ALTER TABLE `businesses`
    ADD COLUMN `public_feedback_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `public_feedback_token` VARCHAR(96) NULL,
    ADD COLUMN `public_feedback_welcome_message` VARCHAR(500) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `businesses_public_feedback_token_key` ON `businesses`(`public_feedback_token`);

-- CreateIndex
CREATE INDEX `businesses_public_feedback_enabled_idx` ON `businesses`(`public_feedback_enabled`);
