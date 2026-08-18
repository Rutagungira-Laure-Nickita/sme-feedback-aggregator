-- AlterTable
ALTER TABLE `feedback` ADD COLUMN `assigned_to_membership_id` VARCHAR(191) NULL,
    ADD COLUMN `category_id` VARCHAR(191) NULL,
    ADD COLUMN `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE `feedback_activities` ADD COLUMN `from_value` VARCHAR(255) NULL,
    ADD COLUMN `to_value` VARCHAR(255) NULL,
    MODIFY `type` ENUM('STATUS_CHANGED', 'NOTE_ADDED', 'ASSIGNMENT_CHANGED', 'CATEGORY_CHANGED', 'PRIORITY_CHANGED') NOT NULL;

-- CreateTable
CREATE TABLE `feedback_categories` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NULL,
    `color_key` VARCHAR(32) NOT NULL DEFAULT 'indigo',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `feedback_categories_business_id_is_active_idx`(`business_id`, `is_active`),
    UNIQUE INDEX `feedback_categories_business_id_name_key`(`business_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `feedback_priority_idx` ON `feedback`(`priority`);

-- CreateIndex
CREATE INDEX `feedback_assigned_to_membership_id_idx` ON `feedback`(`assigned_to_membership_id`);

-- CreateIndex
CREATE INDEX `feedback_category_id_idx` ON `feedback`(`category_id`);

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_assigned_to_membership_id_fkey` FOREIGN KEY (`assigned_to_membership_id`) REFERENCES `business_memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `feedback_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_categories` ADD CONSTRAINT `feedback_categories_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
