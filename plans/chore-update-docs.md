# chore-update-docs: update docs — Implementation Plan

## Context

The SRT-1 health and readiness endpoints feature has been implemented with comprehensive updates to the README.md API Reference section. However, the AGENTS.md, GEMINI.md, and CHANGELOG.md files remain outdated and do not reflect the health and ready endpoints or recent architectural changes. This gap means developers onboarding via AGENTS.md or GEMINI.md won't discover these monitoring endpoints, and the CHANGELOG.md is missing the documented changes that drove the recent work.

Gaps in the current codebase:

- `AGENTS.md` does not mention the health and ready endpoints or the new health service layer introduced by SRT-1.
- `GEMINI.md` does not mention the health and ready endpoints, the rate limiter bypass pattern, or monitoring best practices.
- `CHANGELOG.md` has not been updated to document SRT-1 changes (health service, health and ready endpoints, rate limiter configuration).

Built on: SRT-1 (Health and readiness endpoints feature, which delivered health service, health/ready routes, and API documentation in README.md).

## Rules (from the spec, binding, agents must not deviate)

> Copied verbatim from the spec's own rules, plus the non-negotiable
> rules injected by slack-ralph. Agents must not guess at alternatives.
> If a rule appears wrong, stop and escalate rather than working around it.

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

### Documentation Conventions

- Documentation files (`*.md`) use Markdown format with clear section headers.
- API reference documentation uses the structure already established in `README.md`.
- Changelog follows [Keep a Changelog](https://keepachangelog.com/) format with sections for Added, Changed, Fixed, Removed.
- Agent instruction files maintain consistency in structure and terminology across `AGENTS.md` and `GEMINI.md`.
- Cross-references between documentation files use file names and section headers.

### Naming

- JavaScript identifiers are `camelCase`, React components and classes are `PascalCase`.
- Endpoint paths use leading `/api/v1/` prefix in documentation.
- File names in documentation paths use forward slashes (`src/server/services/health.service.js`).

## Issue Dependencies

> A flat list. Each issue states what it depends on and what may run
> alongside it. Agents check this before starting an issue.

- Issue 1: docs: Update AGENTS.md, GEMINI.md, and CHANGELOG.md for SRT-1 health endpoints, no dependencies.

## Definition of Done

> Every issue satisfies all of these before it moves to review.

1. **Acceptance criteria pass**, meaning every criterion below is demonstrated by reading the updated files.
2. **No dead code**, meaning no commented-out blocks, no unused content and no leftover placeholder sections.
3. **Consistency verified**, meaning documentation across all files uses consistent terminology and formatting.
4. **Quality gates pass**, meaning `npm run lint` and `npm run format:check` exit zero.
5. **Links valid**, meaning all cross-references in the documentation files point to real files and sections.

---

## Phase 0: Setup (runs once before the loop starts)

Create the labels, which is idempotent so an already-created label is simply skipped.

    gh label create in-progress --color 0E8A16 --description "Issue is actively being worked on"
    gh label create wiggum-done --color 1D76DB --description "Ralph Wiggum loop completed for this issue"
    gh label create blocked --color D93F0B --description "Issue is blocked and needs intervention"

Create the feature branch from `main`.

    git checkout main && git pull origin main
    git checkout -b 999-update-docs

Create every GitHub issue upfront, using the full issue section from this plan as the body, copied verbatim.

    gh issue create --title "docs: Update AGENTS.md, GEMINI.md, and CHANGELOG.md for SRT-1 health endpoints" --body "<full Issue 1 section from this plan, verbatim>"

Post the dependency list from the Issue Dependencies section above as a comment on the issue, so agents know the execution order.

    gh issue comment [ISSUE_NUMBER] --body "## Dependencies

    - Issue 1: docs: Update AGENTS.md, GEMINI.md, and CHANGELOG.md for SRT-1 health endpoints, no dependencies."

**Output:** `SETUP_COMPLETE`, after which the per-issue loop begins with Issue 1.

---

## Issue 1: docs: Update AGENTS.md, GEMINI.md, and CHANGELOG.md for SRT-1 health endpoints

**Dependencies:** None
**Branch:** 999-update-docs
**Agent:** backend-engineer

### File Changes

| Layer | File | Change | Pattern to follow |
| --- | --- | --- | --- |
| Documentation | `AGENTS.md` | Add health and ready endpoints to API overview and commands sections | Existing API reference section in `README.md` (lines 265-330) |
| Documentation | `GEMINI.md` | Add health and ready endpoints to commands and conventions sections | Existing API reference section in `README.md` (lines 265-330) |
| Documentation | `CHANGELOG.md` | Add SRT-1 feature section documenting health service, endpoints, and rate limiter bypass | Existing entry format in `CHANGELOG.md` for version 2.1.0 |

### Acceptance Criteria

1. `AGENTS.md` includes a mention of the health and ready endpoints in a dedicated subsection under "API Reference" or "Key Features", matching the structure and terminology used in `README.md` lines 265-272.
2. `GEMINI.md` includes health and ready endpoints in the "Commands" or "When Modifying Code" section, with a note that they bypass the global rate limiter.
3. `CHANGELOG.md` includes a new version entry (or updates the latest version entry if not yet released) documenting:
   - Health service layer (`src/server/services/health.service.js`) created
   - Health endpoint (`GET /api/v1/health`) returns structured JSON with status, uptime, and version
   - Ready endpoint (`GET /api/v1/ready`) returns 200 when database is available, 503 otherwise
   - Rate limiter bypass for health and ready endpoints
4. All three files are consistent in terminology:
   - Endpoint paths use `/api/v1/health` and `/api/v1/ready`
   - Status code references (200, 503) match the README documentation
   - Health service file path is `src/server/services/health.service.js`
5. `npm run lint` passes without warnings or errors related to the updated documentation files.
6. `npm run format:check` passes without formatting changes needed for the updated documentation files.

### Edge Cases to Cover

1. Documentation cross-references are correct (file paths and section numbers) and do not refer to non-existent files.
2. Markdown formatting is consistent with existing files (link syntax, code block formatting, list indentation).
3. Breaking change note in README is acknowledged in CHANGELOG under "Changed" or "Breaking Changes".
4. Health service naming convention (`health.service.js`) is consistent across all documentation.
5. Both endpoints are clearly marked as not subject to rate limiting in all three files.

### Verification Commands

    npm run lint
    npm run format:check
    npm run test:run
    npm run build

---

## Size-Scaled Review Path

This is a **LOW-RISK** documentation-only issue that:
- Changes fewer than 80 non-test lines
- Adds no new API surface or code
- Requires no authorization or persistence changes
- Is a pure documentation update with no functional impact

**Review Path:** Quality gates only (lint, format:check, test:run, build) plus a **SINGLE consolidated reviewer** (tech-lead). No separate QA or multi-agent cascade required. The tech-lead will verify documentation consistency and file validity once, sign off or request fixes in place.

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

- Read `AGENTS.md` line by line and verify:
  - Health and ready endpoints are mentioned
  - Terminology matches `README.md`
  - Section structure is consistent with existing sections
- Read `GEMINI.md` and verify:
  - Health and ready endpoints are described
  - Rate limiter bypass is noted
  - File paths reference real files in the repository
- Read `CHANGELOG.md` and verify:
  - SRT-1 changes are documented under an appropriate version
  - Added, Changed, Fixed sections are properly used
  - All filenames and paths are accurate
- Verify no broken markdown links or invalid cross-references exist across all three files
