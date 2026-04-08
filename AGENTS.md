## What is Govinor?

A platform for creating and managing Docker container deployments with GitHub integration. It listens to GitHub webhooks and creates/manages Docker containers with preview links for branch deployments. Currently focused on deploying Strapi containers.

## Commands

```bash
# Development (starts Remix + workers + Redis via Docker Compose)
npm run dev

# Individual dev processes
npm run dev:remix      # Remix dev server (port 3000)
npm run dev:workers    # Background workers
npm run dev:redis      # Redis via docker compose

# Build
npm run build          # Prisma generate + Remix build

# Type checking (no linter or test runner configured)
npm run typecheck

# Database (SQLite via Prisma)
npm run db:migrate       # Create and apply migration (dev)
npm run db:migrate-deploy # Apply existing migrations (production)
npm run db:push          # Push schema to DB (dev)
npm run db:reset         # Reset database
npm run db:seed          # Seed data
npm run setup            # Migrate + seed
npm run db:studio        # Prisma Studio UI

# Production
npm run deploy           # Build + migrate + restart systemd service
```

## Architecture

**Remix v2 full-stack app** with a separate BullMQ worker process:

1. **GitHub webhooks** arrive at `/app/routes/github.webhook/` (push, pull_request, delete events)
2. Handlers queue **BullMQ jobs** (PushJob for deploy, DeleteDeploymentJob for cleanup)
3. **Worker process** (`/workers/index.ts`) picks up jobs from Redis and executes shell commands (Docker, Git, Caddy config)
4. **Dashboard UI** (Remix routes) shows deployment status, branches, repositories

**Key layers:**
- `app/routes/` - Remix file-based routing (loaders for GET, actions for POST/PUT/DELETE)
- `app/models/` - Server-side Prisma queries and shell command executors (`app/models/commands/`)
- `app/jobs/` - BullMQ job definitions extending `BaseJob` from `app/lib/jobs.server.ts`
- `app/lib/` - Server utilities: auth, sessions, shell executor, GitHub client (Octokit), logging
- `app/helpers/` - Pure utility functions (deployment helpers, path helpers, date formatting)
- `config/` - Environment variable loading (`env.server.ts`) and Redis/BullMQ config (`jobs.ts`)
- `workers/` - Standalone worker process that initializes job consumers
- `prisma/` - Schema (Repository, Branch models) and migrations (SQLite)

**Import alias:** `~/*` maps to `./app/*`

## Key Patterns

- **Server-only files** use `.server.ts` suffix (Remix convention, never bundled to client)
- **Validation** via Zod schemas in models (e.g., `CreateRepositoryInputSchema`)
- **Auth** is HTTP Basic Auth checked in root loader via `requireAuthorization(request)`
- **Shell commands** use the `Shell` class (`app/lib/shell.server.ts`) which wraps `child_process` with composable Command/SpawnCommand/MacroCommand types
- **Route breadcrumbs** exported via `handle.getBreadcrumbs()` from route modules
- **Environment variables** validated with `invariant()` in `config/env.server.ts`

## Tech Stack

Remix 2.6, React 18, TypeScript (strict), Prisma 4 (SQLite), BullMQ (Redis), Tailwind CSS 3 (JIT), Headless UI, Octokit, Zod, dayjs

## Dev Environment

- Node.js v20+ (see `.nvmrc` for exact version)
- Redis required for job queue (started via `docker compose up`)
- Shell commands for deployment target Ubuntu 20.04 and won't work on macOS/Windows; dev mode is primarily for UI work
