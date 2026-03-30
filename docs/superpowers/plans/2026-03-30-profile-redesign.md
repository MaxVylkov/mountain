# Profile Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/profile` to have clear visual hierarchy, a unified identity header, safe destructive actions, and a skeleton loader.

**Architecture:** Single-file rewrite of `src/app/profile/page.tsx`. No new files created. All data-fetching and handler logic is preserved as-is; only state additions (`isLoading`, `confirmDeleteId`, `actionInFlightId`) and JSX structure change.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase client, Tailwind CSS, Lucide icons, Vitest + @testing-library/react

---

## File Map

| File | Change |
|------|--------|
| `src/app/profile/page.tsx` | Full JSX rewrite + 3 new state vars. Logic untouched. |

---

### Task 1: Add skeleton loader — replace blank flash on load

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Add `isLoading` state**

Inside `ProfilePage`, after the existing `useState` declarations, add:

```tsx
const [isLoading, setIsLoading] = useState(true)
```

- [ ] **Step 2: Set `isLoading = false` at the right moment**

In the `useEffect`, after `setProfile(prof ?? null)` and **before** the friends query, add:

```tsx
setIsLoading(false)
```

The full sequence in the effect becomes:
```tsx
setUser(data.user)

const { data: prof } = await supabase
  .from('profiles')
  .select('experience_level, invite_token')
  .eq('id', data.user.id)
  .single()
setProfile(prof ?? null)
setIsLoading(false)   // ← add here

const { data: fs } = await supabase
  .from('friendships')
  // ... rest unchanged
```

- [ ] **Step 3: Replace `if (!user) return null` with skeleton**

Delete the line:
```tsx
if (!user) return null
```

Replace with:
```tsx
if (isLoading) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-mountain-surface animate-pulse" />
        <div className="h-4 w-32 rounded-lg bg-mountain-surface animate-pulse" />
      </div>
      <div className="h-24 rounded-xl bg-mountain-surface animate-pulse" />
      <div className="h-24 rounded-xl bg-mountain-surface animate-pulse" />
      <div className="h-24 rounded-xl bg-mountain-surface animate-pulse" />
    </div>
  )
}
```

- [ ] **Step 4: Verify**

Open `/profile` in browser. On load, three pulsing placeholder blocks should appear briefly before the real content.

- [ ] **Step 5: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat(profile): skeleton loader replaces blank flash"
```

---

### Task 2: Redesign header — unified identity + account block

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Replace the existing header `<div>` block**

Find and replace the current header block (lines ~156–165):
```tsx
<div>
  <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-2">Профиль</p>
  <h1 className="text-3xl font-bold">{user.user_metadata?.display_name || 'Альпинист'}</h1>
  {level && (
    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-mountain-primary/20 text-mountain-primary">
      {levelLabels[level]}
    </span>
  )}
</div>
```

Replace with:
```tsx
<div className="flex items-start justify-between gap-4">
  <div>
    <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-2">Профиль</p>
    <h1 className="text-3xl font-bold">{user.user_metadata?.display_name || 'Альпинист'}</h1>
    <div className="flex items-center gap-2 mt-1">
      {level && (
        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-mountain-primary/20 text-mountain-primary">
          {levelLabels[level]}
        </span>
      )}
      <p className="text-sm text-mountain-muted">{user.email}</p>
    </div>
  </div>
  <Button variant="outline" onClick={handleLogout} className="shrink-0 mt-1">
    Выйти
  </Button>
</div>
```

- [ ] **Step 2: Delete the Account card**

Find and delete this block near the bottom of the JSX (currently renders email + logout button):
```tsx
{/* Account */}
<Card className="space-y-3">
  <p className="text-sm text-mountain-muted">{user.email}</p>
  <Button variant="outline" onClick={handleLogout}>Выйти</Button>
</Card>
```

- [ ] **Step 3: Verify**

The header should now show name, level badge (if set), and email on the left; the «Выйти» button on the right. No Account card at the bottom.

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat(profile): unified identity header, remove Account card"
```

---

### Task 3: Find friend card — new title, larger input, hint text

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Update card title**

Find:
```tsx
<h2 className="font-semibold">Найти по email</h2>
```
Replace with:
```tsx
<h2 className="font-semibold">Найти альпиниста</h2>
```

- [ ] **Step 2: Update input placeholder and padding**

Find the `<input>` inside the search card. Change:
- `py-2.5` → `py-3`
- `placeholder="Введи email (мин. 3 символа)..."` → `placeholder="Email или имя..."`

- [ ] **Step 3: Add hint text below input**

After the `</div>` that wraps the input and clear button, add:
```tsx
{searchQuery.length < 3 && (
  <p className="text-xs text-mountain-muted">Введите минимум 3 символа</p>
)}
```

