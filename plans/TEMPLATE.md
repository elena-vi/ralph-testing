# [Feature Name] Implementation Plan

## Context

[Two or three sentences covering why this change is needed and what gap it fills.]

Gaps in the current codebase:

- [Gap 1, naming the actual file that is missing or incomplete]
- [Gap 2]

Built on: [any earlier tickets this depends on, and what each delivered]

## Rules (from the spec, binding, agents must not deviate)

> Copied verbatim from the spec's own rules, plus the non-negotiable
> rules injected by slack-ralph. Agents must not guess at alternatives.
> If a rule appears wrong, stop and escalate rather than working around it.

- [Rule 1]
- [Rule 2]

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

- Issue 1: [title], no dependencies.
- Issue 2: [title], depends on Issue 1.
- Issue 3: [title], depends on Issue 1, and may run alongside Issue 2.

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
    git checkout -b [issue-number]-[short-description]

Create every GitHub issue upfront, using the full issue section from this plan as the body, copied verbatim.

    gh issue create --title "[Issue 1 title]" --body "<full Issue 1 section from this plan, verbatim>"
    gh issue create --title "[Issue 2 title]" --body "<full Issue 2 section from this plan, verbatim>"

Post the dependency list from the Issue Dependencies section above as a comment on each issue, so agents know the execution order.

    gh issue comment [ISSUE_NUMBER] --body "## Dependencies

    [paste the dependency list]"

**Output:** `SETUP_COMPLETE`, after which the per-issue loop begins with Issue 1.

---

## Issue 1: [type]: [Title]

**Dependencies:** [None, or Issue X]
**Branch:** [issue-number]-[short-description]
**Agent:** [backend-engineer, frontend-engineer, or both]

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Prisma schema | `prisma/schema.prisma` | [Models, fields, types, relations] | Existing models in the same file |
| Migration | `prisma/migrations/` (generated) | [Tables, columns, indexes] | `npx prisma migrate dev --name [name]` |
| Server service | `src/server/services/[resource].service.js` | [Methods, signatures, errors raised] | `src/server/services/contact.service.js` |
| Validation | `src/server/middleware/validate.js` | [Celebrate schema added] | Existing schemas in the same file |
| Server route | `src/server/routes/v1/[resource].route.js` | [Endpoints, params, status codes] | `src/server/routes/v1/contact.route.js` |
| Route registration | `src/server/routes/v1/index.js` | [Router mounted] | Existing mounts in the same file |
| Client service | `src/client/services/[resource].js` | [Methods, JSDoc typedef] | `src/client/services/contacts.js` |
| Client hook | `src/client/hooks/use[Resource].js` | [State, fetch callback, mutations] | `src/client/hooks/useContacts.js` |
| Component | `src/client/components/[Name].jsx` | [Props, render, interactions] | `src/client/components/ConfirmationDialog.jsx` |
| Page | `src/client/pages/[Name].jsx` | [State, hook usage, layout] | `src/client/pages/Contacts.jsx` |
| Server test | `src/server/__tests__/[name].test.js` | [Cases, Prisma mocks] | Mock `db.prisma` with `vi.mock` |
| Client test | `src/client/__tests__/[components\|hooks]/[name].test.[jsx\|js]` | [Cases, service mocks] | `src/client/__tests__/hooks/useContacts.test.js` |

Delete any row that this issue does not touch. Do not leave placeholder rows in a generated plan.

### Acceptance Criteria

> Maps the spec's requirements to implementation-level assertions, with
> concrete status codes and element states.

1. [METHOD /api/v1/endpoint with {input}] gives [status] and [response body]
2. [METHOD /api/v1/endpoint with {invalid input}] gives [status] and [error message]
3. [UI, element state when condition holds]

### Edge Cases to Cover

> An explicit list, so agents do not skip them. Each one becomes a test.

1. [Input boundary, meaning empty, zero, negative or maximum length]
2. [Missing resource, meaning the not-found path]
3. [State conflict, meaning a duplicate create or an update on a deleted resource]
4. [Failure path, meaning what the user sees when the underlying call fails]

### Verification Commands

    npm run lint
    npm run format:check
    npm run test:run
    npm run build

---

## Issue N: [type]: [Title]

[Repeat the structure above for each further issue. The final issue
usually covers documentation updates alongside its own implementation.]

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

- [The primary user journey this feature delivers, walked through end to end]
- [Any state or role variation worth confirming by hand]
