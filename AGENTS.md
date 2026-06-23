<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


<!-- BEGIN:neon-project-rules -->
# Neon MCP safety rules

When using the Neon MCP for this repository, always target:

- Neon project name: `devstash`
- Neon project ID: `dawn-tree-57372245`
- Default working branch: `development`
- Development branch ID: `br-aged-queen-abnc2h82`

Do not use, inspect, migrate, write to, or otherwise touch the production branch unless the user explicitly asks for production by name in the current request.

Production branch details for avoidance:

- Production branch name: `production`
- Production branch ID: `br-rapid-rain-ab4b2m8z`

For all Neon MCP calls that accept a branch, pass `branchId: "br-aged-queen-abnc2h82"` by default. For schema changes, data changes, migrations, destructive SQL, or generated SQL, assume development only unless production is explicitly requested and confirmed.
<!-- END:neon-project-rules -->