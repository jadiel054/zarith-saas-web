# Zarith — Agent Context (AGENTS.md)

## Project
**Zarith** — SaaS AI chat assistant. Creator: Jadiel (Brazilian, 25yo).
Monorepo (pnpm). Frontend: React/Vite. Auth/DB: Supabase. Deploy: Vercel.

## Architecture
```
artifacts/zarith/     ← React frontend (THE main app)
artifacts/api-server/ ← Express API (health check only, not in active use)
lib/db/               ← Drizzle ORM schema (PostgreSQL via Supabase)
lib/api-spec/         ← OpenAPI spec
lib/api-client-react/ ← Generated TanStack Query hooks
vercel.json           ← Deploy: builds artifacts/zarith, output to artifacts/zarith/dist/public
```

## Frontend source tree
```
artifacts/zarith/src/
├── App.tsx              ← Root: AuthGuard + ErrorBoundary + Wouter routes
├── main.tsx             ← React entry point
├── index.css            ← Tailwind + CSS variables (cyberpunk theme)
├── lib/
│   ├── supabase.ts      ← createClient (PKCE, detectSessionInUrl)
│   └── utils.ts         ← cn() helper (clsx + tailwind-merge)
├── pages/
│   ├── login.tsx        ← OAuth (GitHub/Google) + email/password login + signup
│   ├── chat.tsx         ← Main chat: action cards, messages, API calls, system prompt
│   ├── dashboard.tsx    ← Stats dashboard (static)
│   ├── settings.tsx     ← Profile, API keys (localStorage), session management
│   ├── memories.tsx     ← Memory list (static placeholder)
│   ├── admin.tsx        ← Admin panel (static placeholder)
│   ├── auth-callback.tsx← OAuth callback handler (onAuthStateChange)
│   └── not-found.tsx    ← 404 page
└── components/
    ├── sidebar.tsx       ← Sidebar (desktop: collapsible; mobile: drawer)
    ├── action-cards.tsx  ← 8 quick action cards (empty state of chat)
    ├── thinking-stream.tsx ← Waveform animation + rotating phrases during loading
    ├── about-modal.tsx   ← "About Zarith" modal (cyberpunk style)
    └── command-palette.tsx ← Cmd+K command palette
```

## Key technical decisions
| Decision | Reason |
|----------|--------|
| `createClient` (supabase-js) NOT `createBrowserClient` (ssr) | SSR package loses PKCE code_verifier in pure SPA — causes "PKCE not found" error |
| Wouter instead of React Router | Lighter, simpler for SPA without SSR |
| Tailwind CSS v4 | Uses `@tailwindcss/vite` plugin, no `tailwind.config.js` needed |
| localStorage for API keys | Simple, no server needed; prefix: `zarith_apikey_` |
| Framer Motion for all animations | Consistent, supports `AnimatePresence` for route transitions and drawer |

## AI Models supported in chat
| ID | Name | API | Model ID |
|----|------|-----|----------|
| groq | Groq | api.groq.com | llama-3.3-70b-versatile |
| deepseek | DeepSeek | openrouter.ai | deepseek/deepseek-r1 |
| gemini | Gemini | generativelanguage.googleapis.com | gemini-1.5-flash |
| qwen | Qwen | openrouter.ai | qwen/qwen3-coder:free |
| glm | GLM | openrouter.ai | — |

## Zarith persona (system prompt injected in all API calls)
- Desenvolvedora sênior brasileira, debochada, ácida, direta
- Uses: "bora codar", "subir pro master", "dar bizu", "tá moscando"
- Addresses user as "Jadiel"
- Never breaks character

## Environment variables (Vercel)
```
VITE_SUPABASE_URL=<supabase project url>
VITE_SUPABASE_ANON_KEY=<supabase anon key>
BASE_PATH=/
NODE_ENV=production
```

## Build
```bash
pnpm install
pnpm --filter @workspace/zarith run build
# Output: artifacts/zarith/dist/public/
```

## Routing (vercel.json)
All routes rewrite to `/index.html` (SPA). The `/api/auth/callback` route is handled client-side by `auth-callback.tsx`.
