# SRT-1: Health and readiness endpoints — Implementation Plan

## Context

The service currently offers no way to check whether it is alive, which blocks deployment health checking and makes load balancing unsafe. A health endpoint enables load balancers to distinguish warming instances from broken ones, and a readiness endpoint gates traffic on database connectivity.

Gaps in the current codebase:

- No `/api/health` endpoint returning structured health status, uptime, and version
- No `/api/ready` endpoint returning database connectivity status
- Existing placeholder `/health` endpoint in `src/server/routes/v1/index.js` returns plain text instead of JSON
- No service module for health checks

Built on: None

## Rules (from the spec, binding, agents must not deviate)

1. Plan file is SINGLE SOURCE OF TRUTH. Read it FIRST on every iteration.
2. Rules sections are BINDING — agents must not deviate.
3. Follow the per-issue loop defined in .claude/CLAUDE.md EXACTLY, in the order it specifies, and run EVERY quality gate it defines. You MUST use the Agent tool to invoke each agent that loop names, at the step it names them. Never perform an agent's work directly — always spawn the agent.
4. STRICT REVIEW. Sign-off means ZERO outstanding findings, but findings route by severity. SUBSTANTIVE findings from any reviewing agent (logic or behaviour bugs, security problems, missing or incorrect tests, a coverage drop, or a broken quality gate) send the issue BACK TO STEP 1 (IMPLEMENT) for the full re-implement and re-review cascade. COSMETIC findings (naming, formatting, comments, import ordering, style) MUST instead be fixed in place by the current implementing agent and confirmed by re-running the quality gates only, with NO fresh step 1 to step 4 cascade and NO re-spawn of any reviewing agent. A reviewer whose findings are all cosmetic MUST hand back the precise edits so they can be applied in place.
5. Each agent MUST commit its changes before handing off to the next agent.
6. Auto-ratchet. When actual coverage exceeds the current minimum, the reviewing agent MUST raise the threshold in the coverage configuration files identified in .claude/CLAUDE.md, but the new threshold MUST first be rounded DOWN to one decimal place, and it is only raised when that rounded value is strictly greater than the current threshold, so ordinary churn such as removing dead code cannot breach a freshly-set threshold.

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

- Issue 1: feat: Create health service module with health and readiness checks, no dependencies.
- Issue 2: feat: Implement `/api/health` and `/api/ready` endpoints with rate limit bypass, depends on Issue 1.

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

```
gh label create in-progress --color 0E8A16 --description "Issue is actively being worked on"
gh label create wiggum-done --color 1D76DB --description "Ralph Wiggum loop completed for this issue"
gh label create blocked --color D93F0B --description "Issue is blocked and needs intervention"
```

Create the feature branch from `main`.

```
git checkout main && git pull origin main
git checkout -b srt-1-health-endpoints
```

Create every GitHub issue upfront, using the full issue section from this plan as the body, copied verbatim.

```
gh issue create --title "feat: Create health service module with health and readiness checks" --body "..."
gh issue create --title "feat: Implement /api/health and /api/ready endpoints with rate limit bypass" --body "..."
```

Post the dependency list as a comment on each issue.

```
gh issue comment <ISSUE_1> --body "## Dependencies

- Issue 1: feat: Create health service module with health and readiness checks, no dependencies.
- Issue 2: feat: Implement /api/health and /api/ready endpoints with rate limit bypass, depends on Issue 1."

gh issue comment <ISSUE_2> --body "## Dependencies

- Issue 1: feat: Create health service module with health and readiness checks, no dependencies.
- Issue 2: feat: Implement /api/health and /api/ready endpoints with rate limit bypass, depends on Issue 1."
```

**Output:** `SETUP_COMPLETE`, after which the per-issue loop begins with Issue 1.

---

## Issue 1: feat: Create health service module with health and readiness checks

**Dependencies:** None  
**Branch:** srt-1-health-endpoints  
**Agent:** backend-engineer

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Server service | `src/server/services/health.service.js` | New module exporting `getHealth(startTime)` and `checkReady()` functions | `src/server/services/contact.service.js` |
| Server test | `src/server/__tests__/health.service.test.js` | Tests for health and readiness checks with Prisma mocked | Mock `db.prisma` with `vi.mock` |

