# SRT-2: Server-side pagination for the contacts list — Implementation Plan

## Context

Users with large address books need the contacts list to load incrementally so the first page appears quickly rather than after every record has been fetched. The current endpoint fetches every contact on mount, which works at seed-data volume but will not scale to real data.

Gaps in the current codebase:

- GET `/api/v1/contact/list` accepts no pagination parameters; the service fetches all contacts unconditionally.
- The Contacts page renders the full list without pagination controls or URL state preservation.
- The useContacts hook does not support page parameters or total count tracking.

Built on: No prior tickets.

## Rules (from the spec, binding, agents must not deviate)

- Plan file is SINGLE SOURCE OF TRUTH. Read it FIRST on every iteration.
- Rules sections are BINDING — agents must not deviate.
- Follow the per-issue loop defined in .claude/CLAUDE.md EXACTLY, in the order it specifies, and run EVERY quality gate it defines. You MUST use the Agent tool to invoke each agent that loop names, at the step it names them. Never perform an agent's work directly — always spawn the agent.
- STRICT REVIEW. Sign-off means ZERO outstanding findings, but findings route by severity. SUBSTANTIVE findings from any reviewing agent (logic or behaviour bugs, security problems, missing or incorrect tests, a coverage drop, or a broken quality gate) send the issue BACK TO STEP 1 (IMPLEMENT) for the full re-implement and re-review cascade. COSMETIC findings (naming, formatting, comments, import ordering, style) MUST instead be fixed in place by the current implementing agent and confirmed by re-running the quality gates only, with NO fresh step 1 to step 4 cascade and NO re-spawn of any reviewing agent. A reviewer whose findings are all cosmetic MUST hand back the precise edits so they can be applied in place.
- Each agent MUST commit its changes before handing off to the next agent.
- Auto-ratchet. When actual coverage exceeds the current minimum, the reviewing agent MUST raise the threshold in the coverage configuration files identified in .claude/CLAUDE.md, but the new threshold MUST first be rounded DOWN to one decimal place, and it is only raised when that rounded value is strictly greater than the current threshold, so ordinary churn such as removing dead code cannot breach a freshly-set threshold.
- State an explicit SIZE-SCALED REVIEW path in the plan's execution and review sections, so the ceremony matches each issue's size and risk rather than applying the full cascade uniformly. A LOW-RISK issue changing fewer than 80 non-test lines that adds no new API surface, no authorisation change and no persistence-boundary change runs the quality gates plus a SINGLE consolidated reviewer, not the full multi-agent implement, QA and tech-lead cascade. Any issue that adds a new endpoint or public interface, changes authorisation, or crosses a money or persistence boundary keeps the FULL CASCADE. State the threshold and both paths explicitly in the plan.
- Keep RBAC and permission coverage PROPORTIONATE to the roles the spec actually names. Cover exactly the roles the acceptance criteria call out, plus any the existing code already enforces as an established convention of this repository, and do NOT expand coverage to every role in the system unless the spec requires it.

## Design Constraints

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

- Issue 1: Backend pagination for contacts, no dependencies.
- Issue 2: Pagination UI and client-side integration, depends on Issue 1.
- Issue 3: E2E pagination tests and documentation, depends on Issue 1 and Issue 2.

## Definition of Done

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
    git checkout -b SRT-2-server-side-pagination-for-the-contacts-list

Create every GitHub issue upfront, using the full issue section from this plan as the body, copied verbatim.

    gh issue create --title "feat: Backend pagination for contacts" --body "<full Issue 1 section from this plan, verbatim>"
    gh issue create --title "feat: Pagination UI and client-side integration" --body "<full Issue 2 section from this plan, verbatim>"
    gh issue create --title "test: E2E pagination tests and documentation" --body "<full Issue 3 section from this plan, verbatim>"

Post the dependency list from the Issue Dependencies section above as a comment on each issue, so agents know the execution order.

    gh issue comment [ISSUE_NUMBER] --body "## Dependencies

    - Issue 1: Backend pagination for contacts, no dependencies.
    - Issue 2: Pagination UI and client-side integration, depends on Issue 1.
    - Issue 3: E2E pagination tests and documentation, depends on Issue 1 and Issue 2."

