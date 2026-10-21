# SRT-2: Server-side pagination for the contacts list — Implementation Plan

## Context

The contacts list currently fetches and renders every contact on mount, which is acceptable at seed-data volume but will not scale with real data. This feature introduces server-side pagination with a standard page/pageSize query parameter interface, allowing the client to load data in manageable chunks while the server enforces sensible defaults and upper bounds.

Gaps in the current codebase:

- The contacts endpoint does not accept pagination parameters (`page`, `pageSize`)
- The response does not include a total count needed for client-side pagination controls
- The client hook and page have no pagination state or UI controls
- Validation schemas do not constrain pagination parameters

Built on: none

## Rules (from the spec, binding, agents must not deviate)

RULES (non-negotiable):
1. Plan file is SINGLE SOURCE OF TRUTH. Read it FIRST on every iteration.
2. Rules sections are BINDING — agents must not deviate.
3. Follow the per-issue loop defined in .claude/CLAUDE.md EXACTLY, in the order it specifies, and run EVERY quality gate it defines. You MUST use the Agent tool to invoke each agent that loop names, at the step it names them. Never perform an agent's work directly — always spawn the agent.
4. STRICT REVIEW. Sign-off means ZERO outstanding findings, but findings route by severity. SUBSTANTIVE findings from any reviewing agent (logic or behaviour bugs, security problems, missing or incorrect tests, a coverage drop, or a broken quality gate) send the issue BACK TO STEP 1 (IMPLEMENT) for the full re-implement and re-review cascade. COSMETIC findings (naming, formatting, comments, import ordering, style) MUST instead be fixed in place by the current implementing agent and confirmed by re-running the quality gates only, with NO fresh step 1 to step 4 cascade and NO re-spawn of any reviewing agent. A reviewer whose findings are all cosmetic MUST hand back the precise edits so they can be applied in place.
5. Each agent MUST commit its changes before handing off to the next agent.
6. Auto-ratchet. When actual coverage exceeds the current minimum, the reviewing agent MUST raise the threshold in the coverage configuration files identified in .claude/CLAUDE.md, but the new threshold MUST first be rounded DOWN to one decimal place, and it is only raised when that rounded value is strictly greater than the current threshold, so ordinary churn such as removing dead code cannot breach a freshly-set threshold.
7. State an explicit SIZE-SCALED REVIEW path in the plan's execution and review sections, so the ceremony matches each issue's size and risk rather than applying the full cascade uniformly. A LOW-RISK issue changing fewer than 80 non-test lines that adds no new API surface, no authorisation change and no persistence-boundary change runs the quality gates plus a SINGLE consolidated reviewer, not the full multi-agent implement, QA and tech-lead cascade. Any issue that adds a new endpoint or public interface, changes authorisation, or crosses a money or persistence boundary keeps the FULL CASCADE. State the threshold and both paths explicitly in the plan.

- AC-1: `GET /api/v1/contact/list` accepts `page` and `pageSize` query parameters, defaulting to page 1 and a page size of 20.
- AC-2: `pageSize` is capped at 100. A larger value is clamped rather than rejected.
- AC-3: The response carries both the page of records and a `total` count, so the client can render the control without a second request.
- AC-4: A non-numeric or negative `page` returns 400 with a message naming the offending parameter.
- AC-5: The React contacts view renders a pagination control and preserves the current page across a refresh via the URL query string.
- AC-6: Tests cover the clamp, the 400 branch, and the client hook requesting the correct page.

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

- Issue 1: feat: Server-side pagination for contacts endpoint, no dependencies.
- Issue 2: feat: Client-side pagination controls and state management, depends on Issue 1.

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
    git checkout -b 1-server-side-pagination-for-contacts

Create every GitHub issue upfront, using the full issue section from this plan as the body, copied verbatim.

    gh issue create --title "Issue 1: feat: Server-side pagination for contacts endpoint" --body "<full Issue 1 section from this plan, verbatim>"
    gh issue create --title "Issue 2: feat: Client-side pagination controls and state management" --body "<full Issue 2 section from this plan, verbatim>"

Post the dependency list from the Issue Dependencies section above as a comment on each issue, so agents know the execution order.

    gh issue comment 1 --body "## Dependencies

    - Issue 1: feat: Server-side pagination for contacts endpoint, no dependencies.
    - Issue 2: feat: Client-side pagination controls and state management, depends on Issue 1."

    gh issue comment 2 --body "## Dependencies

    - Issue 1: feat: Server-side pagination for contacts endpoint, no dependencies.
    - Issue 2: feat: Client-side pagination controls and state management, depends on Issue 1."

**Output:** `SETUP_COMPLETE`, after which the per-issue loop begins with Issue 1.

---

## Issue 1: feat: Server-side pagination for contacts endpoint

**Dependencies:** None
**Branch:** 1-server-side-pagination-for-contacts
**Agent:** backend-engineer
**Review Path:** FULL CASCADE (new endpoint, crosses persistence boundary)

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Server service | `src/server/services/contact.service.js` | Add `findAllPaginated(page, pageSize)` method that returns `{ data: Contact[], total: number }` | `src/server/services/contact.service.js` existing methods |
| Validation | `src/server/middleware/validate.js` | Add pagination query schema validation for `page` and `pageSize` parameters | Existing `contactValidation` schemas in the same file |
| Server route | `src/server/routes/v1/contact.route.js` | Add pagination query parameter parsing and validation to the GET /list route; return paginated response with total count | Existing `router.get("/list")` in the same file |
| Server test | `src/server/__tests__/contact.service.test.js` | Test `findAllPaginated` with valid params, boundary conditions, clamping, and total count calculation | Mock `db.prisma` with `vi.mock` |

