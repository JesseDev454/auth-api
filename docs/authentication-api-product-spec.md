# Authentication API Product Specification

Version: 1.0  
Date: March 7, 2026  
Status: Draft baseline for implementation

## 1. Purpose

This document defines the product specification for a reusable Authentication API intended to serve multiple application types, including:

- SaaS applications
- Admin dashboards
- Payment system admin panels
- Media upload APIs with protected access
- Analytics dashboards

The system must be secure, modular, scalable, and implementation-ready for the following target stack:

- Node.js
- Express.js
- TypeORM
- PostgreSQL
- JWT authentication
- bcrypt password hashing

This document is specification-only. It does not define implementation code.

## 2. Goals

The Authentication API must:

- Provide a reusable authentication and authorization backend for multiple clients.
- Enforce secure credential and token handling.
- Support layered modular architecture with strict separation of concerns.
- Scale horizontally without in-memory session dependence.
- Support role-based access control with initial roles `user` and `admin`.
- Keep future extensions possible without requiring architectural rewrite.

## 3. Scope

### In Scope

- User registration
- Email verification
- Resend verification email
- Login
- JWT access token issuance
- Refresh token issuance and revocation
- Logout
- Forgot password
- Reset password
- Authenticated profile retrieval
- Admin user listing
- Admin role update
- Role-based authorization
- Centralized error model
- PostgreSQL-backed token and user persistence
- Soft delete support for users

### Out of Scope for V1

- Social login
- Single sign-on
- Multi-factor authentication
- API keys
- Tenant isolation
- Device fingerprinting
- WebAuthn / passkeys
- Fine-grained permissions beyond role-based access
- Self-service account deletion UI

## 4. Architectural Style

The system must use a layered modular backend architecture.

### 4.1 Layers

1. Client layer  
   Frontend applications, mobile apps, Postman collections, and admin dashboards consume the API.

2. API server layer  
   Node.js + Express application exposing HTTP endpoints under `/api/v1`.

3. Middleware layer  
   Cross-cutting concerns such as CORS, Helmet, rate limiting, JSON parsing, request logging, authentication, authorization, and error handling.

4. Route layer  
   Module-specific route definitions for `auth`, `users`, and `admin`.

5. Controller layer  
   HTTP orchestration only: validate presence of required fields, call services, and format responses.

6. Service layer  
   Business logic for authentication, token lifecycle, password reset, email verification, and role-based access rules.

7. Repository / data access layer  
   Database persistence and querying through TypeORM-backed repositories.

8. Utility layer  
   JWT utility, password hashing utility, token generator, response formatter, and mail service abstraction.

9. Database layer  
   PostgreSQL database with normalized entities and indexes optimized for authentication workloads.

### 4.2 Cross-Layer Rules

- Controllers must not contain business logic.
- Services must not depend on Express request/response objects.
- Repositories must not contain HTTP concerns.
- Utilities must remain reusable and side-effect scoped to their responsibility.
- Database access must be isolated behind repositories using TypeORM.
- Authentication and authorization must be enforced in middleware, not duplicated in controllers.

## 5. Module Specification

The system must be organized into the following core modules.

### 5.1 Auth Module

Responsibilities:

- Register users
- Verify email addresses
- Resend verification emails
- Login users
- Issue access tokens
- Issue and validate refresh tokens
- Logout users
- Handle forgot-password flow
- Handle reset-password flow

### 5.2 Users Module

Responsibilities:

- Return authenticated user profile
- Provide current user context for client applications

### 5.3 Admin Module

Responsibilities:

- List users with pagination and filters
- Update user role
- Enforce admin-only access

### 5.4 Roles Module

Responsibilities:

- Resolve roles by name or identifier
- Validate role assignments
- Provide default role lookup during registration

### 5.5 Tokens Module

Responsibilities:

- Generate secure random tokens
- Hash sensitive tokens before persistence
- Manage verification, refresh, and reset token lifecycle
- Validate token expiry, revocation, and single-use rules

### 5.6 Mail Module

Responsibilities:

- Send verification emails
- Send password reset emails
- Abstract transport implementation from service logic

