# Tech Stack & Build System

## Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (with SWC for fast compilation)
- **Styling**: TailwindCSS + CSS variables for theming
- **UI Components**: shadcn/ui (Radix primitives)
- **Animations**: Framer Motion
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form + Zod validation

## Backend

- **Platform**: Supabase
  - PostgreSQL database
  - Realtime subscriptions
  - Auth (PKCE flow)
  - Edge Functions (Deno)
  - Row Level Security (RLS)

## Key Libraries

- `@supabase/supabase-js` - Database client
- `lucide-react` - Icons
- `sonner` - Toast notifications
- `qrcode` - QR code generation
- `date-fns` - Date formatting
- `recharts` - Charts/analytics

## Common Commands

```bash
# Install dependencies
npm install

# Start dev server (port 8080)
npm run dev

# Production build
npm run build

# Development build
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Environment Variables

Required in `.env` (no quotes around values):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

## Path Aliases

- `@/*` maps to `./src/*` (configured in tsconfig.json and vite.config.ts)

## TypeScript Configuration

- Relaxed strict mode (`noImplicitAny: false`, `strictNullChecks: false`)
- Project references for app and node configs
