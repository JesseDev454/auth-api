import { sign } from 'jsonwebtoken';

import { env } from '../../src/config/env';

export const createExpiredAccessToken = (userId: string, role = 'user'): string => {
  return sign(
    {
      userId,
      role,
      tokenType: 'access',
    },
    env.jwt.accessSecret,
    {
      expiresIn: -1,
    },
  );
};
