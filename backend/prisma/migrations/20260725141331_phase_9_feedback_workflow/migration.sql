-- AlterTable
ALTER TABLE `feedback` ADD COLUMN `status` ENUM('NEW', 'IN_REVIEW', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE `feedback_activities` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `feedback_id` VARCHAR(191) NOT NULL,
    `actor_membership_id` VARCHAR(191) NULL,
    `type` ENUM('STATUS_CHANGED', 'NOTE_ADDED') NOT NULL,
    `fromStatus` ENUM('NEW', 'IN_REVIEW', 'RESOLVED', 'CLOSED') NULL,
    `toStatus` ENUM('NEW', 'IN_REVIEW', 'RESOLVED', 'CLOSED') NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `feedback_activities_feedback_id_created_at_idx`(`feedback_id`, `created_at`),
    INDEX `feedback_activities_business_id_created_at_idx`(`business_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `feedback_status_idx` ON `feedback`(`status`);

-- AddForeignKey
ALTER TABLE `feedback_activities` ADD CONSTRAINT `feedback_activities_feedback_id_fkey` FOREIGN KEY (`feedback_id`) REFERENCES `feedback`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_activities` ADD CONSTRAINT `feedback_activities_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_activities` ADD CONSTRAINT `feedback_activities_actor_membership_id_fkey` FOREIGN KEY (`actor_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