**Output:** `SETUP_COMPLETE`, after which the per-issue loop begins with Issue 1.

---

## Issue 1: feat: Backend pagination for contacts

**Dependencies:** None.
**Branch:** SRT-2-server-side-pagination-for-the-contacts-list
**Agent:** backend-engineer

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Validation | `src/server/middleware/validate.js` | Add celebrate schema for contact list pagination params (page, pageSize) | Existing schemas in the same file |
| Server service | `src/server/services/contact.service.js` | Add `findPaginated(page, pageSize)` method returning `{ data, total }` | `src/server/services/contact.service.js` |
| Server route | `src/server/routes/v1/contact.route.js` | Update `/list` GET to accept page/pageSize query params, validate, clamp pageSize, call service | `src/server/routes/v1/contact.route.js` |
| Server test | `src/server/__tests__/contact.service.test.js` | Tests for findPaginated: happy path, clamp, edge cases | Mock `db.prisma` with `vi.mock` |
| Server test | `src/server/__tests__/contact.route.test.js` | Tests for GET /list: query params, defaults, clamp, 400 errors, pagination response | Use `supertest` and mock `db.prisma` |

### Acceptance Criteria

1. GET `/api/v1/contact/list?page=1&pageSize=20` returns 200 with `{ data: [...20 records], total: <count> }` using defaults when params omitted.
2. GET `/api/v1/contact/list?page=1&pageSize=150` returns 200 with pageSize clamped to 100 (200 total records would return 100, not 150).
3. GET `/api/v1/contact/list?page=1` includes a `total` field in the response envelope that holds the complete count of all contacts.
4. GET `/api/v1/contact/list?page=invalid` returns 400 with error message "page must be a positive number".
5. GET `/api/v1/contact/list?page=-1` returns 400 with error message "page must be a positive number".
6. Service method `findPaginated(page, pageSize)` calculates skip correctly as `(page - 1) * pageSize` and returns both paginated records and total count.

### Edge Cases to Cover

1. **Boundary values**: page=1 with pageSize=20, pageSize=100 (max), pageSize=150 (over max, clamps to 100), page=2 returning second page.
2. **Invalid input**: page=0, page=-5, page="abc", pageSize="notanumber", pageSize=-10, omitted page/pageSize (defaults apply).
3. **Response shape**: Response includes `data` array and `total` count at the top level, wrapped in `successResponse` envelope.
4. **Empty results**: When page > (total / pageSize), returns empty array with correct total.

### Verification Commands

    npm run lint
    npm run format:check
    npm run test:run
    npm run build

### Review Path

This issue adds a new API endpoint variant (pagination parameters on an existing endpoint, but a new query interface), which is new API surface. **FULL CASCADE**: backend-engineer implements → qa-engineer reviews → tech-lead reviews and closes the issue.

---

## Issue 2: feat: Pagination UI and client-side integration

**Dependencies:** Issue 1.
**Branch:** SRT-2-server-side-pagination-for-the-contacts-list
**Agent:** frontend-engineer

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Client service | `src/client/services/contacts.js` | Update `getAll()` to accept `(page = 1, pageSize = 20)` params and pass as query string | `src/client/services/contacts.js` |
| Client hook | `src/client/hooks/useContacts.js` | Update `fetchContacts()` to accept page param, manage page state, pass to service, expose total count | `src/client/hooks/useContacts.js` |
| Component | `src/client/components/Pagination.jsx` | New pagination component using MUI Pagination, accepts page, total, pageSize, onChange | `src/client/components/ConfirmationDialog.jsx` (style pattern) |
| Page | `src/client/pages/Contacts.jsx` | Update to manage page state from URL query string, pass page to hook, render pagination control | `src/client/pages/Contacts.jsx` |
| Client test | `src/client/__tests__/hooks/useContacts.test.js` | Add tests for pagination: fetchContacts with page param, total count state, page state management | `src/client/__tests__/hooks/useContacts.test.js` |
| Client test | `src/client/__tests__/components/Pagination.test.jsx` | Test Pagination component: render, onChange handler, disabled states | `src/client/__tests__/components/Header.test.jsx` (component test pattern) |