### Acceptance Criteria

1. `GET /api/v1/contact/list` with default query params gives 200 and `{ success: true, data: { records: [...], total: N }, message: null, timestamp }` with 20 records and correct total.
2. `GET /api/v1/contact/list?page=2&pageSize=10` gives 200 with second page of 10 records and correct total count.
3. `GET /api/v1/contact/list?pageSize=150` gives 200 with `pageSize` clamped to 100, first 100 records, and correct total.
4. `GET /api/v1/contact/list?page=abc` gives 400 with error message "Invalid page parameter".
5. `GET /api/v1/contact/list?page=-1` gives 400 with error message "Invalid page parameter".
6. `GET /api/v1/contact/list?pageSize=-10` gives 400 with error message "Invalid pageSize parameter".
7. Service method `findAllPaginated(1, 20)` returns object with `records` array and `total` count, tested via route.

### Edge Cases to Cover

1. **Boundary — page 0 or negative**, should return 400 with descriptive message naming the invalid parameter.
2. **Boundary — pageSize > 100**, should be clamped to 100 silently rather than returning an error.
3. **Boundary — non-numeric page/pageSize**, should return 400 with descriptive message naming the parameter.
4. **Correctness — total count**, should reflect the total number of contacts in the database regardless of page size.
5. **Empty result set**, page beyond the available data should return 200 with empty records array and correct total.
6. **Edge of bounds**, pageSize exactly 100 should work without clamping; pageSize 99 should work; pageSize 101 should clamp.

### Verification Commands

    npm run lint
    npm run format:check
    npm run test:run
    npm run build

---

## Issue 2: feat: Client-side pagination controls and state management

**Dependencies:** Issue 1
**Branch:** 1-server-side-pagination-for-contacts
**Agent:** frontend-engineer
**Review Path:** FULL CASCADE (modifies public hook interface, changes URL/router contract)

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Client service | `src/client/services/contacts.js` | Update `getAll()` to `getAll(page, pageSize)` and pass query parameters to API; add JSDoc for the new signature | `src/client/services/contacts.js` existing method signatures |
| Client hook | `src/client/hooks/useContacts.js` | Add `currentPage` and `pageSize` state; add `total` to return object; update `fetchContacts` to accept and use pagination params; preserve page via URL query string using `useSearchParams` from React Router | `src/client/hooks/useContacts.js` existing patterns |
| Page | `src/client/pages/Contacts.jsx` | Import `useSearchParams` from React Router; read page from URL on mount; render Material UI `Pagination` component; handle page change by updating URL and re-fetching | `src/client/pages/Contacts.jsx` existing page structure |
| Client hook test | `src/client/__tests__/hooks/useContacts.test.js` | Test hook with pagination state, verify `fetchContacts` is called with correct params, test page changes, verify total count is set | Existing test patterns in the same file |
| Component test | `src/client/__tests__/components/Contacts.test.jsx` | Test pagination control renders with correct page count, test page change triggers fetch with correct params | Following `src/client/__tests__/hooks/useContacts.test.js` pattern |

### Acceptance Criteria

1. Hook `useContacts()` returns object containing `{ contacts, isLoading, error, refresh, createContact, updateContact, deleteContact, currentPage, pageSize, total, goToPage }`.
2. Service method `contactsService.getAll(page, pageSize)` is called with correct query parameters and parsed response includes total count.
3. When user changes page via pagination control, URL query string updates to `?page=N` and contacts for that page are fetched.
4. Pagination control displays correct number of pages calculated as `Math.ceil(total / pageSize)`.
5. Page persists across browser refresh via URL query string.
6. On mount, the hook reads page from URL query string, defaulting to page 1 if not present.
7. Hook test verifies `getAll` is called with correct `(page, pageSize)` parameters.

### Edge Cases to Cover

1. **Navigation — invalid page in URL**, e.g., `?page=abc` or `?page=-1`, should default to page 1 and ignore the invalid value.
2. **Navigation — page beyond available data**, e.g., `?page=999` when only 5 pages exist, should load page 1 and render pagination showing the correct max page.
3. **State sync — createContact during pagination**, adding a contact should refresh the current page (not jump to page 1) and update total count.
4. **State sync — deleteContact during pagination**, deleting a contact on the current page should refresh that page; if the page becomes empty (e.g., deleting the last contact on page 5), move to the previous valid page.
5. **Correctness — pagination control**, no pagination control should render if total count is 0 or results fit on one page (total <= pageSize).

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

- Load the contacts page with seed data; verify the pagination control shows the correct number of pages.
- Click to page 2; verify the URL updates to `?page=2` and different contacts load.
- Refresh the browser on page 2; verify the page persists and the same contacts are visible.
- Create a new contact; verify the page stays on the same page and the total count increments.
- Delete a contact from page 2; verify the page refreshes and the total count decrements.
- Attempt to navigate to a page beyond the maximum (e.g., `?page=1000`); verify it gracefully loads page 1 instead.
