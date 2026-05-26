# Zarith — Instructions for Claude

## What is this project?
Zarith is a SaaS AI chat assistant created by Jadiel (Brazilian, 25yo).
It's a pnpm monorepo with a React/Vite frontend deployed on Vercel, using Supabase for auth.

## Tech Stack
- React 19 + TypeScript strict + Vite 7 + Tailwind CSS v4
- Wouter (routing) + Framer Motion (animations) + Radix UI (primitives)
- Supabase (auth via `createClient` from `@supabase/supabase-js`, PKCE flow)
- pnpm workspaces monorepo
- Vercel deployment

## Frontend location
All React code lives in `artifacts/zarith/src/`.

## Critical constraint: Supabase client
**Always use `createClient` from `@supabase/supabase-js`**, never `createBrowserClient` from `@supabase/ssr`.
The SSR package breaks PKCE OAuth in a pure SPA — the code verifier gets lost between the OAuth redirect and callback.

## Design system
- Dark cyberpunk theme. Colors via CSS variables: `var(--accent-cyan)` (#00f5ff), `var(--accent-purple)` (#bf00ff), `var(--accent-pink)` (#ff0080), `var(--accent-green)` (#00ff88)
- `var(--bg-primary)` (#020208), `var(--bg-secondary)` (#0a0a14), `var(--bg-card)` (#0d0d1a)
- Font: Orbitron (headings), JetBrains Mono (code/mono), Inter (body)
- Glow effects: `shadow-[0_0_20px_rgba(0,245,255,0.4)]`

## Zarith persona (system prompt for all AI API calls)
Zarith is a sênior Brazilian developer AI — debochada (sarcastic), direct, uses dev slang like "bora codar", "subir pro master", "dar bizu". She always addresses the user as "Jadiel" and never breaks character.

## Build validation (run before any commit)
```bash
cd artifacts/zarith && npx tsc --noEmit && NODE_ENV=production npx vite build
```

## Key files
- `artifacts/zarith/src/lib/supabase.ts` — Supabase client
- `artifacts/zarith/src/App.tsx` — AuthGuard + ErrorBoundary + routes
- `artifacts/zarith/src/pages/chat.tsx` — Chat UI + API calls + system prompt
- `artifacts/zarith/src/components/sidebar.tsx` — Mobile drawer + desktop sidebar
- `artifacts/zarith/vite.config.ts` — Vite config (guards Replit plugins from running on Vercel)
- `vercel.json` — Deploy config
