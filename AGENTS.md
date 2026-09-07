# AGENTS.md — AI Agent Instructions

## Overview

**simple-vite-react-express** is a production-ready full-stack starter template. It demonstrates best practices for building React + Express applications with PostgreSQL.

**Goal**: Keep this project simple, clean, and well-documented as a learning/starter template.

## Architecture

```
Client (React 19 + MUI 7) → API Layer (Express 5) → Database (PostgreSQL via Prisma 7)
```

The codebase follows a layered pattern on both sides:

- **Client**: Pages → Hooks → Services → Axios → Server API
- **Server**: Routes → Services → Prisma → PostgreSQL

## Setup

```bash
nvm use                   # Node 22
npm install               # Install dependencies
cp example.env .env       # Create env file, then edit DATABASE_URL
npm run setup             # Interactive setup wizard
npm run db:setup          # Run Prisma migrations
npm run db:seed           # Optional: seed sample data
npm run dev               # Start dev servers
```

## Coding Conventions

- **ESM only** — `import`/`export`, no `require()`
- **No TypeScript** — use JSDoc for type hints
- **Functional components** — no class components
- **Custom hooks for data** — never call axios directly from pages
- **Service layer** — all API calls go through `src/client/services/`
- **MUI for UI** — use `@mui/material` components, `sx` prop for styling
- **Express 5** — async route handlers, no callback pattern

## Testing

```bash
npm test              # Watch mode
npm run test:run      # Single run (CI)
npm run test:coverage # With coverage report
```

- Framework: Vitest 4 + React Testing Library
- Test files: `src/client/__tests__/`
- Setup file: `src/client/__tests__/setup.js`

## Linting & Formatting

```bash
npm run lint          # Check
npm run lint:fix      # Auto-fix
npm run format        # Prettier
```

- ESLint 9 flat config (`eslint.config.js`)
- Prettier config (`.prettierrc`)

## Commit Style

Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `style:`, `refactor:`, `test:`

## API Reference

### Monitoring Endpoints

The health and readiness endpoints are designed for load balancers and orchestration systems (Kubernetes, Docker Swarm, etc.) to monitor server availability and database connectivity. Both endpoints bypass the global rate limiter to ensure monitoring systems can poll frequently without being throttled.

```
GET    /health          Server health status with uptime and version
GET    /ready           Server readiness status (database connectivity)
```

#### GET /health

Returns the server health status including uptime and application version. Uses the `HealthService` from `src/server/services/health.service.js`.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 1234.56,
    "version": "2.1.0"
  },
  "message": "Success",
  "timestamp": "2026-01-18T12:00:00.000Z"
}
```

#### GET /ready

Returns the server readiness status by checking database connectivity. Returns 200 if ready, 503 if database is unavailable.

**Response (200 - Ready):**

```json
{
  "success": true,
  "data": {
    "status": "ok"
  },
  "message": "Success",
  "timestamp": "2026-01-18T12:00:00.000Z"
}
```

**Response (503 - Not Ready):**

```json
{
  "success": false,
  "data": null,
  "message": "Service not ready",
  "timestamp": "2026-01-18T12:00:00.000Z"
}
```

## Key Files

| File | Purpose |
|------|---------|
| `src/server/index.js` | Express server entry point |
| `src/client/index.jsx` | React app entry with routing |
| `prisma/schema.prisma` | Database schema |
| `prisma.config.ts` | Prisma CLI configuration |
| `vite.config.js` | Vite build configuration |
| `vitest.config.js` | Test configuration |
| `eslint.config.js` | Linting rules |
