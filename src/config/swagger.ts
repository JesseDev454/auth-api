import path from 'node:path';

import swaggerJSDoc from 'swagger-jsdoc';

import { env } from './env';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Authentication API',
      version: '1.0.0',
      description:
        'Production-ready authentication and authorization API with token rotation and session management.',
    },
    servers: [
      {
        url: env.appBaseUrl.replace(/\/$/, ''),
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Something went wrong' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                details: {
                  type: 'object',
                  additionalProperties: true,
                },
              },
              required: ['code'],
            },
          },
          required: ['success', 'message', 'error'],
        },
        GenericSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: {
              type: 'object',
              additionalProperties: true,
            },
          },
          required: ['success', 'message', 'data'],
        },
        RegisterRequest: {
          type: 'object',
          properties: {
            fullName: { type: 'string', minLength: 2, maxLength: 120, example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', minLength: 8, example: 'StrongPassword123!' },
          },
          required: ['fullName', 'email', 'password'],
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', example: 'StrongPassword123!' },
          },
          required: ['email', 'password'],
        },
        RefreshRequest: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string', example: 'raw_refresh_token' },
          },
          required: ['refreshToken'],
        },
        VerifyEmailRequest: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'verification_token' },
          },
          required: ['token'],
        },
        ResendVerificationRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', example: 'john@example.com' },
          },
          required: ['email'],
        },
        ForgotPasswordRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', example: 'john@example.com' },
          },
          required: ['email'],
        },
        ResetPasswordRequest: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'password_reset_token' },
            newPassword: { type: 'string', minLength: 8, example: 'NewStrongPassword123!' },
          },
          required: ['token', 'newPassword'],
        },
        LogoutRequest: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string', example: 'raw_refresh_token' },
          },
          required: ['refreshToken'],
        },
        UpdateUserRoleRequest: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              example: 'admin',
            },
          },
          required: ['role'],
        },
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fullName: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            role: { type: 'string', example: 'user' },
            isEmailVerified: { type: 'boolean', example: false },
          },
          required: ['id', 'fullName', 'email', 'role', 'isEmailVerified'],
        },
        AuthUserProfile: {
          allOf: [
            { $ref: '#/components/schemas/AuthUser' },
            {
              type: 'object',
              properties: {
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              required: ['createdAt', 'updatedAt'],
            },
          ],
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            accessTokenExpiresIn: { type: 'integer', example: 900 },
            refreshTokenExpiresIn: { type: 'integer', example: 604800 },
          },
          required: [
            'accessToken',
            'refreshToken',
            'accessTokenExpiresIn',
            'refreshTokenExpiresIn',
          ],
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'Registration successful. Please verify your email.',
            },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/AuthUser' },
              },
              required: ['user'],
            },
          },
          required: ['success', 'message', 'data'],
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/AuthUserProfile' },
                tokens: { $ref: '#/components/schemas/AuthTokens' },
              },
              required: ['user', 'tokens'],
            },
          },
          required: ['success', 'message', 'data'],
        },
        RefreshResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Tokens refreshed successfully' },
            data: { $ref: '#/components/schemas/AuthTokens' },
          },
          required: ['success', 'message', 'data'],
        },
        UserProfileResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'User profile fetched successfully' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/AuthUserProfile' },
              },
              required: ['user'],
            },
          },
          required: ['success', 'message', 'data'],
        },
        Session: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            lastUsedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            expiresAt: { type: 'string', format: 'date-time' },
            revokedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdByIp: {
              type: 'string',
              nullable: true,
              example: '127.0.0.1',
            },
            userAgent: {
              type: 'string',
              nullable: true,
              example: 'Mozilla/5.0',
            },
          },
          required: ['id', 'createdAt', 'expiresAt', 'revokedAt', 'createdByIp', 'userAgent'],
        },
        SessionListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Sessions fetched successfully' },
            data: {
              type: 'object',
              properties: {
                sessions: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Session' },
                },
              },
              required: ['sessions'],
            },
          },
          required: ['success', 'message', 'data'],
        },
        AdminUserListItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fullName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', example: 'user' },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'fullName', 'email', 'role', 'isEmailVerified', 'createdAt'],
        },
        AdminUsersResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Users fetched successfully' },
            data: {
              type: 'object',
              properties: {
                users: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/AdminUserListItem' },
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 20 },
                    total: { type: 'integer', example: 120 },
                  },
                  required: ['page', 'limit', 'total'],
                },
              },
              required: ['users', 'pagination'],
            },
          },
          required: ['success', 'message', 'data'],
        },
        UpdateUserRoleResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'User role updated successfully' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    role: { type: 'string', enum: ['user', 'admin'] },
                  },
                  required: ['id', 'role'],
                },
              },
              required: ['user'],
            },
          },
          required: ['success', 'message', 'data'],
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'error'], example: 'ok' },
            service: { type: 'string', example: 'auth-api' },
            timestamp: { type: 'string', format: 'date-time' },
            database: {
              type: 'string',
              enum: ['connected', 'disconnected'],
              example: 'connected',
            },
          },
          required: ['status', 'service', 'timestamp', 'database'],
        },
      },
    },
  },
  apis: [
    path.join(process.cwd(), 'src/modules/**/*.docs.ts'),
    path.join(process.cwd(), 'dist/modules/**/*.docs.js'),
  ],
});
