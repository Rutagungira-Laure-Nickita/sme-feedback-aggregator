-- AlterTable
ALTER TABLE `users` ADD COLUMN `email_verified_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `external_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `provider` ENUM('GOOGLE') NOT NULL,
    `provider_account_id` VARCHAR(255) NOT NULL,
    `provider_email` VARCHAR(255) NULL,
    `display_name` VARCHAR(255) NULL,
    `avatar_url` VARCHAR(1024) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `last_used_at` DATETIME(3) NULL,

    INDEX `external_accounts_user_id_idx`(`user_id`),
    UNIQUE INDEX `external_accounts_provider_provider_account_id_key`(`provider`, `provider_account_id`),
    UNIQUE INDEX `external_accounts_user_id_provider_key`(`user_id`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `external_accounts` ADD CONSTRAINT `external_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