### Acceptance Criteria

1. Contacts page reads `?page=X` from the URL on mount and uses it to fetch that page; omitted page defaults to 1.
2. Contacts page displays a Material UI Pagination control below the table that allows navigation between pages.
3. Clicking a page button in the Pagination component updates the URL query string and re-fetches that page.
4. Page is preserved across a page refresh; returning to `/contacts?page=3` loads and displays page 3.
5. Pagination control is disabled (or hidden) when there is only one page or no results.
6. The `useContacts` hook accepts a page parameter, passes it to `contactsService.getAll(page, pageSize)`, and exposes the `total` count for the Pagination component to calculate total pages.

### Edge Cases to Cover

1. **URL query string variations**: `?page=1`, `?page=2`, `?page=abc` (invalid, defaults to 1), `?page=0` (invalid, defaults to 1), `?page=-1` (invalid, defaults to 1), omitted page.
2. **Pagination control states**: 0 results (hidden), 1 page (disabled), 20+ contacts (enabled).
3. **Rapid navigation**: Clicking next page then back quickly does not cause stale data display.
4. **Service failure**: Error fetching a page surfaces via the hook's error state and the existing error toast flow.

### Verification Commands

    npm run lint
    npm run format:check
    npm run test:run
    npm run build

### Review Path

This issue adds a new UI surface (Pagination component and page state management), which counts as new API surface from the client layer. **FULL CASCADE**: frontend-engineer implements → qa-engineer reviews → tech-lead reviews and closes the issue.

---

## Issue 3: test: E2E pagination tests and documentation

**Dependencies:** Issue 1 and Issue 2.
**Branch:** SRT-2-server-side-pagination-for-the-contacts-list
**Agent:** backend-engineer (for documentation) and qa-engineer (for E2E tests)

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Integration test | `src/server/__tests__/contact.integration.test.js` | E2E tests: full roundtrip from API endpoint through pagination logic | `src/server/__tests__/health.route.test.js` (test structure) |
| Documentation | `docs/API.md` or equivalent | Update API reference with GET /api/v1/contact/list pagination params, response envelope, examples | Existing API documentation |

### Acceptance Criteria

1. E2E test verifies that creating 50+ contacts, then fetching page 1 with pageSize=20, returns 20 records and total=50+.
2. E2E test verifies that fetching page 2 with the same parameters returns the next 20 records (ids 21-40, for example).
3. Documentation update includes a code example showing `GET /api/v1/contact/list?page=2&pageSize=20` with the response shape including `{ data: [...], total: 50 }`.
4. API reference lists the `page` and `pageSize` query parameters, their defaults, constraints (pageSize max 100), and error conditions.

### Edge Cases to Cover

1. **Multi-page navigation**: Fetch page 1, 2, 3 in sequence and verify correct records and total count consistency.
2. **Boundary pages**: Fetch last page of results, verify count matches expected.
3. **Documentation accuracy**: Examples in docs match the actual API response shape and status codes.

### Verification Commands

    npm run lint
    npm run format:check
    npm run test:run
    npm run build

### Review Path

This issue covers E2E integration tests and documentation. It does not introduce new API surface or UI changes; it validates and documents existing work. **SINGLE CONSOLIDATED REVIEWER**: qa-engineer reviews the entire issue (tests and docs) in one pass and signs off.

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

1. **Backend happy path**: Start the dev server, create 5+ contacts via the form, navigate to `/contacts`, verify the list loads page 1 with 20 or fewer contacts, then click to page 2 if available and verify it shows different records.
2. **Pagination UI**: Verify the pagination control appears below the table when there is more than one page, is disabled when there is only one page, and is hidden when there are no contacts.
3. **URL preservation**: Load `/contacts?page=2`, verify page 2 is displayed, then refresh the browser and verify page 2 remains loaded.
4. **Query parameter boundaries**: Test `?page=abc`, `?page=0`, `?page=-1` in the browser URL and verify the page defaults to 1 and loads without error.
