# Dreamland App — Project Context

## What is this

Next.js project management SaaS with AI integration. Manages projects, tasks, departments, team sentiment, and generates AI-powered reports. Includes an AI chat agent per project and voice assistant.

## Stack

- **Framework**: Next.js 16 App Router (TypeScript strict)
- **UI**: Tailwind CSS v4, shadcn/ui components (Radix UI primitives), Lucide icons
- **Database**: PostgreSQL via Prisma ORM v7 (driver adapter: `@prisma/adapter-pg`)
- **Auth**: Custom JWT with `jose` + `bcryptjs`, session in httpOnly cookie
- **AI**: Multi-provider (`@ai-sdk/*`) — OpenAI, Google Gemini, Groq, OpenRouter
- **i18n**: `next-intl` — all routes under `src/app/[locale]/`
- **Forms**: `react-hook-form` + `zod` v4
- **Testing**: Vitest + Testing Library

## Directory Structure

```
src/
  app/
    [locale]/
      (dashboard)/         # All authenticated pages
        page.tsx           # Dashboard home (KPIs)
        projects/          # Project list + detail (board/calendar/gantt/list/timeline)
        departments/       # Department overview
        sentiment/         # Team sentiment check-ins + history
        reports/           # AI-generated reports viewer
        admin/             # Users, roles, sentiment templates
      login/
    api/
      chat/route.ts        # AI chat streaming endpoint (Vercel AI SDK)
      seed/
    actions/               # Legacy location (moved to src/lib/actions/)

  components/
    ui/                    # shadcn/ui base components (don't modify unless necessary)
    tasks/                 # Kanban, calendar, gantt, list, timeline views + dialogs
    projects/              # Project table, filters, timeline
    departments/           # Department cards + filters
    sentiment/             # Sentiment check-in, charts, history
    reports/               # Report viewer + print
    chat/                  # AI chat panel, messages, history
    admin/                 # User/role dialogs
    layout/                # Header, sidebar, theme toggle, language switcher
    voice/                 # Voice assistant components

  lib/
    actions/               # ALL server actions (mutations + queries) — one file per domain
      tasks.ts, projects.ts, departments.ts, users.ts, roles.ts,
      sentiment.ts, tags.ts, task-lists.ts, task-statuses.ts,
      task-comments.ts, task-attachments.ts, chat.ts, voice.ts,
      ai-usage.ts, rbac.ts, cached-queries.ts, queries-lite.ts
    ai/
      config.ts            # AI model configuration
      factory.ts           # Provider factory
      provider.interface.ts
      tools.ts             # AI tool definitions
      executor.ts          # Tool execution
      gemini-provider.ts, groq-provider.ts, openrouter-provider.ts, ai-utils.ts
    auth.ts                # Auth helpers
    session.ts             # JWT session management
    permissions.ts         # Permission checks
    prisma.ts              # Prisma client singleton
    utils.ts               # cn() and utilities
    validations/           # Zod schemas

  types/                   # Shared TypeScript types
  i18n/                    # next-intl config + message loaders
```

## Database Models (Prisma)

- **Project** — id, title, department, type(Problem/Idea/Initiative), priority, status, progress, color, dates
- **TaskList** — kanban lists within a project (ordered by position)
- **Task** — title, description, technicalNotes, position, dates, estimatedHours, actualHours, storyPoints, progress, assignee, status, tags, comments, attachments
- **TaskStatus** — custom statuses per project (name, color, position)
- **TaskComment** / **TaskAttachment** — per task
- **Tag** — per project, with color
- **ProjectRisk** — risk level + reason per project
- **TeamMood** — sentiment score (0-100), dominantEmotion, departmentName
- **Report** — AI-generated reports (type: Weekly/Risk/Financial/SentimentAnalysis/ProjectCatalog), linked to project + author
- **User** — username (unique), email, password (bcrypt), roleId
- **Role** — code (SUPER_ADMIN/STRATEGIC_PM/TEAM_LEAD/TEAM_MEMBER), isSystem
- **Permission** — action + resource pairs linked to roles
- **ChatSession** / **ChatMessage** — AI chat per project+user, messages store toolInvocations as JSON
- **AiUsageLog** — tracks tokens per AI call (modelName, actionType, tokens)

## Key Patterns

### Server Actions
All data mutations and queries use Next.js Server Actions in `src/lib/actions/`. No REST API for internal data (except the AI chat streaming route at `src/app/api/chat/`).

### Auth & RBAC
- Session cookie contains JWT signed with `jose`
- `src/lib/auth.ts` — `getSession()`, `requireAuth()`
- `src/lib/permissions.ts` — `checkPermission(userId, action, resource)`
- `src/components/auth/role-guard.tsx` — client-side role gate

### AI Multi-Provider
- `src/lib/ai/factory.ts` — creates provider instance based on config
- `src/lib/ai/tools.ts` — tool definitions for the AI agent (create task, update project, etc.)
- `src/lib/ai/executor.ts` — executes tool calls
- Streaming via Vercel AI SDK `useChat` hook → `src/app/api/chat/route.ts`

### i18n
- All authenticated routes live under `src/app/[locale]/(dashboard)/`
- Messages in `src/i18n/` — use `useTranslations()` in client components, `getTranslations()` in server components

### Component Conventions
- Server Components by default; add `"use client"` only when needed
- Lazy loading for heavy views: `src/components/tasks/lazy-components.tsx`
- shadcn/ui components in `src/components/ui/` — extend but don't rewrite

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # prisma generate + next build
npm run db:push      # Push schema changes (--accept-data-loss)
npm run db:seed      # Seed database
npm run db:reset     # Force reset + seed
npm run test         # Vitest (watch)
npm run test:run     # Vitest (single run)
```

## Important Files

| Purpose | Path |
|---|---|
| Prisma schema | `prisma/schema.prisma` |
| Prisma client | `src/lib/prisma.ts` |
| Auth logic | `src/lib/auth.ts`, `src/lib/session.ts` |
| AI config | `src/lib/ai/config.ts` |
| Route layout | `src/app/[locale]/(dashboard)/layout.tsx` |
| Global styles | `src/app/globals.css` |
| Tailwind config | Inline in `globals.css` (Tailwind v4 CSS-first) |
| i18n config | `src/i18n/` |
