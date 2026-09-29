# PROSPOR build plan

## Setup 1 — Repo and database files

What and why: Git, the folder layout, the file that keeps secrets out of Git, and the database SQL. A small, safe start.

### Prompt

Read @AGENTS.md and @docs/BUILD_PLAN.md fully first.

Setup Part 1: repo and database files only. Run commands yourself.

1. Run `git init` in the project root.
2. Create a root `.gitignore` with: node_modules/, dist/, .expo/, .env, .env.*, !.env.example, *.log, .DS_Store, coverage/
3. Create the folders server/ and supabase/ (docs/ already exists).
4. Create `supabase/001_schema.sql` and `supabase/002_policies.sql` exactly as written in AGENTS.md sections 5.1 and 5.2. Don't rename or change anything.
5. Create a root `README.md`: one paragraph on what PROSPOR is, the folder layout (app/, server/, supabase/, docs/), and a pointer to AGENTS.md and docs/BUILD_PLAN.md.

Don't create app or server code yet. When done, show me the folder tree.

### Checks

- Tree shows AGENTS.md, README.md, .gitignore, docs/BUILD_PLAN.md, server/, supabase/001_schema.sql, supabase/002_policies.sql
- 001_schema.sql contains tables folders, items, devices, linked_channels, link_codes, processed_messages and the function claim_items
- git status shows only these new files
