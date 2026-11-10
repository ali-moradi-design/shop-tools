-- AlterTable
ALTER TABLE `Order` ADD COLUMN `refundId` VARCHAR(191) NULL,
    ADD COLUMN `shipCarrier` VARCHAR(191) NULL,
    ADD COLUMN `shipTracking` VARCHAR(191) NULL,
    ADD COLUMN `shippedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `ReturnRequest` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `items` JSON NOT NULL,
    `reason` VARCHAR(40) NOT NULL,
    `comment` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'requested',
    `refundAmount` INTEGER NOT NULL DEFAULT 0,
    `refundId` VARCHAR(191) NULL,
    `history` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReturnRequest_orderId_idx`(`orderId`),
    INDEX `ReturnRequest_userId_idx`(`userId`),
    INDEX `ReturnRequest_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

