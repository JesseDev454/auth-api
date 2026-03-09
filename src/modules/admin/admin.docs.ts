/**
 * @openapi
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List users with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       '200':
 *         description: Users fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUsersResponse'
 *       '401':
 *         description: Authentication is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/v1/admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Update a user's role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRoleRequest'
 *     responses:
 *       '200':
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateUserRoleResponse'
 *       '403':
 *         description: Forbidden action
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export {};