## 6. Functional Requirements

### 6.1 User Registration

The system must allow user registration with:

- `fullName`
- `email`
- `password`

Requirements:

- `email` must be unique.
- `password` must never be stored in plaintext.
- Passwords must be hashed with bcrypt before persistence.
- New users must be assigned the default role `user`.
- New users must start with `is_email_verified = false`.
- A verification token must be generated after successful registration.
- The verification token must be stored as a hash in the database.
- A verification email must be sent to the user.

### 6.2 Email Verification

The system must:

- Accept a verification token from the client.
- Hash the presented token before lookup.
- Validate that the token exists, is unexpired, and is unused.
- Mark the token as used.
- Mark the corresponding user as verified.
- Reject invalid or expired tokens.

Rules:

- Verification tokens expire after 24 hours.
- Verification tokens are single-use.
- Resent verification requests must invalidate or supersede older unused verification tokens.

### 6.3 Resend Verification

The system must support resending verification emails.

Behavior:

- Accept `email`.
- Return a generic success response whether or not the email exists.
- If the user exists, is not verified, and is not soft-deleted, issue a new verification token.
- Store the new token as a hash.
- Invalidate older unused verification tokens for that user.
- Send a new verification email.

### 6.4 Login

Users must be able to login with:

- `email`
- `password`

Login rules:

- Lookup user by email.
- Reject deleted users.
- Verify bcrypt password hash.
- Reject login if email is not verified.
- Reject login if credentials are invalid.
- On success, generate an access token and refresh token.
- Update `last_login_at`.

### 6.5 Access Tokens

Access tokens must:

- Be JWTs.
- Be signed with a server-side secret.
- Include `userId`, `role`, `tokenType`, and expiration.
- Include `tokenType = access`.
- Expire after 15 minutes.

Recommended additional claims:

- `iat`
- `iss`
- `aud`

### 6.6 Refresh Tokens

Refresh tokens must:

- Be long-lived opaque tokens.
- Be generated using a cryptographically secure random generator.
- Be stored as hashes in the database.
- Be linked to a user.
- Expire after 7 days.
- Be revocable.
- Be invalid after logout.

Production policy:

- Refresh tokens should be rotated on successful refresh.
- If rotation is enabled, the refresh response returns both a new access token and a replacement refresh token.
- `last_used_at` should be updated on successful use.

### 6.7 Logout

Logout must:

- Require authentication with a valid access token.
- Accept the refresh token to revoke.
- Revoke the matching refresh token record.
- Prevent reuse of revoked refresh tokens.

### 6.8 Forgot Password

The system must allow password reset requests.

Behavior:

- Accept `email`.
- Return a generic success response regardless of whether the user exists.
- If the user exists and is eligible, generate a reset token.
- Store the reset token as a hash.
- Email the reset link to the user.

Rules:

- Reset tokens expire after 1 hour.
- Password reset tokens are single-use.
- Older unused password reset tokens must be invalidated when a new one is created.

### 6.9 Reset Password

Reset password must:

- Accept `token` and `newPassword`.
- Hash the presented token before lookup.
- Reject invalid or expired tokens.
- Hash the new password with bcrypt.
- Update the user password hash.
- Mark the reset token as used.
- Invalidate older reset tokens.
- Revoke all active refresh tokens for the user after password reset.

### 6.10 Role Based Access Control

Supported roles in V1:

- `user`
- `admin`

Rules:

- Admin-only endpoints must require role `admin`.
- Role checks must be enforced by authorization middleware.
- Role assignments must be validated against the roles table.

### 6.11 Authenticated User Profile

The system must allow an authenticated user to retrieve their own profile through `GET /users/me`.

### 6.12 Admin User Management

The system must allow admins to:

- List users with pagination and filters
- Update a user's role

## 7. Middleware Specification

### 7.1 Global Middleware

The API must apply the following global middleware:

- CORS
- Helmet
- Rate limiting
- JSON body parsing
- Request logging
- Centralized error handling

### 7.2 Authentication Middleware

Authentication middleware must:

