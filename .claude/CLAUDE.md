# ralph-testing Project Context

## What we're building

A full-stack CRM demo application built on the `simple-vite-react-express` template. It manages contacts, tasks and projects, with a React client talking to an Express API backed by PostgreSQL through Prisma.

This repository is driven by the slack-ralph loop. Anything project-specific lives in this file rather than in slack-ralph itself.

## Stack

- **Runtime**, Node 22 as pinned in `.nvmrc`, ESM only throughout. Use `import` and `export`, never `require()`.
- **Language**, plain JavaScript. There is no TypeScript and no build-time type checking, so type hints are expressed as JSDoc comments.
- **Frontend**, React 19 with Vite 7, Material UI 7 for components and theming, React Router 7 for routing, Formik with Yup for forms, and Axios for HTTP.
- **Backend**, Express 5 with async route handlers, celebrate and Joi for request validation, Helmet for security headers, and express-rate-limit for throttling.
- **Database**, PostgreSQL accessed through Prisma 7 using the `@prisma/adapter-pg` adapter pattern.
- **Testing**, Vitest 4 with React Testing Library in a jsdom environment.
- **Tooling**, ESLint 9 flat config in `eslint.config.js`, Prettier configured by `.prettierrc`.
- **Package manager**, npm. A stray `yarn.lock` is present but unused, so always use npm and `package-lock.json`.
- **CI**, GitHub Actions, defined in `.github/workflows/ci.yml`.

## Codebase layout

Use this to orient before planning or implementing. Follow the existing patterns in each location rather than introducing new ones.

| What | Where |
| --- | --- |
| React pages and routes | `src/client/pages/` |
| Reusable components | `src/client/components/` |
| Data-fetching hooks | `src/client/hooks/` |
| Client API service layer | `src/client/services/` |
| React context providers | `src/client/context/` |
| Material UI theme | `src/client/theme/` |
| Client tests | `src/client/__tests__/` |
| Express entry point | `src/server/index.js` |
| API route definitions | `src/server/routes/v1/` |
| Server business logic | `src/server/services/` |
| Express middleware | `src/server/middleware/` |
| Server configuration | `src/server/config/` |
| Response helpers | `src/server/utils/response.js` |
| Prisma schema | `prisma/schema.prisma` |
| Migration history | `prisma/migrations/` |
| Seed data | `prisma/seed.js` |

When writing a plan, cite real files from these directories as the patterns to follow, for example "follow `src/server/services/contact.service.js`".

## Architecture

Both halves of the codebase follow a strict layered pattern, and every change must respect it.

- **Client**, pages call hooks, hooks call services, services call the shared Axios instance in `src/client/services/api.js`. A page or component must never call Axios directly, and must never contain API URLs.
- **Server**, routes call services, services call Prisma through `src/server/services/database.js`. Business logic belongs in `src/server/services/` and never in a route handler. Route handlers own HTTP concerns only, meaning request parsing, validation wiring, status codes and response shaping.

### Known deviations

These are pre-existing violations inherited from the template. Do not copy them, and do not treat them as the pattern to follow. Fixing one is welcome where an issue already touches the file.

- `src/client/pages/ContactDetail.jsx` calls Axios directly rather than going through a hook and the service layer. The correct shape is a `useContact` hook alongside `src/client/hooks/useContacts.js`, calling `contactsService.getById`.
- `src/client/pages/Tasks.jsx` has a `useEffect` with a missing `fetchTasks` dependency, which ESLint reports as a warning.
- `src/client/context/AppContext.jsx` exports a non-component alongside a component, which breaks Fast Refresh and is reported as a warning.

## Engineering Rules

- **ESM only**, `import` and `export`, never `require()`.
- **No TypeScript**, use JSDoc for type hints. Every exported function needs a JSDoc block documenting its parameters and return value, matching the density already present in `src/client/services/contacts.js`.
- **Functional components only**, no class components anywhere in the client.
- **Custom hooks for data**, never call Axios from a page or component. Follow `src/client/hooks/useContacts.js`.
- **Service layer is mandatory**, every client API call goes through `src/client/services/`, and every server database call goes through `src/server/services/`.
- **Material UI for all UI**, use `@mui/material` components with the `sx` prop for styling. Do not introduce a second styling approach or another component library.
- **Consistent API envelope**, every server response is built with `successResponse` or `errorResponse` from `src/server/utils/response.js`. Never hand-roll a response object.
- **Validation at the boundary**, request shape is validated by celebrate schemas in `src/server/middleware/validate.js`. Business rules are validated in the service layer. Do not duplicate the same check in both places.
- **No hardcoded values**, use environment variables read through `src/server/config/` or named constants.
- **No `console.log` in client code**, ESLint permits `console.warn` and `console.error` only. Server code may log freely.
- **No commented-out code** in a PR, and no leftover placeholder TODOs.
- **Max function length of roughly 20 lines**, extract a helper if a function grows beyond that.
- **Prisma migrations**, before adding a migration read `prisma/migrations/` to find the current state, then generate the new migration with `npx prisma migrate dev --name <descriptive_name>` so the timestamp ordering stays correct. Never hand-edit an existing migration that has already been committed.
- **Additive schema changes**, a new column must be nullable or carry an explicit default so existing rows are not broken.
- **Conventional commits**, prefixes are `feat`, `fix`, `chore`, `docs`, `style`, `refactor` and `test`.

