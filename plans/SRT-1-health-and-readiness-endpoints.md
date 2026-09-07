# SRT-1: Health and readiness endpoints — Implementation Plan

## Context

The deployment pipeline currently has no way to distinguish a healthy, warming instance from a broken one. Load balancers need health and readiness signals to gate traffic safely. The API has no health check endpoint (`GET /api/health`), and no readiness probe (`GET /api/ready`) to verify database connectivity.

Gaps in the current codebase:

- No health check service to compute uptime and read package version
- Existing `/api/v1/health` endpoint is incomplete and returns plain text, not JSON
- No readiness endpoint to test database connectivity
- No mechanism to exempt health endpoints from global rate limiting

Built on: None — this is a standalone operational feature.

## Rules (from the spec, binding, agents must not deviate)

RULES (non-negotiable):
1. Plan file is SINGLE SOURCE OF TRUTH. Read it FIRST on every iteration.
2. Rules sections are BINDING — agents must not deviate.
3. Follow the per-issue loop defined in .claude/CLAUDE.md EXACTLY, in the order it specifies, and run EVERY quality gate it defines. You MUST use the Agent tool to invoke each agent that loop names, at the step it names them. Never perform an agent's work directly — always spawn the agent.
4. STRICT REVIEW. Sign-off means ZERO outstanding findings, but findings route by severity. SUBSTANTIVE findings from any reviewing agent (logic or behaviour bugs, security problems, missing or incorrect tests, a coverage drop, or a broken quality gate) send the issue BACK TO STEP 1 (IMPLEMENT) for the full re-implement and re-review cascade. COSMETIC findings (naming, formatting, comments, import ordering, style) MUST instead be fixed in place by the current implementing agent and confirmed by re-running the quality gates only, with NO fresh step 1 to step 4 cascade and NO re-spawn of any reviewing agent. A reviewer whose findings are all cosmetic MUST hand back the precise edits so they can be applied in place.
5. Each agent MUST commit its changes before handing off to the next agent.
6. Auto-ratchet. When actual coverage exceeds the current minimum, the reviewing agent MUST raise the threshold in the coverage configuration files identified in .claude/CLAUDE.md, but the new threshold MUST first be rounded DOWN to one decimal place, and it is only raised when that rounded value is strictly greater than the current threshold, so ordinary churn such as removing dead code cannot breach a freshly-set threshold.
7. State an explicit SIZE-SCALED REVIEW path in the plan's execution and review sections, so the ceremony matches each issue's size and risk rather than applying the full cascade uniformly. A LOW-RISK issue changing fewer than 80 non-test lines that adds no new API surface, no authorisation change and no persistence-boundary change runs the quality gates plus a SINGLE consolidated reviewer, not the full multi-agent implement, QA and tech-lead cascade. Any issue that adds a new endpoint or public interface, changes authorisation, or crosses a money or persistence boundary keeps the FULL CASCADE. State the threshold and both paths explicitly in the plan.
8. Keep RBAC and permission coverage PROPORTIONATE to the roles the spec actually names. Cover exactly the roles the acceptance criteria call out, plus any the existing code already enforces as an established convention of this repository, and do NOT expand coverage to every role in the system unless the spec requires it.

Feature-specific rules from spec:

- Neither endpoint is rate limited, so a health checker polling once per second is never rejected.
- The readiness endpoint tests database connectivity with a Prisma query.
- The health endpoint includes the package version read from `package.json`.

## Design Constraints

These apply to every issue in this plan. They are fixed text, copied into every plan and never paraphrased. Agents follow them so that the codebase stays consistent, and do not invent alternatives.

### Layering

- Client, pages call hooks, hooks call services, services call the shared Axios instance in `src/client/services/api.js`. A page or component never imports Axios and never contains an API URL.
- Server, routes call services, services reach Prisma through `src/server/services/database.js`. Business logic lives in `src/server/services/` and never in a route handler.

### API Conventions

- Endpoints are versioned under `/api/v1/` and registered in `src/server/routes/v1/index.js`.
- Every response body is built with `successResponse` or `errorResponse` from `src/server/utils/response.js`, giving the envelope `{ success, data, message, timestamp }`. Never hand-roll a response object, because the client service layer depends on that shape.
- HTTP verbs are used strictly. GET reads, POST creates, PUT updates, DELETE removes. A GET never has side effects.
- Ids go in the path, filters in query parameters, payloads in the body. Creation data is never passed as a query parameter.
- Resource paths follow the existing singular convention, for example `/contact` and `/contact/list`, matching `src/server/routes/v1/contact.route.js`.

### Design Deviation — Health Endpoints Outside `/api/v1/`

