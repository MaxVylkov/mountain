# Mountaine MVP — Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Next.js project with Supabase integration, auth system, database schema, design system, and app shell with navigation.

**Architecture:** Next.js 14 App Router monolith with Supabase for auth/DB/storage. Tailwind CSS with custom "Mountain Night" dark theme. All catalog pages use SSG/ISR, user-specific pages use CSR with Supabase client.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + Storage), Lucide Icons, Inter + JetBrains Mono fonts

**Spec:** `docs/superpowers/specs/2026-03-27-mountaine-mvp-design.md`

---

## File Structure

```
./  (project root: /Users/maksimvalkov/Desktop/Mountaine)
├── .env.local                          # Supabase keys (gitignored)
├── .env.example                        # Template for env vars
├── next.config.ts                      # Next.js config
├── tailwind.config.ts                  # Tailwind with Mountain Night theme
├── package.json
├── tsconfig.json
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # All tables, RLS, triggers
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (fonts, theme, nav)
│   │   ├── page.tsx                    # Landing page
│   │   ├── globals.css                 # Tailwind directives + custom vars
│   │   ├── login/
│   │   │   └── page.tsx                # Login page
│   │   ├── register/
│   │   │   └── page.tsx                # Register page
│   │   └── profile/
│   │       └── page.tsx                # Profile page (placeholder)
│   │
│   ├── components/
│   │   ├── nav/
│   │   │   ├── navbar.tsx              # Top navigation bar
│   │   │   └── mobile-menu.tsx         # Mobile burger menu
│   │   ├── ui/
│   │   │   ├── button.tsx              # Reusable button component
│   │   │   ├── card.tsx                # Glass-morphism card
│   │   │   └── input.tsx               # Form input component
│   │   └── auth/
│   │       ├── login-form.tsx          # Login form component
│   │       └── register-form.tsx       # Register form component
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser Supabase client
│   │   │   ├── server.ts              # Server Supabase client
│   │   │   └── middleware.ts          # Auth middleware for protected routes
│   │   └── types/
│   │       └── database.ts            # Generated later via `npx supabase gen types`
│   │
│   └── middleware.ts                   # Next.js middleware (auth redirect)
│
└── __tests__/
    ├── components/
    │   ├── navbar.test.tsx
    │   ├── button.test.tsx
    │   └── auth-forms.test.tsx
    └── lib/
        └── supabase-client.test.ts
```

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.env.example`, `.gitignore`

- [ ] **Step 1: Move existing docs aside and scaffold Next.js project**

The `docs/` directory already exists, so we must temporarily move it before scaffolding:

Run:
```bash
cd /Users/maksimvalkov/Desktop/Mountaine
mv docs /tmp/mountaine-docs-backup
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
mv /tmp/mountaine-docs-backup docs
```

Expected: Project scaffolded with `src/app/` structure, Tailwind configured. `docs/` restored.

- [ ] **Step 1.5: Create .env.local with Supabase credentials**

> **User action required:** Create a Supabase project at https://supabase.com, then copy the URL and anon key.

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<your Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your Supabase anon key>
```

This file is gitignored. Without it, the Supabase client will crash at runtime.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr lucide-react framer-motion
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './__tests__/setup.ts',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `__tests__/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 4: Create .env.example**

Create `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Ensure `.env.local` is in `.gitignore`.

- [ ] **Step 5: Run dev server to verify scaffold**

Run: `npm run dev`
Expected: App runs at localhost:3000 with default Next.js page.

