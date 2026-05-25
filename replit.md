# Zarith VTuber AI

A cyberpunk-themed AI chat interface with multi-model support, user management, and a neural intelligence SaaS dashboard.

## Run & Operate

- `pnpm --filter @workspace/zarith run dev` — run the frontend (Vite dev server)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifact: `artifacts/zarith/`)
- API: Express 5 (`artifacts/api-server/`)
- UI: Tailwind CSS v4, Framer Motion, Lucide React, cmdk
- Auth: Supabase (OAuth via GitHub/Google + email/password)
- Fonts: Orbitron, JetBrains Mono, Inter (Google Fonts via index.html)

## Where things live

- `artifacts/zarith/src/pages/` — all page components (login, chat, dashboard, settings, memories, admin)
- `artifacts/zarith/src/components/` — shared components (Sidebar, CommandPalette)
- `artifacts/zarith/src/lib/supabase.ts` — Supabase browser client
- `artifacts/zarith/src/index.css` — cyberpunk CSS variables and utility classes
- `artifacts/zarith/public/zarith.png` — Zarith VTuber avatar image

## Architecture decisions

- Migrated from Next.js → Vite + React using wouter for client-side routing
- Supabase auth: uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (was NEXT_PUBLIC_*)
- All API routes (chat, github, greptile) were originally Next.js Edge routes; currently the frontend simulates responses — real AI integration requires API keys in Settings
- Google Fonts loaded via `<link>` in `index.html` (not CSS @import, which conflicts with PostCSS/Tailwind v4)
- CommandPalette uses Ctrl+K shortcut; uses wouter `useLocation` instead of next/router

## Product

- Login page with Zarith avatar, GitHub/Google OAuth, and email+password auth via Supabase
- Chat interface with collapsible sidebar, multi-model selector (Groq, Qwen, DeepSeek, Gemini, GLM), and web search toggle
- Dashboard with usage stats and activity feed
- Settings with tabbed UI for account, API keys, and session management
- Memories page for storing and searching AI context memories
- Admin panel with user management table
- Global command palette (Ctrl+K) for quick navigation

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets for Supabase auth to work
- The OAuth redirect URL in login.tsx uses `window.location.origin + /api/auth/callback` — update the Supabase dashboard to allowlist the Replit domain
- Fonts must be loaded via `index.html` `<link>` tags, NOT CSS `@import` (breaks PostCSS with Tailwind v4)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
