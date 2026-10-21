-- DropForeignKey
ALTER TABLE `ProductVariant` DROP FOREIGN KEY `ProductVariant_productId_fkey`;

-- DropIndex
DROP INDEX `Product_category_gender_featuredOrder_idx` ON `Product`;

-- DropIndex
DROP INDEX `Product_style_idx` ON `Product`;

-- DropIndex
DROP INDEX `ProductVariant_productId_sku_key` ON `ProductVariant`;

-- DropIndex
DROP INDEX `ProductVariant_size_idx` ON `ProductVariant`;

-- DropIndex
DROP INDEX `ProductVariant_sku_idx` ON `ProductVariant`;

-- AlterTable
ALTER TABLE `OrderItem` DROP COLUMN `size`,
    DROP COLUMN `width`,
    ADD COLUMN `label` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Product` DROP COLUMN `category`,
    DROP COLUMN `color`,
    DROP COLUMN `colorFamily`,
    DROP COLUMN `colorGroup`,
    DROP COLUMN `construction`,
    DROP COLUMN `gender`,
    DROP COLUMN `leather`,
    DROP COLUMN `name`,
    DROP COLUMN `sole`,
    DROP COLUMN `style`,
    ADD COLUMN `brand` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `categoryId` VARCHAR(191) NOT NULL,
    ADD COLUMN `model` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ProductVariant` DROP COLUMN `size`,
    DROP COLUMN `stock`,
    DROP COLUMN `width`,
    ADD COLUMN `label` VARCHAR(191) NOT NULL,
    ADD COLUMN `price` INTEGER NULL;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SpecDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `group` VARCHAR(191) NOT NULL,
    `kind` ENUM('number', 'text') NOT NULL,
    `unit` VARCHAR(191) NULL,
    `unitFamily` VARCHAR(191) NULL,
    `filterable` BOOLEAN NOT NULL DEFAULT true,
    `better` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `SpecDefinition_categoryId_key_key`(`categoryId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductSpec` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `specId` VARCHAR(191) NOT NULL,
    `valueNum` DOUBLE NULL,
    `valueText` VARCHAR(191) NULL,

    INDEX `ProductSpec_specId_valueNum_idx`(`specId`, `valueNum`),
    INDEX `ProductSpec_specId_valueText_idx`(`specId`, `valueText`),
    UNIQUE INDEX `ProductSpec_productId_specId_key`(`productId`, `specId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Warehouse` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Warehouse_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockLevel` (
    `warehouseId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,

    INDEX `StockLevel_variantId_idx`(`variantId`),
    PRIMARY KEY (`warehouseId`, `variantId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItemAllocation` (
    `id` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,

    INDEX `OrderItemAllocation_orderItemId_idx`(`orderItemId`),
    INDEX `OrderItemAllocation_warehouseId_idx`(`warehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Product_categoryId_featuredOrder_idx` ON `Product`(`categoryId`, `featuredOrder`);

-- CreateIndex
CREATE UNIQUE INDEX `ProductVariant_sku_key` ON `ProductVariant`(`sku`);

-- CreateIndex
CREATE INDEX `ProductVariant_productId_idx` ON `ProductVariant`(`productId`);

-- AddForeignKey
ALTER TABLE `SpecDefinition` ADD CONSTRAINT `SpecDefinition_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductSpec` ADD CONSTRAINT `ProductSpec_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductSpec` ADD CONSTRAINT `ProductSpec_specId_fkey` FOREIGN KEY (`specId`) REFERENCES `SpecDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockLevel` ADD CONSTRAINT `StockLevel_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockLevel` ADD CONSTRAINT `StockLevel_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItemAllocation` ADD CONSTRAINT `OrderItemAllocation_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItemAllocation` ADD CONSTRAINT `OrderItemAllocation_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

