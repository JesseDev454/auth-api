import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { EmailVerificationToken } from './EmailVerificationToken';
import { PasswordResetToken } from './PasswordResetToken';
import { RefreshToken } from './RefreshToken';
import { Role } from './Role';

@Entity({ name: 'users' })
@Index('IDX_users_role_id', ['roleId'])
@Index('IDX_users_deleted_at', ['deletedAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @ManyToOne(() => Role, (role) => role.users, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ name: 'full_name', type: 'varchar' })
  fullName!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash!: string;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens!: RefreshToken[];

  @OneToMany(() => EmailVerificationToken, (verificationToken) => verificationToken.user)
  emailVerificationTokens!: EmailVerificationToken[];

  @OneToMany(() => PasswordResetToken, (passwordResetToken) => passwordResetToken.user)
  passwordResetTokens!: PasswordResetToken[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
