import bcrypt from 'bcrypt';

const PASSWORD_SALT_ROUNDS = 12;

export const hashUtility = {
  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  },
  comparePassword(password: string, hashedValue: string): Promise<boolean> {
    return bcrypt.compare(password, hashedValue);
  },
};
