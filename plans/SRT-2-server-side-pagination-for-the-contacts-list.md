# SRT-2: Server-side pagination for the contacts list — Implementation Plan

## Context

The contacts list currently fetches every contact on mount, which is acceptable at seed-data volume but will not scale to a real-world address book. Users with large contact lists will experience slow load times as every record is fetched and rendered. Pagination allows the first page to load immediately, deferring the fetch of subsequent pages until the user requests them.

Gaps in the current codebase:

- `src/server/services/contact.service.js` has no pagination logic; `findAll()` returns all records unconditionally
- `src/server/routes/v1/contact.route.js` does not accept `page` or `pageSize` query parameters
- `src/client/hooks/useContacts.js` does not track the current page or pass it to the service
- `src/client/pages/Contacts.jsx` has no pagination control and does not preserve page across refresh via the URL

Built on: none; this is a standalone feature.

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

- Issue 1: feat: Server-side pagination for GET /api/v1/contact/list, no dependencies.
- Issue 2: feat: Client-side pagination UI and integration, depends on Issue 1.

---

## Phase 0: Setup (runs once before the loop starts)

Create the labels, which is idempotent so an already-created label is simply skipped.

    gh label create in-progress --color 0E8A16 --description "Issue is actively being worked on"
    gh label create wiggum-done --color 1D76DB --description "Ralph Wiggum loop completed for this issue"
    gh label create blocked --color D93F0B --description "Issue is blocked and needs intervention"

Create the feature branch from `main`.

    git checkout main && git pull origin main
    git checkout -b [issue-number]-server-side-pagination

Create every GitHub issue upfront, using the full issue section from this plan as the body, copied verbatim.

    gh issue create --title "Issue 1 title" --body "<full Issue 1 section from this plan, verbatim>"
    gh issue create --title "Issue 2 title" --body "<full Issue 2 section from this plan, verbatim>"

Post the dependency list from the Issue Dependencies section above as a comment on each issue, so agents know the execution order.

    gh issue comment [ISSUE_NUMBER] --body "## Dependencies

    - Issue 1: feat: Server-side pagination for GET /api/v1/contact/list, no dependencies.
    - Issue 2: feat: Client-side pagination UI and integration, depends on Issue 1."

**Output:** `SETUP_COMPLETE`, after which the per-issue loop begins with Issue 1.

---

## Issue 1: feat: Server-side pagination for GET /api/v1/contact/list

**Dependencies:** None
**Branch:** [issue-number]-server-side-pagination
**Agent:** backend-engineer

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Validation | `src/server/middleware/validate.js` | Add celebrate schema for query params: `page` (positive integer, default 1) and `pageSize` (positive integer, capped at 100, default 20) | Existing schemas in `contactValidation` |
| Server service | `src/server/services/contact.service.js` | Add `findAllPaginated(page, pageSize)` method that returns `{ data: contacts, total: count }` | Follow the class-based service pattern in `contact.service.js` |
| Server route | `src/server/routes/v1/contact.route.js` | Update GET `/list` route handler to parse and validate `page` and `pageSize` query params, call `contactService.findAllPaginated()`, return response with data and total count | Existing route pattern in same file |
| Server test | `src/server/__tests__/contact.service.test.js` | Test `findAllPaginated()` method with various page/pageSize combinations, test clamping, test that Prisma is called with correct skip/take | Mock `db.prisma` with `vi.mock('../../services/database.js')` |
| Server test | `src/server/__tests__/contact.route.test.js` | Test GET `/list` with valid and invalid query params, test 400 response for non-numeric page, test default values, test response structure | Mock `db.prisma` via mocked service |

### Acceptance Criteria

1. [GET /api/v1/contact/list with `page=1&pageSize=20`] returns 200 with response `{ success: true, data: { records: [...contacts], total: count }, ... }`
2. [GET /api/v1/contact/list with no params] returns 200 with page 1, pageSize 20, and all matching records
3. [GET /api/v1/contact/list with `pageSize=150`] returns 200 with pageSize clamped to 100 (not rejected)
4. [GET /api/v1/contact/list with `page=abc`] returns 400 with error message naming the `page` parameter
5. [GET /api/v1/contact/list with `page=-1`] returns 400 with error message naming the `page` parameter
6. [GET /api/v1/contact/list with `pageSize=0`] returns 400 with error message naming the `pageSize` parameter
7. [Service method `findAllPaginated(1, 20)` with 55 contacts in database] returns `{ data: first 20 contacts, total: 55 }`

