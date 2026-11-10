-- AlterTable
ALTER TABLE `User` ADD COLUMN `guest` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `passwordHash` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_tokenHash_key`(`tokenHash`),
    INDEX `PasswordResetToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Address` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `line1` VARCHAR(191) NOT NULL,
    `line2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Address_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailMessage` (
    `id` VARCHAR(191) NOT NULL,
    `to` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(300) NOT NULL,
    `text` TEXT NOT NULL,
    `html` MEDIUMTEXT NOT NULL,
    `template` VARCHAR(60) NOT NULL,
    `status` VARCHAR(10) NOT NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmailMessage_to_createdAt_idx`(`to`, `createdAt`),
    INDEX `EmailMessage_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscriber` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'footer',
    `unsubscribedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Subscriber_email_key`(`email`),
    UNIQUE INDEX `Subscriber_token_key`(`token`),
    INDEX `Subscriber_unsubscribedAt_createdAt_idx`(`unsubscribedAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Address` ADD CONSTRAINT `Address_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

