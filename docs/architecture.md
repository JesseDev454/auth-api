# Architecture Guide

## Overview

Auth API is a layered authentication and authorization service built for reuse across multiple applications. The codebase separates transport, business logic, persistence, infrastructure, and operational concerns so features can evolve without coupling endpoint handlers directly to database or token internals.

## System Diagram

```text
Clients
|-- Web app
|-- Mobile app
|-- Admin dashboard
`-- API consumers

        |
        v
Express API
|-- Middleware
|   |-- Helmet
|   |-- CORS
|   |-- Rate limiting
|   |-- Request logging
|   |-- Authentication
|   `-- Authorization
|
|-- Modules
|   |-- auth
|   |-- users
|   |-- admin
|   `-- health
|
|-- Services
|   |-- token lifecycle
|   |-- password recovery
|   |-- RBAC
|   `-- session control
|
|-- Repositories
|   |-- users
|   |-- roles
|   |-- refresh_tokens
|   |-- email_verification_tokens
|   `-- password_reset_tokens
|
`-- PostgreSQL
```

## Layered Architecture

### Config

`src/config` centralizes environment loading, database setup, and Swagger generation. Runtime configuration is loaded once and reused everywhere else.

### Middlewares

`src/middlewares` contains cross-cutting request behavior:

- request logging
- global and targeted rate limiting
- JWT authentication
- RBAC authorization
- centralized error handling

### Modules

`src/modules` groups HTTP routes, controllers, services, and documentation by business capability:

- `auth`: registration, verification, login, refresh, logout, recovery
- `users`: profile and session management
- `admin`: RBAC-protected user administration
- `health`: service and database readiness

### Repositories

`src/repositories` isolates TypeORM queries behind explicit methods so services work with business operations instead of raw query construction.

### Utilities

`src/utils` provides shared infrastructure for:

- JWT signing and verification
- bcrypt hashing
- opaque token generation and hashing
- structured logging
- consistent API response formatting

## Token Model

### Access Tokens

- JWT format
- short-lived: 15 minutes
- minimal payload: `userId`, `role`, `tokenType`
- used only for protected API access

### Refresh Tokens

- opaque random values
- stored only as SHA-256 hashes
- long-lived: 7 days
- linked to device/session metadata
- revocable at logout, password reset, or security events

## Rotation and Reuse Detection

```text
1. User logs in
2. Access token + refresh token are issued
3. Client calls /auth/refresh
4. Server validates current refresh token
5. Server issues a new access token
6. Server issues a new refresh token
7. Old refresh token is revoked immediately

If the old revoked token appears again:
8. Server treats it as possible token theft
9. Server revokes all active refresh tokens for that user
10. User must sign in again
```

This prevents silent replay of a stolen refresh token and gives the service a clear compromise response path.

## Recovery and Session Safety

Password recovery follows a separate token lifecycle:

- forgot-password generates a reset token and stores only its hash
- reset-password validates unused and unexpired tokens
- successful reset updates the password hash
- the reset token is marked used
- all active refresh tokens for the user are revoked

This ensures a password reset also invalidates old sessions.

## RBAC Flow

```text
Request
  |
  v
authenticate middleware
  |
  v
authorize('admin')
  |
  v
admin controller/service
```

Authentication proves identity. Authorization checks permissions. The two concerns remain separate in code and in middleware ordering.

## Session Model

Each refresh token represents a session record with:

- creation timestamp
- expiry timestamp
- last-used timestamp
- revocation timestamp
- originating IP
- user agent

Users can inspect and revoke their own sessions through the users module.

## Operational Surfaces

The repository also includes production-facing support layers:

- `/api-docs` for Swagger UI
- `/health` for uptime and database connectivity checks
- Docker and Docker Compose for deployment and local stack execution
- GitHub Actions CI for build, lint, and integration tests

## Related Docs

- [README](../README.md)
- [Product Specification](authentication-api-product-spec.md)
