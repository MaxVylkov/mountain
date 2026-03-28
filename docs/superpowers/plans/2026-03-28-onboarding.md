# Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add personalized onboarding flow that detects first-time users, asks their experience level, shows a "Path to the Summit" journey map, and transforms the home page into a personal progress dashboard.

**Architecture:** New `/onboard` route with multi-step wizard (reusing TripWizard pattern). Middleware intercepts first-time users. Home page becomes dynamic — shows current stage progress and next step based on user's experience level and activity. Profile table extended with `onboarded` boolean flag.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase (profiles table), Tailwind CSS 4, Framer Motion (already installed)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/005_onboarding.sql` | Create | Add `onboarded` column to profiles |
| `src/app/onboard/page.tsx` | Create | Server component wrapper for onboarding |
| `src/components/onboarding/onboard-wizard.tsx` | Create | Multi-step wizard: level select → journey map |
| `src/components/onboarding/level-select.tsx` | Create | Step 1: "Who are you?" cards |
| `src/components/onboarding/journey-map.tsx` | Create | Step 2: "Path to the Summit" vertical map |
| `src/app/page.tsx` | Modify | Transform into personal progress dashboard |
| `src/components/home/progress-dashboard.tsx` | Create | Authenticated home: current stage + next step |
| `src/middleware.ts` | Modify | Redirect non-onboarded users to /onboard |
| `src/lib/onboarding.ts` | Create | Helper: get user progress across modules |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/005_onboarding.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Add onboarding flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded boolean DEFAULT false;
```

- [ ] **Step 2: Apply migration via Supabase SQL Editor**

Copy the SQL above into Supabase Dashboard → SQL Editor → Run.

- [ ] **Step 3: Verify column exists**

Run in SQL Editor: `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarded';`

Expected: one row with `boolean` type and `false` default.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_onboarding.sql
git commit -m "feat: add onboarded flag to profiles table"
```

---

### Task 2: Level Select Component

**Files:**
- Create: `src/components/onboarding/level-select.tsx`

- [ ] **Step 1: Create level select component**

Client component with three clickable cards:
- **Новичок (beginner)** — icon: mountain outline, description: "Первый-второй сезон. Хочу узнать основы и собраться в первую поездку"
- **Значкист (intermediate)** — icon: mountain with flag, description: "Хожу 1Б-2Б. Хочу расти и планировать восхождения"
- **Разрядник (advanced)** — icon: double mountain, description: "2-й разряд и выше. Нужна база маршрутов и инструменты планирования"

Props: `onSelect: (level: 'beginner' | 'intermediate' | 'advanced') => void`

Use existing Card component with hover effect. Selected card gets `ring-2 ring-mountain-primary` border. Use Framer Motion for entrance animation (staggered fade-in from bottom).

- [ ] **Step 2: Commit**

```bash
git add src/components/onboarding/level-select.tsx
git commit -m "feat: add level select component for onboarding"
```

---

### Task 3: Journey Map Component

**Files:**
- Create: `src/components/onboarding/journey-map.tsx`

- [ ] **Step 1: Create journey map component**

Vertical "Path to the Summit" layout with 4 stages connected by a dotted line. Each stage is a glass-card with icon, title, description, and contained modules. Bottom to top:

```
🏔 ВЕРШИНА — Выход на маршрут
   "Ты готов к восхождению"

⛺ ШТУРМОВОЙ ЛАГЕРЬ — Планирование поездки
   Модуль: Поездки
   "Спланируй маршрут, собери снаряжение, проверь готовность"

🏕 БАЗОВЫЙ ЛАГЕРЬ — Снаряжение и маршруты
   Модули: Кладовка, Маршруты
   "Собери своё снаряжение и изучи маршруты района"

🥾 ПОДНОЖИЕ — Знания и подготовка
   Модули: Граф знаний, Узлы, Тренировки
   "Изучи теорию, освой узлы, начни тренироваться"
```

Props: `level: 'beginner' | 'intermediate' | 'advanced'`

For `intermediate` — "Подножие" stage shows as partially completed (muted).
For `advanced` — "Подножие" and "Базовый лагерь" show as completed.

Use Framer Motion for sequential reveal animation (stages appear one by one from bottom).

- [ ] **Step 2: Add a "Начать путь" (Start journey) button at the bottom**

Button calls `onComplete()` prop which saves the level and sets `onboarded = true`.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/journey-map.tsx
git commit -m "feat: add journey map component for onboarding"
```

