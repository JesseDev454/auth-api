/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       '201':
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       '400':
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '409':
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/v1/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       '400':
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Rotate access and refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       '200':
 *         description: Tokens refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshResponse'
 *       '401':
 *         description: Invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Log out and revoke the supplied refresh token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LogoutRequest'
 *     responses:
 *       '200':
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccessResponse'
 *       '401':
 *         description: Authentication is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/v1/auth/verify-email:
 *   post:
 *     tags: [Verification]
 *     summary: Verify a pending email address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyEmailRequest'
 *     responses:
 *       '200':
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccessResponse'
 *       '400':
 *         description: Invalid or expired verification token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/v1/auth/resend-verification:
 *   post:
 *     tags: [Verification]
 *     summary: Resend an email verification link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendVerificationRequest'
 *     responses:
 *       '200':
 *         description: Generic success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccessResponse'
 *
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Password Recovery]
 *     summary: Request a password reset link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       '200':
 *         description: Generic success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccessResponse'
 *
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Password Recovery]
 *     summary: Reset a password with a valid reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       '200':
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccessResponse'
 *       '401':
 *         description: Invalid or expired password reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export {};