## PR Standards

- Branch format is `<issue_number>-<short_description>`, for example `42-bulk-contact-import`.
- Title format is `<type>: <Description>`, using the conventional commit types listed above.
- The PR body follows `.github/pull_request_template.md`.
- Every PR must close every issue it resolves. List one `Closes #<issue_number>` per line, because GitHub only auto-closes issues written in that exact form. For a loop PR this means the parent tracking issue first, then every sub-issue from the plan file. A single `Closes` line naming only sub-issues leaves the parent stuck open.
- PRs are never merged directly to `main` by an agent. Opening the PR is where the loop stops.

## Ralph Wiggum Loop

The Ralph Wiggum loop is the iterative development workflow used to implement features from plan files in `plans/`. Each plan file defines a set of issues, and the loop drives each issue from implementation through review to an open PR.

### Starting a feature

1. Read the plan file, which is the single source of truth for the work.
2. Create all GitHub issues from the plan upfront using `gh issue create`, as described under GitHub Issue Tracking below.
3. Work the issues in the dependency order the plan states.

### Per-issue loop

**Agent invocation is mandatory.** Step 1 uses the `backend-engineer` and `frontend-engineer` agents, step 3 uses `qa-engineer` and step 4 uses `tech-lead`. Each step must invoke the named agent using the Agent tool. Do not skip an agent, and do not inline its work.

```
1. IMPLEMENT, invoke the `backend-engineer` and `frontend-engineer` agents
   Pass each: the plan file path, the GitHub issue number, and the branch name.
   Invoke only the agent whose layer the issue actually touches. A server-only
   issue does not need the frontend engineer, and the reverse holds too.
   They will:
   - Write failing tests first, then implement against them
   - Enforce the layering rules in the Architecture section above
   - Run ALL quality gates (see step 2) and confirm they pass
   - Update documentation affected by the change
   - Post progress as a comment on the GitHub issue
   - Commit their changes before handing off to the next agent

2. QUALITY GATES (the implementing agents must run ALL of these and confirm
   they pass before committing and handing off)
   a. npm run lint
   b. npm run format:check
   c. npm run test:run
   d. npm run build

   These gates must pass without a running database. See Testing Rules below.

3. REVIEW, invoke the `qa-engineer` agent
   Pass it: the plan file path, the GitHub issue number, and the branch name.
   The QA engineer will:
   - Trust the implementing agents' gate run, and re-run a gate only if QA
     touches the code or has reason to doubt the report
   - Validate every acceptance criterion against a passing test
   - Verify edge cases are covered rather than only the happy path
   - Reject weak assertions and tests coupled to implementation detail
   - Sign off, or request fixes
   If QA requests fixes, go back to step 1. Do NOT proceed to step 4 until QA
   has signed off.

4. REVIEW, invoke the `tech-lead` agent
   Pass it: the plan file path, the GitHub issue number, and the branch name.
   The Tech Lead will:
   - Review code quality, architecture, SOLID and DRY adherence
   - Verify the layering rules were respected on both client and server
   - Verify documentation was updated
   - Sign off, or request fixes
   - On sign-off, close the issue and add the `wiggum-done` label
   If the Tech Lead requests fixes, go back to step 1. Do NOT proceed until the
   Tech Lead has signed off.

5. If fixes were requested, go back to step 1.
6. If both reviewers signed off, move to the next issue. Once every issue is
   done, commit, push and open the PR.
   - The PR body MUST include one `Closes #N` line for the parent feature issue
     and one for every sub-issue from the plan file.
