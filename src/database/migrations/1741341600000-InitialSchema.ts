import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class InitialSchema1741341600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'description',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'role_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'full_name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'is_email_verified',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'last_login_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_role_id',
        columnNames: ['role_id'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_deleted_at',
        columnNames: ['deleted_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token_hash',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'revoked_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'last_used_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_by_ip',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'refresh_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_user_status',
        columnNames: ['user_id', 'revoked_at', 'expires_at'],
      }),
    );

    await queryRunner.query(
      'CREATE INDEX "IDX_refresh_tokens_active_lookup" ON "refresh_tokens" ("user_id", "expires_at") WHERE "revoked_at" IS NULL;',
    );

    await queryRunner.createTable(
      new Table({
        name: 'email_verification_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token_hash',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'used_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'email_verification_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'email_verification_tokens',
      new TableIndex({
        name: 'IDX_email_verification_tokens_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'email_verification_tokens',
      new TableIndex({
        name: 'IDX_email_verification_tokens_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'password_reset_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token_hash',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'used_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'password_reset_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'password_reset_tokens',
      new TableIndex({
        name: 'IDX_password_reset_tokens_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'password_reset_tokens',
      new TableIndex({
        name: 'IDX_password_reset_tokens_expires_at',
        columnNames: ['expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('password_reset_tokens', 'IDX_password_reset_tokens_expires_at');
    await queryRunner.dropIndex('password_reset_tokens', 'IDX_password_reset_tokens_user_id');
    await queryRunner.dropTable('password_reset_tokens');

    await queryRunner.dropIndex(
      'email_verification_tokens',
      'IDX_email_verification_tokens_expires_at',
    );
    await queryRunner.dropIndex('email_verification_tokens', 'IDX_email_verification_tokens_user_id');
    await queryRunner.dropTable('email_verification_tokens');

    await queryRunner.query('DROP INDEX "IDX_refresh_tokens_active_lookup";');
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_user_status');
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_user_id');
    await queryRunner.dropTable('refresh_tokens');

    await queryRunner.dropIndex('users', 'IDX_users_deleted_at');
    await queryRunner.dropIndex('users', 'IDX_users_role_id');
    await queryRunner.dropTable('users');

    await queryRunner.dropTable('roles');
  }
}