- [ ] **Step 4: Verify**

- Hint text visible when input is empty
- Hint disappears once 3+ characters are typed
- Search fires as before at 3+ characters

- [ ] **Step 5: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat(profile): search card — new title, larger input, hint text"
```

---

### Task 4: Invite link card — compact layout, hide when no token

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Remove description paragraph**

Find and delete:
```tsx
<p className="text-sm text-mountain-muted">Поделись ссылкой — другой пользователь добавит тебя в друзья</p>
```

- [ ] **Step 2: Hide entire card when no token**

Wrap the invite card's outer `<Card>` with a conditional. Change:

```tsx
{/* Invite link */}
<Card className="space-y-3">
```

to:

```tsx
{/* Invite link */}
{profile?.invite_token && (
<Card className="space-y-3">
```

And close the conditional after the `</Card>`:
```tsx
</Card>
)}
```

- [ ] **Step 3: Remove the fallback `<p>` for missing token**

Delete:
```tsx
) : (
  <p className="text-xs text-mountain-muted">Ссылка недоступна — требуется миграция БД 016</p>
)}
```

Since the card is now hidden when there's no token, only the "token exists" branch remains. The ternary becomes a direct render:
```tsx
<div className="flex items-center gap-2">
  <code className="flex-1 min-w-0 truncate text-xs bg-mountain-bg px-3 py-2 rounded-lg text-mountain-muted border border-mountain-border">
    {`${window.location.origin}/invite/${profile.invite_token}`}
  </code>
  <Button variant="outline" onClick={handleCopyInvite} className="shrink-0">
    {copied ? (
      <><Check size={14} className="mr-1 text-mountain-success" /><span className="text-xs">Скопировано</span></>
    ) : (
      <><Copy size={14} className="mr-1" /><span className="text-xs">Скопировать</span></>
    )}
  </Button>
</div>
```

- [ ] **Step 4: Verify**

If `invite_token` is null/undefined, the entire invite section is invisible (no error message, no card). If token exists, card shows title + inline row.

- [ ] **Step 5: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat(profile): invite card compact, hidden when no token"
```

---

### Task 5: Friend requests card — disabled state during async actions

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Add `actionInFlightId` state**

After existing state declarations, add:
```tsx
const [actionInFlightId, setActionInFlightId] = useState<string | null>(null)
```

- [ ] **Step 2: Wrap `handleAccept` with in-flight guard**

Replace:
```tsx
async function handleAccept(friendshipId: string) {
  const supabase = createClient()
  await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
  setFriends(prev => prev.map(f => f.id === friendshipId ? { ...f, status: 'accepted' } : f))
}
```

With:
```tsx
async function handleAccept(friendshipId: string) {
  setActionInFlightId(friendshipId)
  try {
    const supabase = createClient()
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    setFriends(prev => prev.map(f => f.id === friendshipId ? { ...f, status: 'accepted' } : f))
  } finally {
    setActionInFlightId(null)
  }
}
```

- [ ] **Step 3: Wrap `handleRemove` with in-flight guard (for decline)**

Replace:
```tsx
async function handleRemove(friendshipId: string) {
  const supabase = createClient()
  await supabase.from('friendships').delete().eq('id', friendshipId)
  setFriends(prev => prev.filter(f => f.id !== friendshipId))
}
```

With:
```tsx
async function handleRemove(friendshipId: string) {
  setActionInFlightId(friendshipId)
  try {
    const supabase = createClient()
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setFriends(prev => prev.filter(f => f.id !== friendshipId))
  } finally {
    setActionInFlightId(null)
  }
}
```

- [ ] **Step 4: Add `disabled` prop to request buttons**

Find the buttons in the incoming requests card:
```tsx
<Button onClick={() => handleAccept(f.id)} className="text-xs px-3 py-1.5 h-auto">Принять</Button>
<Button variant="outline" onClick={() => handleRemove(f.id)} className="text-xs px-3 py-1.5 h-auto">Отклонить</Button>
```

Add `disabled={actionInFlightId === f.id}` to both:
```tsx
<Button
  onClick={() => handleAccept(f.id)}
  disabled={actionInFlightId === f.id}
  className="text-xs px-3 py-1.5 h-auto"
>Принять</Button>
<Button
  variant="outline"
  onClick={() => handleRemove(f.id)}
  disabled={actionInFlightId === f.id}
  className="text-xs px-3 py-1.5 h-auto"
>Отклонить</Button>
```

- [ ] **Step 5: Verify**

Click «Принять» or «Отклонить» — both buttons on that row should dim and become unclickable during the async call.

