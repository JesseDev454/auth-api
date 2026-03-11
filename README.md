# Auth API
## Production-ready Authentication & Authorization Service

[![CI](https://github.com/JesseDev454/auth-api/actions/workflows/ci.yml/badge.svg)](https://github.com/JesseDev454/auth-api/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/node-20%20LTS-339933?logo=node.js&logoColor=white)
![Docker Ready](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)
![Swagger](https://img.shields.io/badge/OpenAPI-Swagger-85EA2D?logo=swagger&logoColor=black)
![License](https://img.shields.io/badge/license-not%20specified-lightgrey)

Auth API is a secure authentication backend designed for reuse across multiple applications, including SaaS products, admin dashboards, protected internal tools, and service-to-service platforms. It ships with hardened token handling, RBAC, session controls, automated integration tests, Docker support, CI validation, and Swagger documentation.

## Features

### Authentication
- User registration
- Email verification
- Login and logout
- JWT access tokens
- Refresh token rotation
- Refresh token reuse detection

### Account Recovery
- Forgot password
- Reset password
- Reset-token invalidation
- Session revocation after password reset

### Authorization
- Role-based access control
- Admin-only endpoints
- User role updates

### Session Management
- Session listing
- Session revocation
- Device and client metadata tracking

### Security
- Password hashing with bcrypt
- Hashed verification, refresh, and reset tokens
- Anti-enumeration login behavior
- Replay detection for stolen refresh tokens
- Rate limiting on sensitive endpoints

### Developer Experience
- Swagger API documentation
- Automated integration tests
- Docker and Docker Compose support
- GitHub Actions CI pipeline
- Health monitoring endpoint

## Architecture

```text
Client
   |
   v
Auth API
|
|-- Authentication
|   |-- register
|   |-- login
|   `-- refresh
|
|-- Recovery
|   |-- forgot-password
|   `-- reset-password
|
|-- Authorization
|   `-- RBAC
|
`-- Sessions
    |-- listing
    `-- revocation
```

The service follows a layered modular backend architecture:

- `routes` expose HTTP endpoints and attach middleware
- `controllers` validate and shape transport-level responses
- `services` contain business rules for auth, recovery, RBAC, and sessions
- `repositories` encapsulate TypeORM data access
- `utils` provide JWT, hashing, token, logging, and response helpers

Access tokens are short-lived JWTs used for protected routes. Refresh tokens are long-lived opaque values stored only as hashes in the database. Refresh rotation revokes the old token immediately and reuse detection revokes all active sessions for the affected user if a revoked token is replayed.

More detail: [Architecture Guide](docs/architecture.md)

## Token Lifecycle

```text
Login
|
|-- Access token issued (15 minutes)
`-- Refresh token issued (7 days)

Refresh request
|
|-- Old refresh token revoked
|-- New access token issued
`-- New refresh token issued

If revoked refresh token is reused
|
`-- All active sessions revoked
```

This design improves security in three ways:

- short-lived access tokens reduce the impact of access-token leakage
- rotated refresh tokens reduce the lifetime of a stolen long-lived token
- reuse detection treats replay as a compromise signal and forces global session invalidation

## API Overview

### Authentication
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

### Verification
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`

### Password Recovery
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

### Users
- `GET /api/v1/users/me`
- `GET /api/v1/users/sessions`
- `DELETE /api/v1/users/sessions/:id`

### Admin
- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:id/role`

### Documentation and Health
- Swagger UI: `/api-docs`
- Health endpoint: `/health`

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL
- npm

### Setup
1. Clone the repository.
2. Install dependencies.

```bash
npm install
```

3. Copy the environment template.

Unix/macOS:
```bash
cp .env.example .env
```

PowerShell:
```powershell
Copy-Item .env.example .env
```

4. Update `.env` with your local database credentials and JWT secrets.
5. Run migrations and seed default roles.

```bash
npm run db:setup
```

6. Start the development server.

```bash
npm run dev
```

7. Build the compiled server when needed.

```bash
npm run build
npm start
```

## Docker Usage

Build the production image:

```bash
docker build -t auth-api .
```

Run the full stack locally:

```bash
docker-compose up --build
```

Smoke-test the containerized service:

```text
GET  http://localhost:3000/health
GET  http://localhost:3000/api-docs/
POST http://localhost:3000/api/v1/auth/login
```

Stop the stack:

```bash
docker-compose down
```

## Environment Variables

The runtime configuration is documented in `.env.example`.

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port used by the API server |
| `NODE_ENV` | Runtime mode: `development`, `test`, or `production` |
| `DATABASE_URL` | Preferred PostgreSQL connection string for hosted platforms such as Render; overrides the individual `DB_*` variables when present |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_ACCESS_SECRET` | Secret used to sign and verify JWT access tokens |
| `JWT_REFRESH_SECRET` | Reserved refresh-token secret for token lifecycle configuration and future compatibility |
| `APP_BASE_URL` | Base URL used in verification and password-reset links |
| `LOG_LEVEL` | Pino log level such as `debug`, `info`, `warn`, or `error` |

Never commit real secrets.

For Render and similar hosted platforms, prefer setting `DATABASE_URL` from the managed Postgres service instead of manually copying `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.

## Testing

Run the full automated suite with:

```bash
npm test
```

The test harness uses a separate PostgreSQL test database defined in `.env.test`, with optional local overrides via `.env.test.local`.

The current suite covers:

- registration and email verification
- login and anti-enumeration behavior
- refresh rotation and reuse detection
- password recovery and session revocation after reset
- protected routes
- RBAC and admin flows
- session listing and per-session revocation

## CI

GitHub Actions runs the following on every push and pull request to `main`:

- build
- lint
- tests

Workflow file: [.github/workflows/ci.yml](.github/workflows/ci.yml)

## Project Structure

```text
src
|-- config
|-- database
|-- entities
|-- mails
|-- middlewares
|-- modules
|   |-- admin
|   |-- auth
|   |-- health
|   `-- users
|-- repositories
|-- types
`-- utils

tests
|-- admin
|-- auth
|-- helpers
`-- sessions

docker
docs
```

## Security Design

The service is designed around explicit, defensive token handling rather than convenience shortcuts.

- Passwords are hashed with bcrypt before storage.
- Opaque tokens are stored as deterministic hashes, not raw values.
- Refresh token rotation shortens the window for token abuse.
- Reuse detection revokes all active sessions when replay is detected.
- Login avoids leaking whether an account exists or is unverified.
- Password reset consumes the reset token and revokes existing refresh tokens.
- RBAC is enforced after authentication, not mixed into token parsing.
- Rate limiting protects high-risk endpoints from brute-force and spray attempts.

## Screenshots

Placeholder documentation assets can be added later for:

- Swagger UI
- CI passing status
- Health endpoint response

## Additional Docs

- [Architecture Guide](docs/architecture.md)
- [Product Specification](docs/authentication-api-product-spec.md)
