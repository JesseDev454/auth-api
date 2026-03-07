export interface JwtPayloadShape {
  userId: string;
  role: string;
  tokenType: 'access' | 'refresh';
}

export const jwtUtility = {
  signAccessToken(payload: JwtPayloadShape): string {
    void payload;
    throw new Error('JWT utilities are scaffolded in Sprint 1 and will be implemented later.');
  },
  verifyAccessToken(token: string): JwtPayloadShape {
    void token;
    throw new Error('JWT utilities are scaffolded in Sprint 1 and will be implemented later.');
  },
};
