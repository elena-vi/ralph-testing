# SRT-1: Health and readiness endpoints — Implementation Plan

## Context

The API currently provides no signal for load balancers or orchestration systems to distinguish a healthy running instance from a broken one. The existing `/health` endpoint just returns plain text ("Ok") rather than structured health data, and there is no `/ready` endpoint to gate traffic on database connectivity. This gap means deployments cannot implement health checks to control traffic during instance warmup or downtime.

Gaps in the current codebase:

- `src/server/routes/v1/index.js` has a minimal `/health` endpoint that returns plain text instead of a structured JSON response with version and uptime.
- No `/ready` endpoint exists to signal database readiness.
- Health and ready endpoints are subject to the global rate limiter, which violates AC-3 (health checkers polling once per second must never be rejected).
- No health service layer exists to encapsulate the logic of computing uptime and checking database readiness.

Built on: None, this is a foundational piece for observability.

## Rules (from the spec, binding, agents must not deviate)

> Copied verbatim from the spec's own rules, plus the non-negotiable
> rules injected by slack-ralph. Agents must not guess at alternatives.
> If a rule appears wrong, stop and escalate rather than working around it.

- AC-1: `GET /api/health` returns 200 with a JSON body containing `status`, `uptime` in seconds, and the `version` read from `package.json`.
- AC-2: `GET /api/ready` returns 200 only when a Prisma query succeeds, and 503 with a JSON body containing `reason` when it does not.
- AC-3: Neither endpoint is rate limited, so a health checker polling once per second is never rejected.
- AC-4: Both are covered by tests that assert the status code and the body shape, including the 503 branch with the database unavailable.
- Plan file is SINGLE SOURCE OF TRUTH. Read it FIRST on every iteration.
- Rules sections are BINDING — agents must not deviate.
- Follow the per-issue loop defined in .claude/CLAUDE.md EXACTLY, in the order it specifies, and run EVERY quality gate it defines. You MUST use the Agent tool to invoke each agent that loop names, at the step it names them. Never perform an agent's work directly — always spawn the agent.
- STRICT REVIEW. Sign-off means ZERO outstanding findings, but findings route by severity. SUBSTANTIVE findings from any reviewing agent (logic or behaviour bugs, security problems, missing or incorrect tests, a coverage drop, or a broken quality gate) send the issue BACK TO STEP 1 (IMPLEMENT) for the full re-implement and re-review cascade. COSMETIC findings (naming, formatting, comments, import ordering, style) MUST instead be fixed in place by the current implementing agent and confirmed by re-running the quality gates only, with NO fresh step 1 to step 4 cascade and NO re-spawn of any reviewing agent. A reviewer whose findings are all cosmetic MUST hand back the precise edits so they can be applied in place.
- Each agent MUST commit its changes before handing off to the next agent.
- Auto-ratchet. When actual coverage exceeds the current minimum, the reviewing agent MUST raise the threshold in the coverage configuration files identified in .claude/CLAUDE.md, but the new threshold MUST first be rounded DOWN to one decimal place, and it is only raised when that rounded value is strictly greater than the current threshold, so ordinary churn such as removing dead code cannot breach a freshly-set threshold.

## Design Constraints

> These apply to every issue in this plan. They are fixed text, copied
> into every plan and never paraphrased. Agents follow them so that the
> codebase stays consistent, and do not invent alternatives.

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

> A flat list. Each issue states what it depends on and what may run
> alongside it. Agents check this before starting an issue.

- Issue 1: feat: Health service with uptime and database readiness, no dependencies.
- Issue 2: feat: Health and ready endpoints with rate-limiting bypass, depends on Issue 1.
- Issue 3: test: Health and ready endpoint tests and documentation, depends on Issue 2.

## Definition of Done

> Every issue satisfies all of these before it moves to review.

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
    git checkout -b SRT-1-health-and-readiness-endpoints

Create every GitHub issue upfront, using the full issue section from this plan as the body, copied verbatim.

    gh issue create --title "feat: Health service with uptime and database readiness" --body "<full Issue 1 section from this plan, verbatim>"
    gh issue create --title "feat: Health and ready endpoints with rate-limiting bypass" --body "<full Issue 2 section from this plan, verbatim>"
    gh issue create --title "test: Health and ready endpoint tests and documentation" --body "<full Issue 3 section from this plan, verbatim>"

Post the dependency list from the Issue Dependencies section above as a comment on each issue, so agents know the execution order.

    gh issue comment [ISSUE_NUMBER] --body "## Dependencies

    - Issue 1: feat: Health service with uptime and database readiness, no dependencies.
    - Issue 2: feat: Health and ready endpoints with rate-limiting bypass, depends on Issue 1.
    - Issue 3: test: Health and ready endpoint tests and documentation, depends on Issue 2."

**Output:** `SETUP_COMPLETE`, after which the per-issue loop begins with Issue 1.

---

## Issue 1: feat: Health service with uptime and database readiness

**Dependencies:** None
**Branch:** SRT-1-health-and-readiness-endpoints
**Agent:** backend-engineer

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Server service | `src/server/services/health.service.js` | New service with `getHealth()` and `getReady()` methods | `src/server/services/contact.service.js` |