- Parse `Authorization: Bearer <access_token>`
- Verify JWT signature and expiry
- Validate `tokenType = access`
- Attach the authenticated user context to the request
- Reject invalid or missing tokens with `401 Unauthorized`

Authenticated request context should include at minimum:

- `userId`
- `role`
- token claims required by downstream logic

### 7.3 Authorization Middleware

Authorization middleware must:

- Check the authenticated user's role
- Reject access when the role is insufficient
- Return `403 Forbidden` for authenticated but unauthorized requests

### 7.4 Rate Limiting Policy

At minimum, the following endpoints must be rate limited:

- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/resend-verification`

Baseline production policy:

- Login: 5 attempts per 15 minutes per IP, with optional email-based keying
- Forgot password: 3 attempts per 15 minutes per IP
- Resend verification: 3 attempts per hour per IP

The implementation may tighten these values through configuration without breaking contract.

## 8. Controller Specification

Controllers must:

- Validate presence of required input fields
- Delegate business logic to services
- Return standardized JSON responses
- Map service/domain errors to the centralized error handler

Controllers must not:

- Perform password hashing
- Generate JWTs
- Query the database directly
- Contain token lifecycle logic

## 9. Service Specification

Services are the main business logic layer.

### 9.1 Auth Service

Must handle:

- registration
- verification token issuance and validation
- resend verification
- login
- access token creation
- refresh token creation, validation, rotation, and revocation
- forgot-password flow
- reset-password flow

### 9.2 User Service

Must handle:

- retrieval of authenticated user profile

### 9.3 Admin Service

Must handle:

- user listing with pagination/filtering
- role updates

### 9.4 Service Transaction Rules

The following operations should be executed transactionally:

- register user + create verification token
- verify email + mark token used
- resend verification + invalidate previous token + create new token
- login + persist refresh token + update last login
- refresh token use + rotate token + revoke prior token
- reset password + mark token used + revoke active sessions
- admin role update if additional side effects are attached

## 10. Repository Specification

All repositories must interact with PostgreSQL through TypeORM.

Repository classes should wrap TypeORM entity repositories instead of exposing raw query access to controllers or services.

### 10.1 UserRepository

Responsibilities:

- create user
- find by email
- find by id
- find paginated users
- update password hash
- mark email verified
- update last login time
- update role
- exclude soft-deleted users by default where appropriate

### 10.2 RoleRepository

Responsibilities:

- find role by name
- find role by id
- list available roles if needed by admin flows

### 10.3 RefreshTokenRepository

Responsibilities:

- create refresh token record
- find valid token by hashed value
- revoke token
- revoke all active tokens for a user
- update `last_used_at`
- query active tokens by user if later required

### 10.4 EmailVerificationTokenRepository

Responsibilities:

- create token record
- find valid token by hashed value
- mark token as used
- invalidate previous unused tokens for a user

### 10.5 PasswordResetTokenRepository

Responsibilities:

- create token record
- find valid token by hashed value
- mark token as used
- invalidate previous unused tokens for a user

## 11. Utility Specification

### 11.1 JWT Utility

Must:

- sign access tokens
- verify access tokens
- enforce configured expiry and claims

### 11.2 Password Hash Utility

Must:

- hash passwords with bcrypt
- compare plaintext passwords against stored bcrypt hashes

### 11.3 Token Generator Utility

Must:

- generate cryptographically secure opaque tokens
- hash tokens before persistence lookup
- support configurable expiry windows for different token types

### 11.4 Response Formatter

Must:

- produce consistent success and error response shapes
- support paginated response metadata

### 11.5 Mail Service

Must:

- send verification emails
- send password reset emails
- encapsulate provider-specific delivery details

Mail delivery should be abstracted so SMTP, transactional email APIs, or queued workers can be introduced later without changing service contracts.

## 12. Database Specification

Database engine: PostgreSQL

Entity persistence: TypeORM

### 12.1 `roles`

Fields:

- `id` UUID primary key
- `name` varchar unique not null
- `description` varchar nullable
- `created_at` timestamp not null
- `updated_at` timestamp not null

Seed data:

- `user`
- `admin`

### 12.2 `users`

Fields:

- `id` UUID primary key
- `role_id` UUID foreign key references `roles.id`
- `full_name` varchar not null
- `email` varchar unique not null
- `password_hash` varchar not null
- `is_email_verified` boolean default false
- `last_login_at` timestamp nullable
- `created_at` timestamp not null
- `updated_at` timestamp not null
- `deleted_at` timestamp nullable

Rules:

- Password hashes only. Plaintext passwords must never be stored.
- Soft delete must be supported through `deleted_at`.
- Soft-deleted users must not be able to login or use refresh flows.
- Email uniqueness remains enforced; deleted accounts keep ownership of their email unless separately purged by an administrative process.

### 12.3 `refresh_tokens`

Fields:

- `id` UUID primary key
- `user_id` UUID foreign key references `users.id`
- `token_hash` varchar unique not null
- `expires_at` timestamp not null
- `revoked_at` timestamp nullable
- `last_used_at` timestamp nullable
- `created_by_ip` varchar nullable
- `user_agent` varchar nullable
- `created_at` timestamp not null
- `updated_at` timestamp not null

Rules:

- Raw refresh token values must never be persisted.
- Only hashed token values may be stored.
- Revoked or expired refresh tokens are invalid.

### 12.4 `email_verification_tokens`

Fields:

- `id` UUID primary key
- `user_id` UUID foreign key references `users.id`
- `token_hash` varchar unique not null
- `expires_at` timestamp not null
- `used_at` timestamp nullable
- `created_at` timestamp not null

Rules:

- Single-use only
- Stored as hashes only
- Invalid after expiry

### 12.5 `password_reset_tokens`

Fields:

- `id` UUID primary key
- `user_id` UUID foreign key references `users.id`
- `token_hash` varchar unique not null
- `expires_at` timestamp not null
- `used_at` timestamp nullable
- `created_at` timestamp not null

Rules:

- Single-use only
- Stored as hashes only
- Invalid after expiry

### 12.6 Relationships

- One role has many users.
- One user has many refresh tokens.
- One user has many email verification tokens.
- One user has many password reset tokens.

### 12.7 Indexing Requirements

The database must include indexes for performance and integrity.

Required indexes:

- unique index on `roles.name`
- unique index on `users.email`
- index on `users.role_id`
- index on `users.deleted_at`
- unique index on `refresh_tokens.token_hash`
- index on `refresh_tokens.user_id`
- composite or partial index for active refresh token lookups using `user_id`, `revoked_at`, `expires_at`
- unique index on `email_verification_tokens.token_hash`
- index on `email_verification_tokens.user_id`
- index on `email_verification_tokens.expires_at`
- unique index on `password_reset_tokens.token_hash`
- index on `password_reset_tokens.user_id`
- index on `password_reset_tokens.expires_at`

Recommended additional indexes:

- index on `users.created_at`
- index on `users.last_login_at`
- index on `roles.name` as case-insensitive if role lookup policy requires normalization

## 13. API Contract

Base path: `/api/v1`

### 13.1 Authentication Scheme

Protected routes must require:

`Authorization: Bearer <access_token>`

Admin routes require role:

`admin`

### 13.2 Standard Response Format

Success:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Something went wrong",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

Paginated responses may additionally include:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 250,
    "totalPages": 13
  }
}
```

