-- CreateTable
CREATE TABLE `ExperimentEvent` (
    `id` VARCHAR(191) NOT NULL,
    `experiment` VARCHAR(40) NOT NULL,
    `variant` VARCHAR(40) NOT NULL,
    `visitor` VARCHAR(64) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExperimentEvent_experiment_variant_type_idx`(`experiment`, `variant`, `type`),
    UNIQUE INDEX `ExperimentEvent_experiment_visitor_type_key`(`experiment`, `visitor`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

