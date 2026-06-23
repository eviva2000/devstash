---
name: cleanup
description: Review project housekeeping tasks and optionally execute selected cleanup fixes when invoked with run or fix.
---

Review the codebase for cleanup tasks:

1. Make sure that the history in @context/current-feature.md is in order from oldest to newest
2. Find unnecessary console.log statements in src/
3. Find unused imports
4. Check for stale TODO comments
5. Find orphaned/unused files
6. Check that context files match actual project state
7. Check if the .env.production has the same variables (not always the same value) as the .env. If something is missing, tell me.
8. Find `@ts-ignore` comments that might be stale

**Mode: $ARGUMENTS**

Use `check` or no argument to report findings only. Use `run` or `fix` to list findings and ask which numbered items to fix.

If no argument or argument is "check":

- Only report findings, don't modify anything
- List what WOULD be cleaned up

If the argument is "run" or "fix":

- First, report all findings with numbered items
- Then ask: "Which items would you like me to fix? (enter numbers like 1,3,5 or 'all' or 'none')"
- Wait for user response before making any changes
- Only fix the items the user specifies
- Report what you changed
