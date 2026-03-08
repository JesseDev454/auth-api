import { createTestClient } from '../helpers/app';
import { findUserByEmail } from '../helpers/database';
import { createAuthenticatedUser, createVerifiedUser } from '../helpers/users';

describe('Admin integration', () => {
  it('allows admin users to list users', async () => {
    const client = createTestClient();
    const adminUser = await createAuthenticatedUser(client, { role: 'admin' });
    await createVerifiedUser(client);

    const response = await client
      .get('/api/v1/admin/users?page=1&limit=20')
      .set('Authorization', `Bearer ${adminUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Users fetched successfully');
    expect(response.body.data.users.length).toBeGreaterThanOrEqual(2);
    expect(response.body.data.users[0].passwordHash).toBeUndefined();
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      limit: 20,
    });
  });

  it('blocks non-admin users from admin routes', async () => {
    const client = createTestClient();
    const user = await createAuthenticatedUser(client);

    const response = await client
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${user.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('allows an admin to update another user role', async () => {
    const client = createTestClient();
    const adminUser = await createAuthenticatedUser(client, { role: 'admin' });
    const targetUser = await createVerifiedUser(client);

    const response = await client
      .patch(`/api/v1/admin/users/${targetUser.user.id}/role`)
      .set('Authorization', `Bearer ${adminUser.accessToken}`)
      .send({ role: 'admin' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User role updated successfully');
    expect(response.body.data.user).toMatchObject({
      id: targetUser.user.id,
      role: 'admin',
    });

    const updatedUser = await findUserByEmail(targetUser.payload.email);
    expect(updatedUser?.role.name).toBe('admin');
  });

  it('prevents an admin from removing their own admin role', async () => {
    const client = createTestClient();
    const adminUser = await createAuthenticatedUser(client, { role: 'admin' });

    const response = await client
      .patch(`/api/v1/admin/users/${adminUser.user.id}/role`)
      .set('Authorization', `Bearer ${adminUser.accessToken}`)
      .send({ role: 'user' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body.error.details.reason).toBe('CANNOT_REMOVE_OWN_ADMIN_ROLE');
  });
});
