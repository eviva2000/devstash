# Complete Action

Safely finish the current feature. Never assume all local changes belong to the feature.

## Preflight

1. Read `context/current-feature.md` and identify the feature name, goals, and current status.
2. Run `git status --short` and `git branch --show-current`.
3. Run `git diff --name-only` and compare changed files to the feature goals.
4. Report:
   - Current branch
   - Changed files
   - Files that appear unrelated or uncertain
   - Proposed feature commit message
   - Proposed target branch, normally `main`
5. If there are unrelated or uncertain changes, ask which files to include. Do not stage unrelated files.
6. Ask for explicit approval before creating commits or changing branches.

## Local Completion

Only proceed after approval.

1. Stage only the approved feature files.
2. Commit the feature changes with the approved message.
3. Switch to the target branch.
4. Merge the feature branch into the target branch.
5. Reset `context/current-feature.md`:
   - Change H1 back to `# Current Feature`
   - Set Status to `Complete`
   - Clear Goals and Notes sections, preserving placeholder comments
   - Add the feature summary to the end of History
6. Commit the reset with `chore: reset current-feature.md after completing [feature]`.
7. Report the local result and stop before any remote operation.

## Remote Publish

Pushes and remote branch deletion require a second explicit approval after local completion.

Before asking for approval:

1. Run `git status --short`.
2. Show the exact commands you intend to run.
3. State whether the feature branch exists on the remote.

Only after approval:

1. Push the target branch once.
2. Delete the remote feature branch only if the user explicitly approved remote deletion.

## Safety Rules

- Do not run `git add .`.
- Do not stage files outside the approved list.
- Do not push, delete local branches, or delete remote branches without explicit approval.
- Do not continue if the merge fails; report the conflict files and ask how to proceed.
- If the worktree contains unrelated changes, preserve them and leave them unstaged.