- [ ] **Step 6: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind, Vitest, Supabase deps"
```

---

## Task 2: Configure "Mountain Night" Design System

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Configure Tailwind theme**

Update `tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mountain: {
          bg: '#0F1923',
          surface: '#1A2735',
          primary: '#3B82F6',
          accent: '#F59E0B',
          success: '#10B981',
          danger: '#EF4444',
          text: '#F1F5F9',
          muted: '#94A3B8',
          border: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Set up global styles and fonts**

Update `src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-mountain-bg text-mountain-text antialiased;
  }
}

@layer components {
  .glass-card {
    @apply bg-mountain-surface/80 backdrop-blur-md border border-mountain-border rounded-xl;
  }

  .glow-hover {
    @apply transition-shadow duration-300 hover:shadow-lg hover:shadow-mountain-primary/10;
  }
}
```

Update `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Mountaine — Подготовка к восхождениям",
  description: "Приложение для альпинистов: база гор, снаряжение, тренировки, обучение узлам",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify theme renders**

Run: `npm run dev`
Expected: Dark background (#0F1923), Inter font loaded, page renders cleanly.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts src/app/globals.css src/app/layout.tsx
git commit -m "feat: configure Mountain Night design system with Tailwind theme"
```

---

## Task 3: Build Base UI Components

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `__tests__/components/button.test.tsx`

- [ ] **Step 1: Write button test**

Create `__tests__/components/button.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies primary variant by default', () => {
    render(<Button>Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-mountain-primary')
  })

  it('applies outline variant', () => {
    render(<Button variant="outline">Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('border-mountain-border')
  })

  it('shows disabled state', () => {
    render(<Button disabled>Test</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/components/button.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Button component**

Create `src/components/ui/button.tsx`:
```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'

type ButtonVariant = 'primary' | 'outline' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-mountain-primary text-white hover:bg-mountain-primary/90',
  outline: 'border border-mountain-border text-mountain-text hover:bg-mountain-surface',
  ghost: 'text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center rounded-xl px-4 py-2
          text-sm font-medium transition-colors duration-200
          disabled:opacity-50 disabled:pointer-events-none
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/components/button.test.tsx`
Expected: 4 tests PASS.

- [ ] **Step 5: Implement Card component**

Create `src/components/ui/card.tsx`:
```tsx
import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', hover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          glass-card p-6
          ${hover ? 'glow-hover cursor-pointer' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
```

- [ ] **Step 6: Implement Input component**

Create `src/components/ui/input.tsx`:
```tsx
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm text-mountain-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            w-full rounded-xl border bg-mountain-surface px-4 py-2
            text-mountain-text placeholder:text-mountain-muted/50
            focus:outline-none focus:ring-2 focus:ring-mountain-primary/50
            ${error ? 'border-mountain-danger' : 'border-mountain-border'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-sm text-mountain-danger">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/ __tests__/components/button.test.tsx
git commit -m "feat: add Button, Card, Input base UI components"
```

---

## Task 4: Set Up Supabase Client

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Create: `__tests__/lib/supabase-client.test.ts`

- [ ] **Step 1: Write Supabase client test**

Create `__tests__/lib/supabase-client.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')

describe('Supabase client', () => {
  it('createBrowserClient returns a client', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const client = createClient()
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/supabase-client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement browser client**

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/supabase-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement server client**

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  )
}
```

- [ ] **Step 6: Implement middleware for auth**

Create `src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedRoutes = ['/gear', '/profile', '/training']
  const isProtected = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

Create `src/middleware.ts`:
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase/ src/middleware.ts __tests__/lib/
git commit -m "feat: set up Supabase client (browser, server, middleware) with auth redirect"
```

---

## Task 5: Database Schema Migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Write full schema migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- ============================================
-- Mountaine MVP — Initial Schema
-- ============================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Profiles
-- ============================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  experience_level text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Mountains
-- ============================================
CREATE TABLE mountains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  region text,
  height integer NOT NULL,
  latitude decimal,
  longitude decimal,
  description text,
  image_url text,
  difficulty integer CHECK (difficulty BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER mountains_updated_at
  BEFORE UPDATE ON mountains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Routes
-- ============================================
CREATE TABLE routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mountain_id uuid REFERENCES mountains ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  difficulty integer CHECK (difficulty BETWEEN 1 AND 5),
  duration_days integer,
  description text,
  season text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Gear (catalog)
-- ============================================
CREATE TABLE gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text CHECK (category IN ('ropes', 'hardware', 'clothing', 'footwear', 'bivouac', 'electronics', 'other')) NOT NULL,
  description text,
  image_url text,
  weight integer, -- grams
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER gear_updated_at
  BEFORE UPDATE ON gear
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- User Gear (inventory)
-- ============================================
CREATE TABLE user_gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  gear_id uuid REFERENCES gear ON DELETE CASCADE NOT NULL,
  condition text CHECK (condition IN ('new', 'good', 'worn', 'needs_repair')) DEFAULT 'good',
  notes text,
  photo_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER user_gear_updated_at
  BEFORE UPDATE ON user_gear
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Route Gear (required gear per route)
-- ============================================
CREATE TABLE route_gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  gear_id uuid REFERENCES gear ON DELETE CASCADE NOT NULL,
  required boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- Packing Sets
-- ============================================
CREATE TABLE packing_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  route_id uuid REFERENCES routes ON DELETE SET NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER packing_sets_updated_at
  BEFORE UPDATE ON packing_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Packing Backpacks
-- ============================================
CREATE TABLE packing_backpacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_set_id uuid REFERENCES packing_sets ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  volume_liters integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- Packing Items
-- ============================================
CREATE TABLE packing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_set_id uuid REFERENCES packing_sets ON DELETE CASCADE NOT NULL,
  gear_id uuid REFERENCES gear ON DELETE CASCADE NOT NULL,
  backpack_id uuid REFERENCES packing_backpacks ON DELETE SET NULL,
  packed boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- Knowledge Graph Nodes
-- ============================================
CREATE TABLE kg_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  category text,
  level integer DEFAULT 0,
  parent_id uuid REFERENCES kg_nodes ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER kg_nodes_updated_at
  BEFORE UPDATE ON kg_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Knowledge Graph Edges
-- ============================================
CREATE TABLE kg_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id uuid REFERENCES kg_nodes ON DELETE CASCADE NOT NULL,
  target_node_id uuid REFERENCES kg_nodes ON DELETE CASCADE NOT NULL,
  relationship_type text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- KG Progress
-- ============================================
CREATE TABLE kg_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  node_id uuid REFERENCES kg_nodes ON DELETE CASCADE NOT NULL,
  studied boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, node_id)
);

-- ============================================
-- Knots
-- ============================================
CREATE TABLE knots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  difficulty_level integer NOT NULL,
  category text,
  description text,
  steps_json jsonb,
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER knots_updated_at
  BEFORE UPDATE ON knots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Knot Progress
-- ============================================
CREATE TABLE knot_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  knot_id uuid REFERENCES knots ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('locked', 'available', 'learning', 'mastered')) DEFAULT 'locked',
  score integer DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, knot_id)
);

CREATE TRIGGER knot_progress_updated_at
  BEFORE UPDATE ON knot_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Training Exercises
-- ============================================
CREATE TABLE training_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text CHECK (category IN ('cardio', 'strength', 'endurance', 'specific')) NOT NULL,
  description text,
  purpose text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER training_exercises_updated_at
  BEFORE UPDATE ON training_exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Training Log
-- ============================================
CREATE TABLE training_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES training_exercises ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now() NOT NULL,
  duration_min integer,
  sets integer,
  reps integer,
  distance_km decimal,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- Row Level Security
-- ============================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Public catalog tables (read-only for everyone)
ALTER TABLE mountains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mountains are public" ON mountains FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Routes are public" ON routes FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE gear ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gear catalog is public" ON gear FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE route_gear ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Route gear is public" ON route_gear FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE kg_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KG nodes are public" ON kg_nodes FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE kg_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KG edges are public" ON kg_edges FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE knots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Knots are public" ON knots FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE training_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exercises are public" ON training_exercises FOR SELECT TO anon, authenticated USING (true);

-- User-scoped tables
ALTER TABLE user_gear ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gear" ON user_gear FOR ALL USING (auth.uid() = user_id);

ALTER TABLE packing_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own packing sets" ON packing_sets FOR ALL USING (auth.uid() = user_id);

ALTER TABLE packing_backpacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own backpacks" ON packing_backpacks FOR ALL
  USING (packing_set_id IN (SELECT id FROM packing_sets WHERE user_id = auth.uid()));

ALTER TABLE packing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own packing items" ON packing_items FOR ALL
  USING (packing_set_id IN (SELECT id FROM packing_sets WHERE user_id = auth.uid()));

ALTER TABLE kg_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own KG progress" ON kg_progress FOR ALL USING (auth.uid() = user_id);

ALTER TABLE knot_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own knot progress" ON knot_progress FOR ALL USING (auth.uid() = user_id);

ALTER TABLE training_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own training log" ON training_log FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_routes_mountain ON routes(mountain_id);
CREATE INDEX idx_user_gear_user ON user_gear(user_id);
CREATE INDEX idx_route_gear_route ON route_gear(route_id);
CREATE INDEX idx_packing_sets_user ON packing_sets(user_id);
CREATE INDEX idx_packing_items_set ON packing_items(packing_set_id);
CREATE INDEX idx_packing_backpacks_set ON packing_backpacks(packing_set_id);
CREATE INDEX idx_kg_nodes_parent ON kg_nodes(parent_id);
CREATE INDEX idx_kg_edges_source ON kg_edges(source_node_id);
CREATE INDEX idx_kg_edges_target ON kg_edges(target_node_id);
CREATE INDEX idx_kg_progress_user ON kg_progress(user_id);
CREATE INDEX idx_knot_progress_user ON knot_progress(user_id);
CREATE INDEX idx_training_log_user ON training_log(user_id);
CREATE INDEX idx_mountains_difficulty ON mountains(difficulty);
CREATE INDEX idx_mountains_region ON mountains(region);
```

- [ ] **Step 2: Verify SQL syntax**

Review the file manually for syntax errors. Ensure all FK references are correct, all CHECK constraints match the spec.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema with all tables, RLS policies, and indexes"
```

> **Note:** This migration will be applied to Supabase once the project is created in the Supabase dashboard. The user will need to create a Supabase project and run this migration via the Supabase CLI or SQL editor.

---

## Task 6: Build Navigation

**Files:**
- Create: `src/components/nav/navbar.tsx`
- Create: `src/components/nav/mobile-menu.tsx`
- Create: `__tests__/components/navbar.test.tsx`

- [ ] **Step 1: Write navbar test**

Create `__tests__/components/navbar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { Navbar } from '@/components/nav/navbar'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}))

describe('Navbar', () => {
  it('renders logo', () => {
    render(<Navbar />)
    expect(screen.getByText('Mountaine')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Navbar />)
    expect(screen.getByText('Горы')).toBeInTheDocument()
    expect(screen.getByText('Кладовка')).toBeInTheDocument()
    expect(screen.getByText('Знания')).toBeInTheDocument()
    expect(screen.getByText('Узлы')).toBeInTheDocument()
    expect(screen.getByText('Тренировки')).toBeInTheDocument()
  })

  it('shows login button when not authenticated', () => {
    render(<Navbar />)
    expect(screen.getByText('Войти')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/components/navbar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Navbar**

Create `src/components/nav/navbar.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mountain, Backpack, BookOpen, Grip, Dumbbell, User, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MobileMenu } from './mobile-menu'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const navLinks = [
  { href: '/mountains', label: 'Горы', icon: Mountain },
  { href: '/gear', label: 'Кладовка', icon: Backpack },
  { href: '/knowledge', label: 'Знания', icon: BookOpen },
  { href: '/knots', label: 'Узлы', icon: Grip },
  { href: '/training', label: 'Тренировки', icon: Dumbbell },
]

export function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <nav className="sticky top-0 z-50 border-b border-mountain-border bg-mountain-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-mountain-text">
          Mountaine
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors
                ${pathname.startsWith(href)
                  ? 'bg-mountain-surface text-mountain-primary'
                  : 'text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface'
                }
              `}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface transition-colors"
            >
              <User size={18} />
              <span className="hidden sm:inline">Профиль</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-mountain-primary px-4 py-2 text-sm font-medium text-white hover:bg-mountain-primary/90 transition-colors"
            >
              Войти
            </Link>
          )}

          <button
            className="md:hidden p-2 text-mountain-muted hover:text-mountain-text"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <MobileMenu
          links={navLinks}
          pathname={pathname}
          onClose={() => setMobileOpen(false)}
        />
      )}
    </nav>
  )
}
```

- [ ] **Step 4: Implement MobileMenu**

Create `src/components/nav/mobile-menu.tsx`:
```tsx
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface MobileMenuProps {
  links: { href: string; label: string; icon: LucideIcon }[]
  pathname: string
  onClose: () => void
}