### Edge Cases to Cover

1. **Boundary values**: page=0 (should be invalid), page=1 (first page), pageSize=1 (minimum), pageSize=100 (maximum after clamp), pageSize=101 (should clamp to 100)
2. **Invalid input**: non-numeric page/pageSize, negative values, floating-point values that are not integers
3. **Empty result set**: Database has no contacts, should return `{ data: [], total: 0 }`
4. **Large dataset**: Database has 10,000 contacts; requesting page 500 with pageSize 20 should work
5. **Query parameter parsing**: Both lowercase (`page`, `pageSize`) are accepted; extras ignored

### Verification Commands

    npm run lint
    npm run format:check
    npm run test:run
    npm run build

---

## Issue 2: feat: Client-side pagination UI and integration

**Dependencies:** Issue 1
**Branch:** [issue-number]-server-side-pagination
**Agent:** frontend-engineer

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Client service | `src/client/services/contacts.js` | Add `getPaginated(page, pageSize)` method that calls `api.get('/contact/list', { params: { page, pageSize } })` | Existing methods in `contactsService` |
| Client hook | `src/client/hooks/useContacts.js` | Modify hook to accept and track `page` state, update `fetchContacts` to call `contactsService.getPaginated(page, pageSize)`, store `total` count and `pageSize` in state | Follow state management pattern in same file |
| React component | `src/client/components/PaginationControl.jsx` | Create new component that receives `page`, `pageSize`, `total`, and callbacks for page/pageSize changes; render Material-UI `Pagination` component | Follow pattern in `src/client/components/ConfirmationDialog.jsx` |
| React page | `src/client/pages/Contacts.jsx` | Update page to extract `page` from URL query string on mount, pass to hook, render `PaginationControl`, update URL when page/pageSize changes via query string | Follow page patterns in same file |
| Client test | `src/client/__tests__/hooks/useContacts.test.js` | Add test that hook requests correct page from service, test state updates on page change, test total count is stored | Follow mocking pattern in existing tests |
| Client test | `src/client/__tests__/components/PaginationControl.test.jsx` | Test component renders correct page number, test page change callbacks, test disabled state at boundaries | Follow component test pattern in `src/client/__tests__/components/` |

### Acceptance Criteria

1. [useContacts hook with initial page=2] calls `contactsService.getPaginated(2, 20)` on mount
2. [Contacts page loaded with URL `?page=3`] renders page 3 and preserves `page=3` in URL when page is changed
3. [PaginationControl component with total=100, pageSize=20] renders correct number of pages (5), shows current page, disables prev on page 1 and next on page 5
4. [User clicks next on page 2 of 5] triggers `onPageChange(3)` callback and URL updates to `?page=3`
5. [Contacts page refreshed with `?page=2` in URL] loads and displays page 2 without changing page
6. [GET request with pageSize > 100] server clamps it, client receives correct total for correct page count

### Edge Cases to Cover

1. **URL without query string**: Page defaults to 1
2. **Invalid URL query**: `?page=abc` falls back to page 1 without error
3. **URL page exceeds total pages**: Page 999 with only 50 total records; component handles gracefully (either clamps or shows empty)
4. **Rapid pagination**: User clicks through pages quickly; requests are queued/debounced correctly
5. **Refresh at arbitrary page**: Navigating directly to `?page=10` and refreshing maintains page 10

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

- Load the Contacts page and verify the first page (20 contacts) loads and displays correctly
- Verify pagination controls appear at the bottom; pagination shows 5 pages for 100 seed contacts with pageSize 20
- Click next and verify the URL updates to `?page=2`, the page number increments, and new contacts display
- Click on page 4 and verify the URL updates to `?page=4` and correct contacts display
- Refresh the page while on page 3 (`?page=3`) and verify page 3 reloads without navigation change
- Verify the previous button is disabled on page 1 and the next button is disabled on the last page
- Open the network tab and verify only one GET request is made to `/api/v1/contact/list?page=X&pageSize=20` per page change