Health and readiness endpoints are **mounted at the root `/api/` level** (not under `/api/v1/`), at `GET /api/health` and `GET /api/ready`. This deviation is justified because:

- These are operational concerns serving load balancers and deployment tools, not API consumers.
- Load balancers need stable, version-independent URLs for health probes.
- Version-specific health checking would break during API migrations.
- Spec requirement specifies `/api/health` and `/api/ready` explicitly.

The endpoints are created in a separate route file (`src/server/routes/health.route.js`) and mounted directly on the Express app before the versioned API routes in `src/server/index.js`.

### Error Handling

- Request shape is validated by celebrate and Joi schemas in `src/server/middleware/validate.js`, attached as route middleware. Business rules are validated in the service layer. The same check is never duplicated across both layers.
- A route handler wraps its work in try and catch, returns 404 through `errorResponse` where a resource is absent, and 500 with a human-readable message where the underlying call fails.
- Errors are never swallowed silently. A catch block that cannot handle an error re-raises it.
- Client hooks expose an `error` state and surface failures through `react-toastify`, following `src/client/hooks/useContacts.js`.

### Naming

- Server files use the `<resource>.route.js` and `<resource>.service.js` suffixes already in use.
- JavaScript identifiers are `camelCase`, React components and classes are `PascalCase`.
- Prisma models are `PascalCase` singular, and their fields are `camelCase`.
- Test files mirror the source, so `components/Bar.jsx` is tested by `__tests__/components/Bar.test.jsx` and `hooks/useBar.js` by `__tests__/hooks/useBar.test.js`.

## Issue Dependencies

- Issue 1: **feat: Health and Readiness Endpoints**, no dependencies.

## Definition of Done

Every issue satisfies all of these before it moves to review.

1. **Acceptance criteria pass**, meaning every criterion below is demonstrated by a passing test rather than by working code alone.
2. **Edge cases covered**, meaning invalid input, missing resources and state conflicts each have an explicit test asserting the correct status code and message.
3. **Touch it, test it**, meaning every file the issue modified has tests covering the behaviour that changed.
4. **No database in the gates**, meaning any server test mocks the `db.prisma` surface from `src/server/services/database.js` rather than reaching PostgreSQL.
5. **Rules satisfied**, meaning the Rules section above has been re-read and each rule is addressed, with a note explaining any rule that does not apply.
6. **Design constraints followed**, with no ad-hoc alternatives to the conventions above.
7. **Quality gates pass**, meaning all four verification commands exit zero.
8. **No dead code**, meaning no commented-out blocks, no unused imports and no leftover placeholder TODOs.
9. **Migration is safe**, where one is included, meaning it was generated rather than hand-written and any new column is nullable or carries an explicit default.

---

## Phase 0: Setup (runs once before the loop starts)

Create the labels, which is idempotent so an already-created label is simply skipped.

    gh label create in-progress --color 0E8A16 --description "Issue is actively being worked on"
    gh label create wiggum-done --color 1D76DB --description "Ralph Wiggum loop completed for this issue"
    gh label create blocked --color D93F0B --description "Issue is blocked and needs intervention"

Create the feature branch from `main`.

    git checkout main && git pull origin main
    git checkout -b 1-health-readiness-endpoints

Create the GitHub issue upfront, using the full Issue 1 section from this plan as the body, copied verbatim.

    gh issue create --title "feat: Health and Readiness Endpoints" --body "<full Issue 1 section from this plan, verbatim>"

Post the dependency list from the Issue Dependencies section above as a comment on the issue, so the agent knows the execution order.

    gh issue comment [ISSUE_NUMBER] --body "## Dependencies

    No dependencies — this is the first and only issue.

    Plan: plans/SRT-1-health-and-readiness-endpoints.md"

**Output:** `SETUP_COMPLETE`, after which the per-issue loop begins with Issue 1.

---

## Issue 1: feat: Health and Readiness Endpoints

**Dependencies:** None — this is the first and only issue.  
**Branch:** `1-health-readiness-endpoints`  
**Agent:** `backend-engineer`

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Server service | `src/server/services/healthCheck.service.js` | New service with methods `getHealth()` and `getReadiness()` | `src/server/services/contact.service.js` |
| Server route | `src/server/routes/health.route.js` | New route file with `GET /health` and `GET /ready` handlers | `src/server/routes/v1/contact.route.js` |
| Server entry point | `src/server/index.js` | Import and mount health routes at root level before `/api/v1/` routes; update rate limiter to skip health endpoints | Existing mounting pattern, use `skip` option in rateLimit middleware |
| Server middleware | `src/server/middleware/security.js` | Update rate limiter configuration with `skip` function to exclude health endpoints | `express-rate-limit` skip option |
| Server test | `src/server/__tests__/health.test.js` | Tests for both `/api/health` and `/api/ready` including database failure path | Mock `db.prisma` with `vi.mock`, follow `src/client/__tests__/hooks/useContacts.test.js` pattern |

