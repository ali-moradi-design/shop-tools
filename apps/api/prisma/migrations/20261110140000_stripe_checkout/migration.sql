-- AlterTable
ALTER TABLE `Order` ADD COLUMN `checkoutSessionId` VARCHAR(191) NULL,
    MODIFY `paymentMethod` VARCHAR(191) NOT NULL DEFAULT 'stripe';

-- CreateIndex
CREATE UNIQUE INDEX `Order_checkoutSessionId_key` ON `Order`(`checkoutSessionId`);

