import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Creates the initial schema for users, social accounts, posts, media, sync logs, and app settings.
 */
export class InitialSchema1760000000000 implements MigrationInterface {
  public readonly name: string = 'InitialSchema1760000000000'

  /**
   * Applies the initial schema.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`email\` VARCHAR(255) NOT NULL UNIQUE,
        \`auth_type\` ENUM('sso', 'local') NOT NULL,
        \`username\` VARCHAR(120) NOT NULL UNIQUE,
        \`password_hash\` TEXT NULL,
        \`is_superadmin\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`is_sync_locked\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`social_account\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`provider\` VARCHAR(80) NOT NULL,
        \`account_id\` VARCHAR(255) NOT NULL,
        \`access_token\` TEXT NOT NULL,
        \`refresh_token\` TEXT NULL,
        \`expires_at\` DATETIME NULL,
        UNIQUE KEY \`uq_social_provider_account\` (\`provider\`, \`account_id\`),
        CONSTRAINT \`fk_social_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`post\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`account_id\` INT NOT NULL,
        \`external_post_id\` VARCHAR(255) NOT NULL,
        \`caption\` TEXT NULL,
        \`timestamp\` DATETIME NOT NULL,
        \`synced_at\` DATETIME NULL,
        UNIQUE KEY \`uq_post_account_external\` (\`account_id\`, \`external_post_id\`),
        KEY \`idx_post_user\` (\`user_id\`),
        CONSTRAINT \`fk_post_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_post_account\`
          FOREIGN KEY (\`account_id\`) REFERENCES \`social_account\`(\`id\`) ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`media\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`post_id\` INT NOT NULL,
        \`media_url\` TEXT NOT NULL,
        \`media_type\` VARCHAR(40) NOT NULL,
        \`width\` INT NULL,
        \`height\` INT NULL,
        CONSTRAINT \`fk_media_post\`
          FOREIGN KEY (\`post_id\`) REFERENCES \`post\`(\`id\`) ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`sync_log\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`account_id\` INT NOT NULL,
        \`started_at\` DATETIME NOT NULL,
        \`finished_at\` DATETIME NULL,
        \`success\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`message\` TEXT NULL,
        CONSTRAINT \`fk_sync_log_account\`
          FOREIGN KEY (\`account_id\`) REFERENCES \`social_account\`(\`id\`) ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`app_settings\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(120) NOT NULL UNIQUE,
        \`value\` TEXT NOT NULL,
        \`description\` TEXT NULL,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)
  }

  /**
   * Reverts the initial schema.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `app_settings`')
    await queryRunner.query('DROP TABLE IF EXISTS `sync_log`')
    await queryRunner.query('DROP TABLE IF EXISTS `media`')
    await queryRunner.query('DROP TABLE IF EXISTS `post`')
    await queryRunner.query('DROP TABLE IF EXISTS `social_account`')
    await queryRunner.query('DROP TABLE IF EXISTS `user`')
  }
}
