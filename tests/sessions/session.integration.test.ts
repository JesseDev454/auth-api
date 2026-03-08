import { createTestClient } from '../helpers/app';
import { findRefreshTokenByRawToken, listRefreshTokensForUser } from '../helpers/database';
import { createAuthenticatedUser, loginUser } from '../helpers/users';

describe('Session management integration', () => {
  it('lists only the authenticated user sessions', async () => {
    const client = createTestClient();
    const firstUser = await createAuthenticatedUser(client);
    await loginUser(client, {
      email: firstUser.payload.email,
      password: firstUser.payload.password,
    });

    await createAuthenticatedUser(client);

    const response = await client
      .get('/api/v1/users/sessions')
      .set('Authorization', `Bearer ${firstUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Sessions fetched successfully');
    expect(response.body.data.sessions).toHaveLength(2);
    expect(response.body.data.sessions[0]).toMatchObject({
      id: expect.any(String),
      createdAt: expect.any(String),
      expiresAt: expect.any(String),
    });
    expect(response.body.data.sessions[0].tokenHash).toBeUndefined();

    const persistedSessions = await listRefreshTokensForUser(firstUser.user.id);
    expect(response.body.data.sessions.map((session: { id: string }) => session.id).sort()).toEqual(
      persistedSessions.map((session) => session.id).sort(),
    );
  });

  it('revokes an owned session', async () => {
    const client = createTestClient();
    const firstUser = await createAuthenticatedUser(client);
    const secondLogin = await loginUser(client, {
      email: firstUser.payload.email,
      password: firstUser.payload.password,
    });
    const secondSession = await findRefreshTokenByRawToken(secondLogin.body.data.tokens.refreshToken);

    const response = await client
      .delete(`/api/v1/users/sessions/${secondSession!.id}`)
      .set('Authorization', `Bearer ${firstUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Session revoked successfully');

    const refreshedSession = await findRefreshTokenByRawToken(secondLogin.body.data.tokens.refreshToken);
    expect(refreshedSession?.revokedAt).not.toBeNull();
  });

  it('treats revoking an already revoked session as idempotent success', async () => {
    const client = createTestClient();
    const firstUser = await createAuthenticatedUser(client);
    const secondLogin = await loginUser(client, {
      email: firstUser.payload.email,
      password: firstUser.payload.password,
    });
    const secondSession = await findRefreshTokenByRawToken(secondLogin.body.data.tokens.refreshToken);

    await client
      .delete(`/api/v1/users/sessions/${secondSession!.id}`)
      .set('Authorization', `Bearer ${firstUser.accessToken}`);

    const response = await client
      .delete(`/api/v1/users/sessions/${secondSession!.id}`)
      .set('Authorization', `Bearer ${firstUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Session revoked successfully');
  });

  it('blocks revoking another user session', async () => {
    const client = createTestClient();
    const firstUser = await createAuthenticatedUser(client);
    const secondUser = await createAuthenticatedUser(client);
    const secondUserSession = await findRefreshTokenByRawToken(secondUser.refreshToken);

    const response = await client
      .delete(`/api/v1/users/sessions/${secondUserSession!.id}`)
      .set('Authorization', `Bearer ${firstUser.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
