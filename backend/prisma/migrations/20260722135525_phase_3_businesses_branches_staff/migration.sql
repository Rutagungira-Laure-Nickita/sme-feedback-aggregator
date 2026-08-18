-- CreateTable
CREATE TABLE `businesses` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `industry` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(40) NOT NULL,
    `website` VARCHAR(1024) NULL,
    `logo_url` VARCHAR(1024) NULL,
    `country` VARCHAR(100) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `district` VARCHAR(100) NULL,
    `address_line` VARCHAR(255) NOT NULL,
    `timezone` VARCHAR(80) NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `created_by_user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `businesses_status_idx`(`status`),
    INDEX `businesses_created_by_user_id_idx`(`created_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(140) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `address_line` VARCHAR(255) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `district` VARCHAR(100) NULL,
    `country` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(40) NULL,
    `email` VARCHAR(255) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `branches_business_id_status_idx`(`business_id`, `status`),
    INDEX `branches_status_idx`(`status`),
    UNIQUE INDEX `branches_business_id_code_key`(`business_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_memberships` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MANAGER', 'STAFF') NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'REMOVED') NOT NULL DEFAULT 'ACTIVE',
    `all_branches_access` BOOLEAN NOT NULL DEFAULT false,
    `invited_by_user_id` VARCHAR(191) NULL,
    `joined_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `business_memberships_business_id_status_idx`(`business_id`, `status`),
    INDEX `business_memberships_user_id_status_idx`(`user_id`, `status`),
    INDEX `business_memberships_status_idx`(`status`),
    UNIQUE INDEX `business_memberships_business_id_user_id_key`(`business_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `membership_branch_access` (
    `membership_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `membership_branch_access_branch_id_idx`(`branch_id`),
    PRIMARY KEY (`membership_id`, `branch_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_invitations` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `invited_email` VARCHAR(255) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MANAGER', 'STAFF') NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `all_branches_access` BOOLEAN NOT NULL DEFAULT false,
    `token_hash` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `invited_by_user_id` VARCHAR(191) NOT NULL,
    `accepted_by_user_id` VARCHAR(191) NULL,
    `accepted_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `last_sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `staff_invitations_token_hash_key`(`token_hash`),
    INDEX `staff_invitations_business_id_status_idx`(`business_id`, `status`),
    INDEX `staff_invitations_invited_email_idx`(`invited_email`),
    INDEX `staff_invitations_status_idx`(`status`),
    INDEX `staff_invitations_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_invitation_branches` (
    `invitation_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,

    INDEX `staff_invitation_branches_branch_id_idx`(`branch_id`),
    PRIMARY KEY (`invitation_id`, `branch_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `businesses` ADD CONSTRAINT `businesses_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branches` ADD CONSTRAINT `branches_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_memberships` ADD CONSTRAINT `business_memberships_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_memberships` ADD CONSTRAINT `business_memberships_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_memberships` ADD CONSTRAINT `business_memberships_invited_by_user_id_fkey` FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membership_branch_access` ADD CONSTRAINT `membership_branch_access_membership_id_fkey` FOREIGN KEY (`membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membership_branch_access` ADD CONSTRAINT `membership_branch_access_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_invitations` ADD CONSTRAINT `staff_invitations_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_invitations` ADD CONSTRAINT `staff_invitations_invited_by_user_id_fkey` FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_invitations` ADD CONSTRAINT `staff_invitations_accepted_by_user_id_fkey` FOREIGN KEY (`accepted_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_invitation_branches` ADD CONSTRAINT `staff_invitation_branches_invitation_id_fkey` FOREIGN KEY (`invitation_id`) REFERENCES `staff_invitations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_invitation_branches` ADD CONSTRAINT `staff_invitation_branches_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