### Acceptance Criteria

1. `healthService.getHealth()` returns an object with `{ status: 'ok', uptime: <seconds>, version: <string> }` where `uptime` is seconds since the server started and `version` matches the `version` field in `package.json`.
2. `healthService.getReady()` returns an object with `{ status: 'ok' }` when a Prisma query against the database succeeds.
3. `healthService.getReady()` throws an error with a `reason` property containing a human-readable message when the database query fails.

### Edge Cases to Cover

1. Server has been running for less than one second (uptime should be a small positive number, not zero or negative).
2. Server has been running for a long time (uptime should correctly reflect days, hours, or weeks).
3. Database is unavailable or unreachable (Prisma query throws, `getReady()` catches and re-throws with a `reason` property).
4. Database connection timeout occurs (same as above—`reason` property must be set).

### Verification Commands

    npm run lint
    npm run format:check
    npm run test:run
    npm run build

---

## Issue 2: feat: Health and ready endpoints with rate-limiting bypass

**Dependencies:** Issue 1
**Branch:** SRT-1-health-and-readiness-endpoints
**Agent:** backend-engineer

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Server route | `src/server/routes/v1/health.route.js` | New routes for GET `/health` and GET `/ready`, both bypassing rate limiting | `src/server/routes/v1/contact.route.js` |
| Route registration | `src/server/routes/v1/index.js` | Register new health route and add skip condition to rate limiter middleware | Existing mounts in the same file |

### Acceptance Criteria

1. `GET /api/v1/health` returns 200 with a JSON body matching `{ success: true, data: { status: 'ok', uptime: <number>, version: <string> }, message: 'Success', timestamp: <ISO8601> }`.
2. `GET /api/v1/ready` returns 200 with a JSON body matching `{ success: true, data: { status: 'ok' }, message: 'Success', timestamp: <ISO8601> }` when the database is available.
3. `GET /api/v1/ready` returns 503 with a JSON body matching `{ success: false, data: null, message: <reason>, timestamp: <ISO8601> }` when the database is unavailable.
4. Neither endpoint increments or is counted against the rate limit (verified by sending 100+ requests in quick succession and confirming no 429 response).

### Edge Cases to Cover

1. Rate limiter would normally reject the request (send >100 requests per 15 minutes), but health/ready endpoints return 200/503, not 429.
2. Database becomes unavailable mid-operation (Prisma throws, `/ready` returns 503 with the error reason).
3. Health endpoint called immediately after server starts (uptime is close to zero).
4. Ready endpoint returns 503 when database is down.

### Verification Commands

    npm run lint
    npm run format:check
    npm run test:run
    npm run build

---

## Issue 3: test: Health and ready endpoint tests and documentation

**Dependencies:** Issue 2
**Branch:** SRT-1-health-and-readiness-endpoints
**Agent:** backend-engineer

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Server test | `src/server/__tests__/health.route.test.js` | New test file covering all acceptance criteria and edge cases, mocking Prisma | Create new file with `vi.mock` pattern for database mocking |

### Acceptance Criteria

1. Tests assert that `GET /api/v1/health` returns 200 with the expected JSON body shape including `status`, `uptime`, and `version`.
2. Tests assert that `GET /api/v1/ready` returns 200 with `{ status: 'ok' }` when Prisma succeeds.
3. Tests assert that `GET /api/v1/ready` returns 503 with a `reason` message when Prisma fails.
4. Prisma is mocked in all tests using `vi.mock('../../services/database.js', { ... })` so no live database is required.
5. Every edge case from Issues 1 and 2 has an explicit test case covering the condition and asserting the correct status code and response body.

### Edge Cases to Cover

1. Health endpoint response includes correct status code (200) and all required fields.
2. Ready endpoint response when database is healthy (200 with status 'ok').
3. Ready endpoint response when database is unavailable (503 with reason message).
4. Health endpoint `uptime` value increases over time (test at two points).
5. Version in health response matches the version in `package.json`.

### Verification Commands

    npm run lint
    npm run format:check
    npm run test:run
    npm run build

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

1. Start the server with `npm run server` and verify that:
   - `curl -i http://localhost:8080/api/v1/health` returns 200 with a JSON body containing `status`, `uptime`, and `version`.
   - `curl -i http://localhost:8080/api/v1/ready` returns 200 with `status: 'ok'` when the database is connected.
   - Running `curl http://localhost:8080/api/v1/health` 100 times in rapid succession (e.g. using `ab -n 100 -c 10`) does not return any 429 responses, confirming the rate limiter is bypassed.
2. Stop the database (or kill the DATABASE_URL environment variable) and verify that:
   - `curl -i http://localhost:8080/api/v1/ready` returns 503 with a `reason` field in the response body explaining the database is unavailable.
   - `curl -i http://localhost:8080/api/v1/health` still returns 200 (health check is independent of database state).
3. Verify the PR body includes one `Closes #<issue_number>` line for each of the three issues created in Phase 0, matching the exact format GitHub recognizes for auto-closing.
