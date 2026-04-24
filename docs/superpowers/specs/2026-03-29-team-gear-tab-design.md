# Team Gear Tab — Design Spec
**Date:** 2026-03-29
**Status:** Revised after review

---

## Problem

The current team gear tab has three issues:
1. The matrix table layout is broken (sticky columns render incorrectly, duplicate elements appear)
2. It does not scale — with 6+ members, horizontal columns become unreadable
3. There is no clear UX flow for the leader to define required gear or for members to submit their own gear

---

## Solution Overview

Replace the existing `TeamGearMatrix` component with a three-part design:

1. **Gear picker modal** — shared flow for leader and members
2. **Summary view (Сводка)** — collapsible rows table
3. **Cards view (Карточки)** — per-member cards grid

Views toggled with a persistent switch. Database schema (migration 010) is already in place.

**Note:** The old `team_gear` table (migration 009) and `TeamGear` component are being abandoned. The table remains in the database but will be unused. The new design uses `team_required_gear` + `team_member_gear` (migration 010) exclusively.

---

## 1. Gear Picker Modal (`GearPickerModal`)

A shared modal opened by both the leader and members.

**Triggered by:**
- Leader: "Задать список обязательного снаряжения" (first time) / "Изменить список" (if list exists)
- Member: "Добавить моё снаряжение"

**Modal UI — two sections:**

```
Мои сборки
  ├── Вся моя кладовка          ~18 кг   (all user_gear items)
  └── [each packing_set]        N предметов

Шаблоны по уровню
  ├── Лёгкий треккинг           ~8 кг
  ├── НП (начальная подготовка) ~15 кг
  ├── СП-3                      ~18 кг
  └── СП-2 и выше               ~22 кг

[Импорт из Excel]
```

### 1a. Leader mode (`mode: 'leader'`)

**When leader picks a level template (НП, СП-3, etc.):**
- Source of truth for item names + norms: the `STANDARD_TEMPLATE` constant in `team-gear-matrix.tsx`, extended with a `levels` field
- The `gear_templates` Supabase table contains NO norm data — do NOT use it
- Each entry in STANDARD_TEMPLATE gains a `levels: string[]` field indicating which levels it belongs to:
  - `'light_trek'` — Лёгкий треккинг (clothing, personal items, trekking poles, light bivouac)
  - `'np'` — НП adds helmet, harness, belay device, carabiners, ropes, basic hardware
  - `'sp3'` — СП-3 adds crampons, ice axe, ice screws, more hardware
  - `'sp2'` — СП-2 и выше adds ice tools, full rack (cams, nuts), ITO gear
- Levels are cumulative: picking "СП-3" inserts items where `levels` includes `'light_trek'`, `'np'`, or `'sp3'`
- Filter logic: `STANDARD_TEMPLATE.filter(item => LEVEL_ORDER[selected] >= LEVEL_ORDER[item.minLevel])`
  where `LEVEL_ORDER = { light_trek: 0, np: 1, sp3: 2, sp2: 3 }` and each item has a `minLevel` field
- Items are inserted as `team_required_gear` rows with their predefined norms

**When leader picks a packing set ("Свой набор" / "Вся моя кладовка"):**
- Insert each gear item name as a `team_required_gear` row with `norm_per_person = null`, `norm_per_team = null`
- Leader can then edit norms manually inline in the table

**When leader imports from Excel:**
- Expected columns: `name`, `section`, `norm_per_person`, `norm_per_team`
- Parse client-side using `xlsx` library
- A downloadable blank template is provided via a link in the modal

**Updating an existing list (leader clicks "Изменить список"):**
- Strategy: **merge** — new items are added, items already present (matched by name, case-insensitive) are kept, existing items NOT in the new selection are removed
- Before confirm: show a diff with item names — "Будет добавлено: [item1, item2...], удалено: [item3, item4...]"
- Warn explicitly: "Удалённые позиции потеряют данные всех участников"
- Leader confirms before applying; partial selection is not supported

### 1b. Member mode (`mode: 'member'`)

**When member picks a packing set / closet:**
- Match packing set item names to `team_required_gear` names (case-insensitive)
- For each match: upsert `team_member_gear` with `quantity = 1` (if not already set)
- After import: show summary — "Совпало: X из Y требований. Не найдено: [item1, item2, ...]"
- Unmatched items are silently skipped (member can fill manually in the table)

**When member imports from Excel:**
- Expected columns: `name`, `quantity`
- Match to `team_required_gear` by name, upsert quantities

**Norms are not set in member mode** — only the leader sets norms.