### Acceptance Criteria

1. `health.service.js` exports `getHealth(startTime)` that returns `{ status: "healthy", uptime: number, version: string }` with version read from package.json
2. `health.service.js` exports `checkReady()` that returns `{ ready: true }` when a simple Prisma query succeeds
3. `checkReady()` throws an error with a descriptive message when Prisma query fails
4. Service layer tests mock `src/server/services/database.js` and verify both functions return correct shapes

### Edge Cases to Cover

1. `getHealth()` calculates uptime correctly when called at various points after startup
2. `checkReady()` succeeds when database is connected
3. `checkReady()` throws with a reason when database is unavailable (mocked Prisma error)
4. Version string matches the value in `package.json`

### Verification Commands

```
npm run lint
npm run format:check
npm run test:run
npm run build
```

---

## Issue 2: feat: Implement `/api/health` and `/api/ready` endpoints with rate limit bypass

**Dependencies:** Issue 1  
**Branch:** srt-1-health-endpoints  
**Agent:** backend-engineer

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Server entry point | `src/server/index.js` | Add server startup time tracking, mount `/api/health` and `/api/ready` routes before rate limiting middleware, remove old `/health` endpoint call from routes | Existing route mounting pattern, keep structure |
| Server route | `src/server/routes/v1/index.js` | Remove placeholder `GET /health` endpoint that returns plain text | Remove lines 13-19 |
| Server test | `src/server/__tests__/health.route.test.js` | Integration tests for both endpoints, verify status codes and response shapes, test 503 case when database unavailable | New test file following vitest pattern |

### Acceptance Criteria

1. `GET /api/health` returns 200 with JSON body `{ success: true, data: { status: "healthy", uptime: <number>, version: "<version>" }, message: "Health check successful", timestamp: "<ISO>" }`
2. `GET /api/ready` returns 200 with JSON body `{ success: true, data: { ready: true }, message: "Service is ready", timestamp: "<ISO>" }` when database is healthy
3. `GET /api/ready` returns 503 with JSON body `{ success: false, data: null, message: "Service is not ready", reason: "<error reason>", timestamp: "<ISO>" }` when database is unavailable
4. Both endpoints are not rate limited (requests pass even if more than 100 per 15 minutes)
5. Old plain-text `/health` endpoint is removed from routes

### Edge Cases to Cover

1. Health endpoint returns correct uptime after various time intervals
2. Health endpoint version matches `package.json` exactly
3. Ready endpoint succeeds when Prisma connection works
4. Ready endpoint returns 503 with reason when Prisma throws an error (database down)
5. Rate limiter does not block health and ready endpoints even with high frequency requests
6. Response envelope is consistent with `successResponse` and `errorResponse` helpers

### Verification Commands

```
npm run lint
npm run format:check
npm run test:run
npm run build
```

---

## Verification Plan

### Quality gates, all of which must pass before review

```
npm run lint
npm run format:check
npm run test:run
npm run build
```

These run without a database. No PostgreSQL instance is provisioned locally or in CI, so any server test mocks Prisma.

There is no coverage gate in this repository, because the `@vitest/coverage-v8` provider is not installed and no threshold is configured. Do not add one as part of implementing a plan.

### CI

Opening the PR triggers the `gates` job in `.github/workflows/ci.yml`, which runs the same four commands on Node 22. The feature is not complete while that job is red.

### Manual check before the PR opens

- Start the dev server with `npm run dev` and verify `curl http://localhost:3000/api/health` returns a 200 JSON response with status, uptime, and version
- Verify `curl http://localhost:3000/api/ready` returns a 200 JSON response when the database is running
- Verify `curl http://localhost:3000/api/ready` returns a 503 JSON response when the database is stopped (after killing the database connection pool)
- Use `ab -n 100 http://localhost:3000/api/health` to verify health endpoint is not rate limited even with 100 rapid requests
