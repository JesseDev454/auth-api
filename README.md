# Authentication API

Production-ready Authentication API built with Node.js, Express, TypeScript, TypeORM, and PostgreSQL. It provides reusable identity and access-management capabilities for SaaS platforms, admin dashboards, and other protected services.

## Features

- JWT authentication with short-lived access tokens
- Refresh token rotation with reuse detection
- Email verification flow
- Password recovery and session revocation after reset
- RBAC with admin-only endpoints
- User session listing and per-session revocation
- Automated integration tests with Jest and Supertest
- Swagger/OpenAPI documentation
- Docker and GitHub Actions CI support

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure your environment by copying `.env.example` to `.env`.

   ```bash
   cp .env.example .env
   ```

3. Run database migrations and seed roles:

   ```bash
   npm run db:setup
   ```

4. Start the API in development mode:

   ```bash
   npm run dev
   ```

5. Build and run the compiled server if needed:

   ```bash
   npm run build
   npm start
   ```

## Running Tests

The Jest suite uses a separate PostgreSQL test database defined in `.env.test`. You can override local test credentials with `.env.test.local` if needed.

```bash
npm test
```

## Docker Setup

Build and run the API with PostgreSQL using Docker Compose:

```bash
docker-compose up --build
```

The compose setup runs migrations and seeds the default roles before starting the API container.

## API Documentation

Swagger UI is available at:

```text
/api-docs
```

When running locally, that is typically:

```text
http://localhost:3000/api-docs
```

## Health Checks

The production health endpoint is:

```text
GET /health
```

It returns API status and database connectivity for container platforms and monitoring tools.

## Environment Variables

The project uses the following environment variables:

- `PORT`: HTTP port for the API server
- `NODE_ENV`: runtime environment (`development`, `test`, `production`)
- `DB_HOST`: PostgreSQL hostname
- `DB_PORT`: PostgreSQL port
- `DB_NAME`: PostgreSQL database name
- `DB_USER`: PostgreSQL username
- `DB_PASSWORD`: PostgreSQL password
- `JWT_ACCESS_SECRET`: secret used to sign access tokens
- `JWT_REFRESH_SECRET`: configured refresh-token secret reserved for refresh-token security workflows and future compatibility
- `APP_BASE_URL`: base URL used to build verification and password-reset links
- `LOG_LEVEL`: Pino log level (`silent`, `error`, `warn`, `info`, `debug`)

Use `.env.example` as the starting point. Do not commit real secrets.

## Deployment Notes

- `Dockerfile` builds the TypeScript application and runs `dist/server.js`
- `docker-compose.yml` provisions PostgreSQL and the Auth API for local deployment testing
- `.github/workflows/ci.yml` runs build, lint, and tests on pushes and pull requests
- `/api-docs` exposes the generated OpenAPI UI
- `/health` provides service and database readiness information