---

## 2. Summary View — Сводка (`GearSvodkaView`)

Default view. A table with no horizontal scroll.

**Columns:** Снаряжение | В наличии | Норма | Необходимо | Добрать

**Rows:** Grouped by section header. Each row is expandable.

**Expanded row — personal items** (`norm_per_person` set):
```
└ Максим: 1 · Иван: 1 · Катя: 0
```

**Expanded row — group items** (`norm_per_team` set):
```
└ Всего у отделения: 2  (Максим: 1, Иван: 1)
```

**Добрать column colour coding:**
- `✓` green — deficit = 0
- `+N` red — deficit > 0 (shortage)
- `-N` amber — deficit < 0 (excess)
- `—` muted — no norm set

**Empty state (leader not set up list yet):**
- For leaders: "Список снаряжения не составлен. Нажмите «Задать список»."
- For members: "Руководитель ещё не составил список снаряжения."

---

## 3. Cards View — Карточки (`GearKartochkiView`)

Secondary view. Responsive grid of member cards.

**Each card shows:**
- Member name header (current user's card is first, with accent border)
- List of required gear items with the member's quantity
- Items with `quantity = 0` and `norm > 0`: shown in red with ⚠
- Footer completion badge

**Completion badge formula (purely per-member):**
```
numerator   = count of required items where THIS member's quantity > 0
denominator = total count of team_required_gear for this team
display     = "14 / 15 ✓" (green) or "10 / 15 ⚠" (amber)
```

Group items are included in the denominator and counted per-member just like personal items — if a member personally has quantity > 0, it counts toward their numerator. Group item rows in the card are visually marked with an "Общее" badge but the badge formula is consistent for all items.

**Layout:** 1 column mobile / 2 columns tablet / 3 columns desktop.

---

## 4. Toggle

Two-button switch in the toolbar:
```
[≡ Сводка]  [▦ Карточки]
```

Persistence: `localStorage` key = `mountaine_team_gear_view_${teamId}`

Default: Сводка

---

## 5. Toolbar Layout

```
[Задать список*]   [Добавить моё снаряжение]        [≡ Сводка | ▦ Карточки]
```

*Leader only. Becomes "Изменить список" once `team_required_gear` has rows for this team.

---

## 6. Data Flow

```
GearPickerModal (leader, template)
  → reads STANDARD_TEMPLATE constant (norms included)
  → inserts/merges team_required_gear rows

GearPickerModal (leader, packing set)
  → reads user packing_set → gear names
  → inserts team_required_gear rows (norms = null)

GearPickerModal (member, packing set)
  → reads packing_items → gear(name) for the selected set
  → matches by name to team_required_gear (case-insensitive)
  → upserts team_member_gear (quantity = 1 per match)
  → shows match summary

GearPickerModal (member, "Вся моя кладовка")
  → reads user_gear JOIN gear(name) for current user
  → same matching + upsert logic as packing set path

GearSvodkaView / GearKartochkiView
  → read team_required_gear + team_member_gear
  → compute totals, deficit client-side
  → no Supabase Realtime (future)
```

---

## 7. Components

| File | Action |
|------|--------|
| `src/components/teams/team-gear-tab.tsx` | Create — container with toggle + toolbar |
| `src/components/teams/gear-picker-modal.tsx` | Create — gear selection modal |
| `src/components/teams/gear-svodka-view.tsx` | Create — summary table |
| `src/components/teams/gear-kartochki-view.tsx` | Create — cards grid |
| `src/components/teams/team-gear-matrix.tsx` | Delete — replaced |
| `src/components/teams/team-gear.tsx` | Delete — replaced (team_gear table abandoned) |
| `src/components/teams/team-detail.tsx` | Modify — use TeamGearTab, pass isLeader |

---

## 8. Database

Migration `010_team_gear_matrix.sql` already written. Apply via Supabase SQL Editor.

Tables:
- `team_required_gear` — leader's required list (name, section, norm_per_person, norm_per_team)
- `team_member_gear` — per-member quantities (required_gear_id, user_id, quantity)
- `team_gear` — from migration 009, ABANDONED (kept in DB, unused)

---

## 9. Known Limitations

- Name matching (packing set → required gear) is case-insensitive exact match only. Partial/fuzzy matching is out of scope.
- Excel import requires user to use the provided column template.
- No real-time sync — page refresh required to see other members' updates.

---

## Out of Scope

- Realtime Supabase subscriptions
- Drag-and-drop reordering
- Weight calculations per member
- Fuzzy name matching for gear import