### Acceptance Criteria

1. `GET /api/health` with working server returns 200 with JSON body containing `{ success: true, data: { status: "healthy", uptime: <seconds>, version: "2.1.0" }, message: "Health check passed", timestamp: <ISO> }`
2. `GET /api/ready` with working database returns 200 with JSON body containing `{ success: true, data: { status: "ready" }, message: "Ready to accept traffic", timestamp: <ISO> }`
3. `GET /api/ready` with unavailable database returns 503 with JSON body containing `{ success: false, data: null, message: "Database unavailable", timestamp: <ISO> }`
4. Both endpoints accept and succeed with 100 requests in rapid succession (verify not rate limited)
5. Response body envelopes match the standard `{ success, data, message, timestamp }` format from `successResponse` and `errorResponse`

### Edge Cases to Cover

1. **Database unavailable** — `/api/ready` returns 503 with `success: false` and error message; `/api/health` still returns 200 and succeeds
2. **Multiple rapid requests** — Both endpoints handle polling at 1 request/second without rate limiting rejection
3. **Server startup** — `uptime` in `/api/health` reflects time since process started
4. **Response body shape** — All required fields present in success and failure responses

### Verification Commands

    npm run lint
    npm run format:check
    npm run test:run
    npm run build

### Implementation Notes

**Service Layer** (`src/server/services/healthCheck.service.js`):

The service exports two methods:
- `getHealth()` — returns object with `status: "healthy"`, `uptime: <seconds since process.uptime()>`, `version: <read from package.json>`
- `getReadiness()` — returns object with `status: "ready"` on success; throws on Prisma query failure

Read the package version using ESM `import` with `import.meta.url` or by importing from a JSON file. The current `package.json` version is `"2.1.0"`.

**Rate Limiting Exemption**:

The `express-rate-limit` middleware supports a `skip` option that accepts a function. Pass a function that returns `true` for paths matching `/api/health` and `/api/ready`, so these endpoints bypass the rate limiter. Example pattern:

```javascript
skip: (req) => req.path === '/api/health' || req.path === '/api/ready'
```

**Route Mounting**:

Mount health routes directly on the Express app in `src/server/index.js` BEFORE the line `app.use("/api/v1/", routes)`, so the root-level health endpoints are registered first and have priority.

---

## Review Path: SINGLE CONSOLIDATED REVIEWER

**Rationale:** This issue is **LOW-RISK**:
- Changes fewer than 80 non-test lines (service ~20 lines, route ~30 lines, middleware config ~5 lines, mount ~2 lines)
- Adds a new endpoint surface but is purely operational (health checks), not a user-facing API change
- Does not change authorization, authentication, or access control
- Does not cross the data persistence boundary in a breaking way (readiness check is read-only)

**Execution:** Single `backend-engineer` agent implements, runs all quality gates, commits.

**Review:** Single `tech-lead` agent validates:
- All acceptance criteria pass in tests
- Endpoints are accessible at `/api/health` and `/api/ready` (not under `/api/v1/`)
- Rate limiting exemption works (can verify by inspecting security middleware config)
- Body shapes match the spec and standard response envelope
- Code quality and architecture follow the patterns in `src/server/services/` and `src/server/routes/v1/`
- All edge cases are covered

If tech-lead approves, close the issue with `wiggum-done` label. If fixes are needed, fix in place (cosmetic) or route substantive findings back to step 1 (implement → re-test → re-review).

---

## Verification Plan

### Quality gates, all of which must pass before review

    npm run lint
    npm run format:check
    npm run test:run
    npm run build

These run without a database. No PostgreSQL instance is provisioned locally or in CI, so any server test mocks Prisma.

There is no coverage gate in this repository, because the `@vitest/coverage-v8` provider is not installed and no threshold is configured. Do not add one as part of implementing a plan.

### CI

Opening the PR triggers the `gates` job in `.github/workflows/ci.yml`, which runs the same four commands on Node 22. The feature is not complete while that job is red.

### Manual check before the PR opens

- Start a development server and confirm `curl http://localhost:8080/api/health` returns valid JSON with `status`, `uptime` (a positive number of seconds), and `version`.
- Confirm `curl http://localhost:8080/api/ready` returns 200 when the database is available.
- (Optional) Confirm `curl http://localhost:8080/api/ready` would return 503 if the database were unavailable (can be simulated by mocking or stopping the database).
- Confirm rapid polling at 1 req/sec does not trigger rate limiting on either endpoint (run `for i in {1..10}; do curl http://localhost:8080/api/health; done` and verify no 429 responses).
