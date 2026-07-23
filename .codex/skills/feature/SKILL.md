---
name: feature
description: Manage the current feature workflow for this project, including loading specs, starting work, reviewing changes, explaining changes, testing, and completing features.
---

# Feature Workflow

Manages the full lifecycle of a feature from spec to merge.

## Working File

@context/current-feature.md

### File Structure

current-feature.md has these sections:

- `# Current Feature` - H1 heading with feature name when active
- `## Status` - Not Started | In Progress | Complete
- `## Goals` - Bullet points of what success looks like
- `## Notes` - Additional context, constraints, or details from spec
- `## History` - Completed features (append only)

## Task

Execute the requested action: $ARGUMENTS

Use one of these actions after `$feature`: `load`, `start`, `review`, `explain`, `test`, or `complete`.

| Action | Description |
|--------|-------------|
| `load` | Load a feature spec or inline description |
| `start` | Make a todo list, begin implementation, create branch |
| `review` | Check goals met, code quality |
| `explain` | Document what changed and why |
| `test` | Add or run focused tests for changed feature code |
| `complete` | Safely finish the feature with review, commits, merge, and optional publish |

See [actions/](actions/) for detailed instructions.

If no action provided, explain the available options.
