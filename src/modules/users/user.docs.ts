/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Fetch the current authenticated user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       '401':
 *         description: Authentication is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/v1/users/sessions:
 *   get:
 *     tags: [Users]
 *     summary: List the authenticated user's sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Sessions fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionListResponse'
 *       '401':
 *         description: Authentication is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/v1/users/sessions/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Revoke one of the authenticated user's sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Session revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccessResponse'
 *       '403':
 *         description: Session belongs to another user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export {};