export function MobileMenu({ links, pathname, onClose }: MobileMenuProps) {
  return (
    <div className="md:hidden border-t border-mountain-border bg-mountain-bg/95 backdrop-blur-md">
      <div className="space-y-1 px-4 py-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`
              flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors
              ${pathname.startsWith(href)
                ? 'bg-mountain-surface text-mountain-primary'
                : 'text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface'
              }
            `}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test**

Run: `npx vitest run __tests__/components/navbar.test.tsx`
Expected: PASS.

- [ ] **Step 6: Add Navbar to root layout**

Replace the full content of `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/nav/navbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Mountaine — Подготовка к восхождениям",
  description: "Приложение для альпинистов: база гор, снаряжение, тренировки, обучение узлам",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/nav/ __tests__/components/navbar.test.tsx src/app/layout.tsx
git commit -m "feat: add responsive navbar with auth state and mobile menu"
```

---

## Task 7: Auth Pages (Login & Register)

**Files:**
- Create: `src/components/auth/login-form.tsx`
- Create: `src/components/auth/register-form.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`
- Create: `__tests__/components/auth-forms.test.tsx`

- [ ] **Step 1: Write auth form test**

Create `__tests__/components/auth-forms.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  }),
}))

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument()
  })

  it('has link to register', () => {
    render(<LoginForm />)
    expect(screen.getByText('Создать аккаунт')).toBeInTheDocument()
  })
})

