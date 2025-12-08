# Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (Button, Card, Dialog, etc.)
│   ├── dashboard/       # Restaurant dashboard components
│   │   ├── OrderManagement.tsx
│   │   ├── MenuManagement.tsx
│   │   ├── FeedbackView.tsx
│   │   └── ...
│   └── *.tsx            # Shared components (PolicyLayout, skeletons, etc.)
│
├── pages/               # Route components
│   ├── Auth.tsx                    # Login/Signup (/)
│   ├── CustomerMenu.tsx            # Public menu (/menu/:restaurantId)
│   ├── DashboardWithSidebar.tsx    # Restaurant dashboard (/dashboard)
│   ├── AdminDashboardWithSidebar.tsx # Admin panel (/admindashboard)
│   └── ...                         # Policy pages, NotFound, etc.
│
├── hooks/               # Custom React hooks
│   ├── use-toast.ts
│   ├── use-mobile.tsx
│   └── useAdminAuth.tsx
│
├── lib/                 # Utility functions
│   ├── utils.ts         # cn() helper for classnames
│   ├── adminAuth.ts
│   ├── security.ts
│   └── ...
│
├── integrations/
│   └── supabase/
│       ├── client.ts    # Supabase client instance
│       └── types.ts     # Auto-generated database types
│
├── assets/              # Static assets (images)
├── App.tsx              # Root component with routes
├── main.tsx             # Entry point
└── index.css            # Global styles + Tailwind

supabase/
├── config.toml          # Supabase local config
├── functions/           # Edge Functions (Deno)
│   └── send-order-notification/
└── migrations/          # SQL migration files

public/
├── manifest.json        # PWA manifest
└── OneSignalSDKWorker.js
```

## Key Patterns

- **Pages** are route-level components in `src/pages/`
- **UI components** from shadcn live in `src/components/ui/`
- **Feature components** grouped by domain (e.g., `dashboard/`)
- **Supabase types** are auto-generated - don't edit `types.ts` manually
- **Import alias**: Use `@/` for src imports (e.g., `@/components/ui/button`)

## Route Structure

| Path | Component | Access |
|------|-----------|--------|
| `/` | Auth | Public |
| `/dashboard` | DashboardWithSidebar | Full Service subscribers |
| `/menu-dashboard` | MenuOnlyDashboard | Menu Only subscribers |
| `/menu/:restaurantId` | CustomerMenu | Public |
| `/pricing` | Pricing | Public |
| `/admindashboard` | AdminDashboardWithSidebar | Platform admin |
| `/admindashboard/login` | AdminLogin | Public |

## Subscription Flow

- Users are redirected based on their subscription plan
- `useSubscription` hook provides subscription state globally
- `SubscriptionProvider` wraps the app in `App.tsx`
- Edge Functions handle Razorpay integration