- [ ] **Step 6: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat(profile): friend request buttons disabled during async action"
```

---

### Task 6: Friends card — inline delete confirm + new empty state

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Add `confirmDeleteId` state**

```tsx
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
```

- [ ] **Step 2: Replace the friends list render with inline confirm**

Find the accepted friends list inside the Friends card:
```tsx
{accepted.map(f => (
  <div key={f.id} className="flex items-center justify-between gap-3">
    <span className="text-sm">{f.other?.display_name || 'Пользователь'}</span>
    <button onClick={() => handleRemove(f.id)} className="text-xs text-mountain-muted hover:text-mountain-danger transition-colors">
      Удалить
    </button>
  </div>
))}
```

Replace with:
```tsx
{accepted.map(f => (
  <div key={f.id} className="flex items-center justify-between gap-3">
    <span className="text-sm">{f.other?.display_name || 'Пользователь'}</span>
    {confirmDeleteId === f.id ? (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-mountain-muted">Удалить?</span>
        <button
          onClick={() => { handleRemove(f.id); setConfirmDeleteId(null) }}
          className="text-mountain-danger hover:underline font-medium"
        >
          Да
        </button>
        <button
          onClick={() => setConfirmDeleteId(null)}
          className="text-mountain-muted hover:text-mountain-text"
        >
          Отмена
        </button>
      </div>
    ) : (
      <button
        onClick={() => setConfirmDeleteId(f.id)}
        className="text-xs text-mountain-muted hover:text-mountain-danger transition-colors"
      >
        Удалить
      </button>
    )}
  </div>
))}
```

- [ ] **Step 3: Update empty state text**

Find:
```tsx
<p className="text-sm text-mountain-muted">Пока нет друзей. Найди по email или поделись ссылкой.</p>
```

Replace with:
```tsx
<p className="text-sm text-mountain-muted">Найдите коллег по email или поделитесь ссылкой-приглашением.</p>
```

- [ ] **Step 4: Verify**

- No friends: new empty state text appears
- Click «Удалить» next to a friend: inline «Удалить? Да Отмена» appears
- Click «Отмена»: reverts to «Удалить» button
- Click «Да»: friend is removed

- [ ] **Step 5: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat(profile): inline confirm for delete friend, new empty state copy"
```

---

### Task 7: Remove journey link block

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Delete the journey link**

Find and delete the entire block at the bottom of the JSX:
```tsx
<Link href="/onboard?view=true">
  <div className="bg-mountain-surface border border-mountain-border rounded-xl p-4 hover:border-mountain-primary transition-colors flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Mountain size={24} className="text-mountain-primary" />
      <span className="font-medium">Мой путь к вершине</span>
    </div>
    <ChevronRight size={20} className="text-mountain-muted" />
  </div>
</Link>
```

- [ ] **Step 2: Remove unused imports**

After deleting the block, check if `Mountain` and `ChevronRight` are used elsewhere in the file. If not, remove them from the import:

```tsx
// Before:
import { Mountain, ChevronRight, Copy, Check, Users, UserCheck, Clock, Search, UserPlus, X } from 'lucide-react'

// After (remove Mountain and ChevronRight if unused):
import { Copy, Check, Users, UserCheck, Clock, Search, UserPlus, X } from 'lucide-react'
```

- [ ] **Step 3: Verify**

The journey link block no longer appears at the bottom of the profile page.

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat(profile): remove journey link section (deferred)"
```

---

### Task 8: Final wiring check and cleanup

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Check `profile` type still satisfies invite section**

Since the invite card now renders only when `profile?.invite_token` is truthy and uses `profile.invite_token` directly (not inside a ternary), make sure TypeScript is happy. The `profile` state type is already `{ experience_level: string | null; invite_token: string | null } | null` — no changes needed, but verify no TS errors:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run existing tests**

```bash
npm test
```

Expected: all existing tests pass. The profile page itself has no unit tests — that is acceptable; the component uses Supabase auth which requires integration testing.

- [ ] **Step 3: Quick visual check list**

Open `/profile` in browser and verify:

| Check | Expected |
|-------|----------|
| Initial load | Skeleton pulse animation, not blank |
| Header | Name large, level badge + email small, Выйти button right-aligned |
| No invite token | Invite section completely absent |
| With invite token | Compact card: title + one-line code + copy button |
| Search input | Larger padding, «Email или имя...» placeholder |
| Search hint | Visible at 0–2 chars, hidden at 3+ |
| Friends empty | «Найдите коллег по email...» |
| Delete friend | Click → inline confirm → Да/Отмена |
| No Account card | Bottom of page has no email/logout card |
| No journey link | No «Мой путь к вершине» at bottom |

- [ ] **Step 4: Final commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat(profile): complete redesign — hierarchy, skeleton, safe deletes, clean microcopy"
```
