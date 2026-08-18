-- CreateTable
CREATE TABLE `account_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET') NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `requested_ip` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `account_tokens_token_hash_key`(`token_hash`),
    INDEX `account_tokens_user_id_type_idx`(`user_id`, `type`),
    INDEX `account_tokens_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `account_tokens` ADD CONSTRAINT `account_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing Phase 2A password users after email verification becomes required.
-- New password registrations after this migration are created with email_verified_at = NULL.
UPDATE `users`
SET `email_verified_at` = COALESCE(`email_verified_at`, `created_at`)
WHERE `password_hash` IS NOT NULL
  AND `email_verified_at` IS NULL;
