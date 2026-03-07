export class TokenService {
  public getSupportedTokenTypes(): string[] {
    return ['access', 'refresh', 'email_verification', 'password_reset'];
  }
}

export const tokenService = new TokenService();
