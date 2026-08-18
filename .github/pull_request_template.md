## Summary

<!-- What this PR delivers, in two or three sentences. -->

## Issues closed

<!--
One `Closes #N` line per issue, each on its own line, because GitHub only
auto-closes issues written in that exact form. For a Ralph Wiggum loop PR,
list the parent tracking issue first, then every sub-issue from the plan
file. A body naming only sub-issues leaves the parent stuck open.

Use `Part of #N` where a parent tracks more work than this PR delivers.
-->

Closes #

## Plan file

<!-- e.g. plans/TA-12-bulk-contact-import.md, or "not applicable" for a manual PR. -->

## Quality gates

- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test:run`
- [ ] `npm run build`

## Reviewer checklist

- [ ] Layering respected, meaning pages call hooks, hooks call services, and server business logic sits in `src/server/services/` rather than in a route handler
- [ ] Every server response built with `successResponse` or `errorResponse`
- [ ] Every modified file has tests covering the behaviour that changed
- [ ] Server tests mock Prisma rather than reaching a real database
- [ ] No commented-out code, unused imports or leftover placeholder TODOs
- [ ] Documentation updated where the change affects it
- [ ] Any migration was generated rather than hand-written, and new columns are nullable or carry a default
