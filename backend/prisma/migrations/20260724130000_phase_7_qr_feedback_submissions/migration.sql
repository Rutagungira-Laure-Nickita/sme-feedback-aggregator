-- CreateTable
CREATE TABLE `public_feedback_qr_codes` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NULL,
    `name` VARCHAR(120) NOT NULL,
    `public_token` VARCHAR(96) NOT NULL,
    `portal_token_fingerprint` VARCHAR(64) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by_membership_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `public_feedback_qr_codes_public_token_key`(`public_token`),
    INDEX `public_feedback_qr_codes_business_id_is_active_idx`(`business_id`, `is_active`),
    INDEX `public_feedback_qr_codes_business_id_branch_id_idx`(`business_id`, `branch_id`),
    INDEX `public_feedback_qr_codes_branch_id_idx`(`branch_id`),
    INDEX `public_feedback_qr_codes_created_by_membership_id_idx`(`created_by_membership_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `public_feedback_qr_codes` ADD CONSTRAINT `public_feedback_qr_codes_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `public_feedback_qr_codes` ADD CONSTRAINT `public_feedback_qr_codes_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `public_feedback_qr_codes` ADD CONSTRAINT `public_feedback_qr_codes_created_by_membership_id_fkey` FOREIGN KEY (`created_by_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