---

### Task 4: Onboard Wizard & Page

**Files:**
- Create: `src/components/onboarding/onboard-wizard.tsx`
- Create: `src/app/onboard/page.tsx`

- [ ] **Step 1: Create onboard wizard**

Client component with two steps:
1. `LevelSelect` — user picks level
2. `JourneyMap` — shows personalized path

On completion:
- Update `profiles` table: set `experience_level` and `onboarded = true`
- Redirect to `/` (home)

Follow the pattern from `src/components/trips/trip-wizard.tsx` — useState for current step, smooth transitions.

- [ ] **Step 2: Create onboard page**

Server component at `src/app/onboard/page.tsx`:
- Check if user is authenticated (redirect to `/login` if not)
- Check if user is already onboarded (redirect to `/` if yes)
- Render `<OnboardWizard />`

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/onboard-wizard.tsx src/app/onboard/page.tsx
git commit -m "feat: add onboarding wizard page"
```

---

### Task 5: Middleware — Redirect First-Time Users

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Update middleware**

After existing auth check, for authenticated users:
- Fetch profile from Supabase
- If `onboarded` is `false` or `null`, and current path is NOT `/onboard`, `/login`, `/register`, or API routes → redirect to `/onboard`
- If user is on `/onboard` and already onboarded → redirect to `/`

Important: use `supabase.from('profiles').select('onboarded').eq('id', user.id).single()` — this is a lightweight query.

- [ ] **Step 2: Test the flow**

1. Register a new user → should redirect to `/onboard`
2. Complete onboarding → should redirect to `/`
3. Visit `/onboard` again → should redirect to `/`

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: redirect first-time users to onboarding"
```

---

### Task 6: Progress Helper

**Files:**
- Create: `src/lib/onboarding.ts`

- [ ] **Step 1: Create progress calculation helper**

```typescript
export interface StageProgress {
  id: string
  name: string
  modules: { name: string; href: string; progress: number }[]
  overallProgress: number
}

export async function getUserProgress(supabase: any, userId: string): Promise<StageProgress[]>
```

Calculates progress for each stage:
- **Подножие:** kg_progress count / total nodes (knowledge), knot_progress mastered count / total (knots), training_log count > 0 (training)
- **Базовый лагерь:** user_gear count > 0 (gear), user_route_status count > 0 (routes)
- **Штурмовой лагерь:** trips with status 'completed' count (trips)
- **Вершина:** trips with at least one route with summit_reached = true

Each module progress is 0-100. Stage progress = average of its modules.

- [ ] **Step 2: Commit**

```bash
git add src/lib/onboarding.ts
git commit -m "feat: add user progress calculation helper"
```

---

### Task 7: Progress Dashboard (Home Page)

**Files:**
- Create: `src/components/home/progress-dashboard.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create progress dashboard component**

Client component showing:
- User greeting: "Привет, {display_name}!"
- Current stage card (highlighted, with "Продолжить" button linking to the most relevant module)
- All 4 stages as compact cards with progress bars
- "Мой путь" button to revisit full journey map

Layout: vertical stack on mobile, 2-column on desktop (current stage large on left, other stages stacked on right).

- [ ] **Step 2: Update home page**

Modify `src/app/page.tsx`:
- For authenticated + onboarded users → show `<ProgressDashboard />`
- For authenticated + NOT onboarded → redirect handled by middleware
- For unauthenticated → show current hero + module cards (existing design)

Server component fetches user profile and progress data, passes to client component.

- [ ] **Step 3: Test**

1. Logged out → see hero page with "Начать бесплатно"
2. New user after onboarding → see progress dashboard with current stage
3. User with some progress → see updated progress bars

- [ ] **Step 4: Commit**

```bash
git add src/components/home/progress-dashboard.tsx src/app/page.tsx
git commit -m "feat: transform home page into personal progress dashboard"
```

---

### Task 8: Profile — "My Path" Button

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Add journey map link to profile**

Add a card/button "Мой путь к вершине" that links to `/onboard?view=true` (journey map in read-only mode with current progress).

Also display current `experience_level` as a badge.

- [ ] **Step 2: Update onboard page to support view mode**

When URL has `?view=true`, show journey map with real progress data and no "complete" action. Add "Изменить уровень" (change level) option.

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/page.tsx src/app/onboard/page.tsx
git commit -m "feat: add My Path button to profile page"
```