### 13.3 Common Response Data Shapes

`User`:

```json
{
  "id": "uuid",
  "fullName": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "isEmailVerified": true,
  "lastLoginAt": "2026-03-07T10:00:00.000Z",
  "createdAt": "2026-03-01T08:00:00.000Z",
  "updatedAt": "2026-03-07T10:00:00.000Z"
}
```

`AuthTokens`:

```json
{
  "accessToken": "jwt",
  "refreshToken": "opaque_token",
  "tokenType": "Bearer",
  "accessTokenExpiresIn": 900,
  "refreshTokenExpiresIn": 604800
}
```

## 14. Endpoint Specification

### 14.1 `POST /auth/register`

Auth: Public

Request:

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "StrongPassword123!"
}
```

Behavior:

- Validate required fields.
- Normalize email.
- Ensure email is unique.
- Hash password with bcrypt.
- Create user with role `user`.
- Create verification token record.
- Send verification email.

Response:

- `201 Created`

Response data:

- created user summary
- verification pending state

### 14.2 `POST /auth/login`

Auth: Public

Request:

```json
{
  "email": "john@example.com",
  "password": "StrongPassword123!"
}
```

Behavior:

- Validate credentials.
- Reject unverified users.
- Issue access token and refresh token.
- Persist hashed refresh token.
- Update last login timestamp.

Response:

- `200 OK`

Response data:

- `user`
- `accessToken`
- `refreshToken`
- token metadata

### 14.3 `POST /auth/refresh`

Auth: Public

Request:

```json
{
  "refreshToken": "random_token"
}
```

Behavior:

- Hash presented refresh token.
- Validate token existence, expiry, and revocation status.
- Ensure associated user is not deleted.
- Issue new access token.
- If rotation is enabled, revoke prior refresh token and issue a new one.

Response:

- `200 OK`

Response data:

- new `accessToken`
- optionally new `refreshToken` when rotation is enabled

### 14.4 `POST /auth/logout`

Auth: Protected

Request:

```json
{
  "refreshToken": "random_token"
}
```

Behavior:

- Authenticate caller with access token.
- Hash refresh token.
- Revoke matching refresh token belonging to the user.
- Make subsequent reuse invalid.

Response:

- `200 OK`

### 14.5 `POST /auth/verify-email`

Auth: Public

Request:

```json
{
  "token": "verification_token"
}
```

Behavior:

- Validate token.
- Reject invalid or expired tokens.
- Mark token as used.
- Mark user email as verified.

Response:

- `200 OK`

### 14.6 `POST /auth/resend-verification`

Auth: Public

Request:

```json
{
  "email": "john@example.com"
}
```

Behavior:

- Always return generic success response.
- If eligible, create and send a new verification token.

Response:

- `200 OK`

### 14.7 `POST /auth/forgot-password`

Auth: Public

Request:

```json
{
  "email": "john@example.com"
}
```

Behavior:

- Always return generic success response.
- If eligible, create reset token, store hashed value, and send email.

Response:

- `200 OK`

### 14.8 `POST /auth/reset-password`

Auth: Public

Request:

```json
{
  "token": "reset_token",
  "newPassword": "NewStrongPassword123!"
}
```

Behavior:

- Validate token.
- Reject invalid or expired tokens.
- Hash new password.
- Mark reset token used.
- Revoke active refresh tokens for the user.

Response:

- `200 OK`

### 14.9 `GET /users/me`

Auth: Protected

Behavior:

- Return authenticated user profile.

Response:

- `200 OK`

### 14.10 `GET /admin/users`

Auth: Protected, admin only

Query parameters:

- `page`
- `limit`
- `search`
- `role`

Behavior:

- Return paginated user list.
- `search` should match `full_name` and `email`.
- `role` filters exact role name.

Default pagination:

- `page = 1`
- `limit = 20`

Maximum page size:

- `100`

Response:

- `200 OK`

### 14.11 `PATCH /admin/users/:id/role`

Auth: Protected, admin only

Request:

```json
{
  "role": "admin"
}
```

Behavior:

- Validate target user exists.
- Validate target role exists.
- Update user role.
- Return updated user object.

Response:

- `200 OK`

## 15. Validation Rules

Baseline input validation rules:

- `fullName`: required, non-empty string
- `email`: required, valid email format, normalized to lowercase
- `password`: required, non-empty string
- `newPassword`: required, non-empty string
- `role`: required for admin role update, must match an existing role
- `token`: required for verification and reset flows
- `refreshToken`: required for refresh and logout

Recommended production defaults:

- password minimum length: 8
- password maximum length: 72 bytes effective due to bcrypt
- request body size limits should be configured at middleware level

Presence validation belongs in controllers. Business rule validation belongs in services.

## 16. Error Model

The API must use consistent error codes.

Required codes:

- `VALIDATION_ERROR`
- `INVALID_CREDENTIALS`
- `EMAIL_ALREADY_EXISTS`
- `INVALID_REFRESH_TOKEN`
- `INVALID_VERIFICATION_TOKEN`
- `INVALID_PASSWORD_RESET_TOKEN`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `USER_NOT_FOUND`
- `ROLE_NOT_FOUND`

Recommended additional codes:

- `EMAIL_NOT_VERIFIED`
- `TOKEN_EXPIRED`
- `ACCOUNT_DELETED`
- `RATE_LIMIT_EXCEEDED`
- `INTERNAL_SERVER_ERROR`

Required HTTP status codes:

- `200 OK`
- `201 Created`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `409 Conflict`
- `429 Too Many Requests`
- `500 Internal Server Error`

### 16.1 Error Mapping Guidance

- Missing or malformed input: `400`
- Invalid credentials: `401`
- Invalid access token: `401`
- Insufficient role: `403`
- Unknown user: `404`
- Unknown role: `404`
- Existing email on registration: `409`
- Rate limit exceeded: `429`
- Unhandled server fault: `500`

## 17. Security Specification

### 17.1 Credential Handling

- Passwords must be hashed with bcrypt before storage.
- Plaintext passwords must never be logged.
- Password hashes must never be returned in API responses.

### 17.2 Token Handling

- Verification tokens must be stored as hashes only.
- Password reset tokens must be stored as hashes only.
- Refresh tokens must be stored as hashes only.
- Raw tokens are only exposed once at issuance to the client or via email link.

### 17.3 Session and Token Rules

- Access tokens are short-lived and stateless.
- Refresh tokens are stateful and DB-backed for revocation.
- Revoked tokens must be unusable.
- Expired tokens must be unusable.
- Reset password must revoke all active refresh tokens for the user.

### 17.4 Enumeration Resistance

The following endpoints must return generic success responses without revealing whether the account exists:

- `POST /auth/resend-verification`
- `POST /auth/forgot-password`

### 17.5 Soft Delete Enforcement

- Soft-deleted users must be excluded from login and refresh operations.
- Soft-deleted users should not receive verification or reset flows.

### 17.6 Transport Security

Production deployments must terminate TLS before or at the API boundary.

### 17.7 Secrets and Configuration

The following values must be externally configured:

- JWT signing secret
- token expiry durations
- bcrypt cost factor
- mail provider credentials
- CORS allowed origins
- database connection settings

Secrets must not be hardcoded in source control.

## 18. Non-Functional Requirements

### 18.1 Scalability

- The API must support horizontal scaling.
- Access token validation must not depend on in-memory session state.
- Refresh token validity must rely on persistent storage.

### 18.2 Observability

- Request logging must be enabled.
- Error logging must be centralized.
- Sensitive fields such as passwords and raw tokens must be redacted from logs.

### 18.3 Performance

- Admin list endpoints must be paginated.
- Token lookup paths must use indexed columns.
- Repository queries should avoid full table scans on token tables.

### 18.4 Maintainability

- Clear module boundaries must be preserved.
- Domain logic must remain in services.
- TypeORM entity and repository definitions must mirror the ER specification.

## 19. Recommended Future Enhancements

- Multi-factor authentication
- Session/device management UI
- Audit log trail for security-sensitive actions
- Role-permission matrix beyond simple role names
- Account lockout policy after repeated failed logins
- Email change flow with re-verification
- Tenant-aware authorization
- SSO / OAuth providers

## 20. Acceptance Criteria Summary

The specification is satisfied when the future implementation:

- uses Node.js, Express.js, TypeORM, PostgreSQL, JWT, and bcrypt
- follows the layered modular architecture described here
- supports all required auth, user, and admin endpoints under `/api/v1`
- persists users, roles, refresh tokens, verification tokens, and reset tokens
- stores passwords and sensitive tokens only as hashes
- enforces email verification before login
- enforces admin-only access to admin endpoints
- supports soft-deleted users
- uses standardized success and error responses
- includes rate limiting on login and recovery endpoints
- supports refresh token revocation and logout