```

### Post-loop

Once every issue is complete and the PR is open, wait for the GitHub Actions `gates` job defined in `.github/workflows/ci.yml` to report. If CI fails, the failure goes back to the implementing agent, who fixes it, re-runs the gates locally and commits. There is no separate DevOps sign-off in this repository, because it has no infrastructure and a single CI job.

### Post-PR review, invoking the `tech-lead` agent

After CI is green, invoke the `tech-lead` agent to review the **full PR diff** rather than individual issues. Pass it the plan file path, the branch name and the PR number. The Tech Lead will review `gh pr diff <number>` for cross-cutting concerns that per-issue reviews cannot see, including naming drift between issues, code duplicated across issues, conflicting patterns, and regressions visible only at PR scope.

Any finding sends fixes back to the implementing agent, who must fix, re-run all quality gates and commit. The Tech Lead is then re-invoked for another full-PR review. This is capped at five iterations, after which the run stops and escalates rather than looping further.

### Completion criteria

A feature is complete when all of the following hold.

- Every issue in the plan is implemented with passing tests.
- All four quality gates pass locally.
- The QA engineer has signed off on every issue.
- The Tech Lead has signed off on every issue, closed it and labelled it `wiggum-done`.
- One PR is open for the whole feature, with the CI job passing.
- The Tech Lead has signed off on the full PR diff.
- Documentation affected by the change has been updated.

The loop never merges a PR. Merging is a human decision.

## Coverage Rules

**There is no coverage threshold configured in this repository, so there is nothing to ratchet.** The `npm run test:coverage` script exists but cannot run, because the `@vitest/coverage-v8` provider is not installed. Coverage is therefore not a quality gate, and no agent should attempt to raise, lower or enforce a threshold.

Were a threshold introduced later it would live in `vitest.config.js` under `test.coverage.thresholds`, and that file would become the single source of truth for the current values. Read them from there rather than from this document.

What replaces the coverage gate is the touch-it-test-it rule below.

## Testing Rules

- **Touch it, test it.** Any file an agent modifies must have tests covering the behaviour that changed. A change with no corresponding test is not complete, regardless of the absence of a coverage gate.
- **Gates must run without a database.** The CI job provisions no PostgreSQL service and the local gates assume none is running. Any test covering `src/server/` must mock Prisma rather than reach a real database. Mock the `db.prisma` surface exposed by `src/server/services/database.js` using `vi.mock`.
- **Test file locations.** Client component tests go in `src/client/__tests__/components/`, hook tests in `src/client/__tests__/hooks/`. Vitest is configured to pick up `src/**/*.{test,spec}.{js,jsx}`, so server tests may live beside the code they cover or under a `src/server/__tests__/` directory.
- **Shared setup** lives in `src/client/__tests__/setup.js`, which handles React Testing Library cleanup and the jest-dom matchers. Do not duplicate that setup per file.
- **Follow the existing patterns** in `src/client/__tests__/components/Header.test.jsx` and `src/client/__tests__/hooks/useContacts.test.js`. Further guidance is written up in `.agent/workflows/test.md`.
- **Assert on behaviour, not implementation.** Query by role and accessible name rather than by internal test IDs that only mirror component state.

## GitHub Issue Tracking

### Creating issues from plan files

Before starting the loop, read the plan file and create every issue. For each one, copy the **entire issue section from the plan file verbatim** into the issue body. Do not summarise or shorten it. This includes acceptance criteria, file change tables, edge cases and verification commands.

```
gh issue create --title "<issue title from plan>" --body "<full issue section from plan, copied verbatim>"
```

Each issue body must also end with its dependencies, meaning which issues must be complete first, and a reference to the plan file such as `Plan: plans/TA-12-bulk-contact-import.md`.

### Labels

Ensure the labels exist. These commands are idempotent, so skip any that already succeeded.

```
gh label create in-progress --color 0E8A16 --description "Issue is actively being worked on"
gh label create wiggum-done --color 1D76DB --description "Ralph Wiggum loop completed for this issue"
gh label create blocked --color D93F0B --description "Issue is blocked and needs intervention"
```

### Issue lifecycle

1. **Start**, add the `in-progress` label with `gh issue edit <number> --add-label "in-progress"`.
2. **Review updates**, post each review outcome as a comment with `gh issue comment <number> --body "[Agent Name] <summary>"`, always prefixed with the agent name so the history is attributable.
3. **Complete**, only the Tech Lead adds `wiggum-done` and closes the issue, and only after final sign-off.
4. **Blocked**, if work cannot proceed, add the `blocked` label, comment explaining precisely what is missing, and move to the next issue rather than guessing.

## Permissions

`git push origin main` and both force-push spellings are denied in `.claude/settings.json`, which guards against an accidental direct push to the default branch during an interactive session.

Note that slack-ralph runs `claude -p` with `--dangerously-skip-permissions`, so that deny list does not constrain an unattended loop run. The rule that protects `main` in that case is the PR Standards section above, which no agent may deviate from.