describe('RegisterForm', () => {
  it('renders name, email, and password fields', () => {
    render(<RegisterForm />)
    expect(screen.getByLabelText('Имя')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать аккаунт' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/components/auth-forms.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement LoginForm**

Create `src/components/auth/login-form.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Неверный email или пароль')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />
      <Input
        id="password"
        label="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
      />
      {error && <p className="text-sm text-mountain-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Входим...' : 'Войти'}
      </Button>
      <p className="text-center text-sm text-mountain-muted">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-mountain-primary hover:underline">
          Создать аккаунт
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 4: Implement RegisterForm**

Create `src/components/auth/register-form.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="name"
        label="Имя"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Как тебя зовут"
        required
      />
      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />
      <Input
        id="password"
        label="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Минимум 6 символов"
        minLength={6}
        required
      />
      {error && <p className="text-sm text-mountain-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Создаём...' : 'Создать аккаунт'}
      </Button>
      <p className="text-center text-sm text-mountain-muted">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="text-mountain-primary hover:underline">
          Войти
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 5: Create login page**

Create `src/app/login/page.tsx`:
```tsx
import { LoginForm } from '@/components/auth/login-form'
import { Card } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <h1 className="mb-6 text-2xl font-bold text-center">Вход в Mountaine</h1>
        <LoginForm />
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Create register page**

Create `src/app/register/page.tsx`:
```tsx
import { RegisterForm } from '@/components/auth/register-form'
import { Card } from '@/components/ui/card'

export default function RegisterPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <h1 className="mb-6 text-2xl font-bold text-center">Регистрация</h1>
        <RegisterForm />
      </Card>
    </div>
  )
}
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run __tests__/components/auth-forms.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/auth/ src/app/login/ src/app/register/ __tests__/components/auth-forms.test.tsx
git commit -m "feat: add login and register pages with auth forms"
```

---

## Task 8: Landing Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build landing page**

Update `src/app/page.tsx`:
```tsx
import Link from 'next/link'
import { Mountain, Backpack, BookOpen, Grip, Dumbbell } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const modules = [
  {
    href: '/mountains',
    icon: Mountain,
    title: 'База гор',
    description: 'Каталог гор и маршрутов с описанием сложности и сезонности',
  },
  {
    href: '/gear',
    icon: Backpack,
    title: 'Кладовка',
    description: 'Учёт снаряжения, режим сборов с распределением по рюкзакам',
  },
  {
    href: '/knowledge',
    icon: BookOpen,
    title: 'Граф знаний',
    description: 'Интерактивная карта знаний альпиниста из учебника',
  },
  {
    href: '/knots',
    icon: Grip,
    title: 'Узлы',
    description: 'Изучай узлы пошагово — от простых к сложным, как в Duolingo',
  },
  {
    href: '/training',
    icon: Dumbbell,
    title: 'Тренировки',
    description: 'Упражнения и рекомендации для подготовки к восхождениям',
  },
]

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="flex flex-col items-center text-center py-16 space-y-6">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          <span className="text-mountain-primary">Mount</span>aine
        </h1>
        <p className="max-w-2xl text-lg text-mountain-muted">
          Готовься к восхождениям, тренируйся и учись.
          Всё, что нужно альпинисту — в одном месте.
        </p>
        <div className="flex gap-4">
          <Link href="/register">
            <Button>Начать бесплатно</Button>
          </Link>
          <Link href="/mountains">
            <Button variant="outline">Смотреть горы</Button>
          </Link>
        </div>
      </section>

      {/* Modules */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card hover className="h-full space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mountain-primary/10">
                <Icon size={24} className="text-mountain-primary" />
              </div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-mountain-muted">{description}</p>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Expected: Dark landing page with hero section, "Mountaine" heading, and 5 module cards with glassmorphism style.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: build landing page with hero section and module cards"
```

---

## Task 9: Profile Page (Placeholder)

**Files:**
- Create: `src/app/profile/page.tsx`

- [ ] **Step 1: Build profile page**

Create `src/app/profile/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
        return
      }
      setUser(data.user)
    })
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Профиль</h1>
      <Card className="space-y-4">
        <div>
          <p className="text-sm text-mountain-muted">Имя</p>
          <p className="text-lg">{user.user_metadata?.display_name || 'Альпинист'}</p>
        </div>
        <div>
          <p className="text-sm text-mountain-muted">Email</p>
          <p className="text-lg">{user.email}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Выйти
        </Button>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/profile/
git commit -m "feat: add profile page with user info and logout"
```

---

## Task 10: Create Placeholder Pages for All Modules

**Files:**
- Create: `src/app/mountains/page.tsx`
- Create: `src/app/gear/page.tsx`
- Create: `src/app/knowledge/page.tsx`
- Create: `src/app/knots/page.tsx`
- Create: `src/app/training/page.tsx`

- [ ] **Step 1: Create mountains placeholder**

Create `src/app/mountains/page.tsx`:
```tsx
import { Mountain } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function MountainsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Mountain className="text-mountain-primary" />
        База гор
      </h1>
      <Card>
        <p className="text-mountain-muted">Каталог гор и маршрутов — скоро здесь.</p>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create gear placeholder**

Create `src/app/gear/page.tsx`:
```tsx
import { Backpack } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function GearPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Backpack className="text-mountain-primary" />
        Кладовка
      </h1>
      <Card>
        <p className="text-mountain-muted">Учёт снаряжения и режим сборов — скоро здесь.</p>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Create knowledge placeholder**

Create `src/app/knowledge/page.tsx`:
```tsx
import { BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <BookOpen className="text-mountain-primary" />
        Граф знаний
      </h1>
      <Card>
        <p className="text-mountain-muted">Интерактивная карта знаний альпиниста — скоро здесь.</p>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Create knots placeholder**

Create `src/app/knots/page.tsx`:
```tsx
import { Grip } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function KnotsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Grip className="text-mountain-primary" />
        Узлы
      </h1>
      <Card>
        <p className="text-mountain-muted">Обучение узлам в стиле Duolingo — скоро здесь.</p>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Create training placeholder**

Create `src/app/training/page.tsx`:
```tsx
import { Dumbbell } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Dumbbell className="text-mountain-primary" />
        Тренировки
      </h1>
      <Card>
        <p className="text-mountain-muted">Упражнения и рекомендации для подготовки — скоро здесь.</p>
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Verify all routes work**

Run: `npm run dev`
Visit: `/mountains`, `/gear`, `/knowledge`, `/knots`, `/training`
Expected: Each page shows title with icon and placeholder card. Navigation highlights active link.

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/mountains/ src/app/gear/ src/app/knowledge/ src/app/knots/ src/app/training/
git commit -m "feat: add placeholder pages for all modules"
```

---

## Phase 1 Complete

At the end of Phase 1 you have:
- Working Next.js app with Mountain Night dark theme
- Supabase integration (client, server, middleware)
- Full database schema with RLS policies
- Auth (login, register, logout)
- Responsive navigation with mobile menu
- Landing page with module cards
- Placeholder pages for all 5 modules
- Base UI components (Button, Card, Input)
- Test infrastructure with Vitest

**Next:** Phase 2 — Mountains & Routes module (catalog, filtering, route detail pages, gear checklist)
