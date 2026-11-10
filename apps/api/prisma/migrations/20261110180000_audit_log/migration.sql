-- CreateTable
CREATE TABLE `AuditEntry` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `actorEmail` VARCHAR(191) NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `path` VARCHAR(300) NOT NULL,
    `action` VARCHAR(300) NOT NULL,
    `status` INTEGER NOT NULL,
    `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditEntry_at_idx`(`at`),
    INDEX `AuditEntry_actorId_at_idx`(`actorId`, `at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

