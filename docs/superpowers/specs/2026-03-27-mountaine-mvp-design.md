# Mountaine MVP — Design Specification

## Overview

Mountaine — веб-приложение для альпинистов, помогающее подготовиться к восхождениям, тренироваться и учиться. Фокус на новичков в горном туризме и техническом альпинизме, с перспективой расширения для опытных альпинистов.

**Стратегия:** веб-сайт (MVP) → мобильное приложение (будущее).

## Target Audience

- **Основная:** новички в альпинизме — люди, которые хотят начать ходить в горы, но не знают с чего начать
- **Вторичная:** опытные альпинисты (про-фичи добавляются позже)
- **Тип альпинизма:** горный туризм / треккинг + технический альпинизм

## Core Problems Solved

1. "Не знаю, с чего начать" — структурированный путь от нуля до первого восхождения
2. "Не знаю, готов ли я" — оценка физической формы и готовности к конкретной горе
3. "На маршруте страшно и непонятно" — (будущая фаза, не в MVP)

## Tech Stack

- **Frontend:** Next.js (React) + TypeScript
- **Styling:** Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage)
- **Deploy:** Vercel (frontend) + Supabase (backend)
- **Key libraries:**
  - React Flow — визуальный граф знаний
  - dnd-kit — drag-and-drop для кладовки и сборов
  - Framer Motion — анимации (обучение узлам)
  - Lucide Icons — иконки

## Architecture

Монолит на Next.js с Supabase как BaaS.

```
┌─────────────────────────────────────┐
│           Next.js App               │
│                                     │
│  ┌──────────┐  ┌──────────────────┐ │
│  │  Pages    │  │   Components     │ │
│  │  (SSR/SSG)│  │  (граф, кладовка,│ │
│  │           │  │   узлы, горы)    │ │
│  └──────────┘  └──────────────────┘ │
│         │              │            │
│         └──────┬───────┘            │
│                │                    │
│       Supabase Client               │
└────────────────┬────────────────────┘
                 │
       ┌─────────▼──────────┐
       │     Supabase        │
       │  ┌───────────────┐  │
       │  │  PostgreSQL    │  │ ← горы, снаряжение, прогресс
       │  │  Auth          │  │ ← регистрация/логин
       │  │  Storage       │  │ ← фото снаряжения, PDF
       │  └───────────────┘  │
       └─────────────────────┘
```

## Data Model

**Conventions:**
- All tables include `id` (uuid, PK), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, auto-updated via trigger)
- Category fields use PostgreSQL CHECK constraints to enforce allowed values
- Timestamps omitted from tables below for brevity but present on all

### Profiles (application user data)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK, FK → auth.users |
| display_name | text | Отображаемое имя |
| avatar_url | text | Аватар |
| experience_level | text | CHECK (beginner / intermediate / advanced) |

### Mountains
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| name | text | Название горы |
| country | text | Страна |
| region | text | Регион |
| height | integer | Высота в метрах |
| latitude | decimal | Широта |
| longitude | decimal | Долгота |
| description | text | Описание |
| image_url | text | Фото |
| difficulty | integer | CHECK (1-5) |

### Routes
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| mountain_id | uuid | FK → Mountains |
| name | text | Название маршрута |
| difficulty | integer (1-5) | Сложность |
| duration_days | integer | Длительность |
| description | text | Описание |
| season | text | Рекомендуемый сезон |

### Gear (каталог снаряжения)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| name | text | Название |
| category | text | CHECK (ropes/hardware/clothing/footwear/bivouac/electronics/other) |
| description | text | Описание |
| image_url | text | Изображение |
| weight | integer | Вес в граммах |

### User_Gear (инвентарь пользователя)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → Profiles |
| gear_id | uuid | FK → Gear |
| condition | text | CHECK (new/good/worn/needs_repair) |
| notes | text | Заметки |
| photo_url | text | Фото |

### Route_Gear (снаряжение для маршрута)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| route_id | uuid | FK → Routes |
| gear_id | uuid | FK → Gear |
| required | boolean | Обязательное / рекомендуемое |

### Packing_Sets (наборы сборов)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → Profiles |
| route_id | uuid | FK → Routes (nullable) |
| name | text | Название набора |

### Packing_Backpacks (рюкзаки в наборе)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| packing_set_id | uuid | FK → Packing_Sets |
| name | text | Название рюкзака |
| volume_liters | integer | Объём в литрах |

### Packing_Items (вещи в сборах)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| packing_set_id | uuid | FK → Packing_Sets |
| gear_id | uuid | FK → Gear |
| backpack_id | uuid | FK → Packing_Backpacks |
| packed | boolean | Упаковано |

### KG_Nodes (узлы графа знаний)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| title | text | Заголовок |
| content | text | Контент (markdown) |
| category | text | Категория |
| level | integer | Уровень вложенности |
| parent_id | uuid | FK → KG_Nodes (для дерева) |

### KG_Edges (связи графа знаний)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| source_node_id | uuid | FK → KG_Nodes |
| target_node_id | uuid | FK → KG_Nodes |
| relationship_type | text | Тип связи |

### KG_Progress (прогресс по графу)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → Profiles |
| node_id | uuid | FK → KG_Nodes |
| studied | boolean | Изучено |

### Knots (верёвочные узлы)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| name | text | Название |
| difficulty_level | integer | Уровень сложности |
| category | text | Категория |
| description | text | Описание |
| steps_json | jsonb | Шаги завязывания |
| image_url | text | Схема |

### Knot_Progress (прогресс по узлам)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → Profiles |
| knot_id | uuid | FK → Knots |
| status | text | CHECK (locked/available/learning/mastered) |
| score | integer | 0-100, рассчитывается: practice=50, test=100. Mastered при score >= 80 |

### Training_Exercises (упражнения)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| name | text | Название |
| category | text | Категория (кардио/сила/выносливость/специфические) |
| description | text | Описание |
| purpose | text | Для чего нужно |

### Training_Log (лог тренировок)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → Profiles |
| exercise_id | uuid | FK → Training_Exercises |
| completed_at | timestamptz | Дата выполнения |
| duration_min | integer | Длительность в минутах (nullable) |
| sets | integer | Количество подходов (nullable) |
| reps | integer | Количество повторений (nullable) |
| distance_km | decimal | Дистанция в км (nullable) |
| notes | text | Заметки |

## Key Data Access Patterns

**"Am I ready?" query (gear check):**
Compare `Route_Gear` for a selected route against user's `User_Gear` inventory → highlight owned vs. missing gear. This JOIN drives the core value proposition of the gear module.

**Packing weight calculation:**
SUM `Gear.weight` for all `Packing_Items` grouped by `Packing_Backpacks.id` → real-time weight per backpack.

**Knot progression:**
Query `Knot_Progress` for user, ordered by `Knots.difficulty_level` → determine next available knot based on previous mastery.

## MVP Modules

### 1. База гор и маршрутов
- Каталог гор с фильтрацией (регион, сложность, высота)
- Страница горы с описанием + список маршрутов
- Чеклист снаряжения для каждого маршрута
- Связь с кладовкой: подсветка что есть / чего не хватает
- **Данные:** парсинг из открытых источников (Mountain Project, PeakBagger и др.)

### 2. Кладовка снаряжения
**Режим хранения:**
- Категории-полки: верёвки, железо, одежда, обувь, бивуак, электроника, прочее
- Карточка предмета: фото, название, вес, состояние, заметки
- Добавление вручную или выбор из каталога
- Общий вес и статистика по категориям

**Режим сборов:**
- Создание набора (опциональная привязка к маршруту)
- Добавление рюкзаков (название, объём)
- Drag-and-drop вещей из кладовки в рюкзаки
- Вес каждого рюкзака в реальном времени
- Чеклист "упаковано" для каждой вещи

### 3. Граф знаний
- Источник: PDF учебник по альпинизму (конвертация через markitdown → парсинг → граф)
- **Дерево** (левая панель) — оглавление, навигация по главам
- **Визуальный граф** (основная область) — карта связей между темами (React Flow)
- Синхронизация: клик в дереве ↔ фокус в графе
- Контент узла при клике
- Прогресс: отмечаешь "изучено"

### 4. Duolingo для узлов
- Карта уровней (от простых к сложным)
- Каждый узел — 3 этапа:
  1. **Изучение** — схема + пошаговая анимация (SVG + Framer Motion)
  2. **Практика** — повтори по памяти
  3. **Тест** — без подсказок
- Прогресс: locked → available → learning → mastered
- Разблокировка следующего узла после освоения предыдущего
- Схемы узлов: генерация через scientific-schematics (SVG)

### 5. Тренировки
- Список упражнений по категориям
- Описание, рекомендации, назначение каждого упражнения
- Простой трекер выполнения с историей

### 6. Профиль и авторизация
- Регистрация / логин (email + пароль, Supabase Auth)
- Общая статистика прогресса
- Настройки аккаунта
- RLS — каждый видит только свои данные

## Page Structure

```
mountaine.app/
├── /                        ← главная (hero + модули)
├── /login                   ← вход
├── /register                ← регистрация
├── /mountains               ← каталог гор
│   └── /mountains/[id]      ← страница горы + маршруты
├── /gear                    ← кладовка (режим хранения)
│   └── /gear/packing/[id]   ← режим сборов
├── /knowledge               ← граф знаний (дерево + граф)
│   └── /knowledge/[nodeId]  ← конкретная тема
├── /knots                   ← Duolingo узлов (карта уровней)
│   └── /knots/[id]/learn    ← урок по конкретному узлу
├── /training                ← список тренировок + трекер
└── /profile                 ← профиль + настройки
```

## Access Control

- **Без авторизации:** база гор, граф знаний (read-only), первые 3 узла в Duolingo
- **С авторизацией:** кладовка, сборы, полный Duolingo, трекер тренировок, прогресс

## Row Level Security (RLS)

**Public read (anon + authenticated):**
- Mountains, Routes, Gear, Route_Gear, KG_Nodes, KG_Edges, Knots, Training_Exercises

**User-scoped (authenticated, user_id = auth.uid()):**
- Profiles — read/update own only
- User_Gear — CRUD own only
- Packing_Sets, Packing_Backpacks, Packing_Items — CRUD own only (via packing_set.user_id)
- KG_Progress — CRUD own only
- Knot_Progress — CRUD own only
- Training_Log — CRUD own only

**Admin-only (via service role key, not exposed to client):**
- INSERT/UPDATE/DELETE on public catalog tables (Mountains, Routes, Gear, Knots, etc.)

## Data Fetching Strategy

| Page | Rendering | Why |
|------|-----------|-----|
| `/mountains` | SSG + ISR (revalidate 24h) | Catalog data changes rarely, SEO important |
| `/mountains/[id]` | SSG + ISR | Same — static with periodic refresh |
| `/knowledge` | SSG | Graph structure is static seed data |
| `/knots` | SSG | Knot catalog is static |
| `/gear` | CSR (client-side) | User-specific data, no SEO value |
| `/gear/packing/[id]` | CSR | User-specific, real-time drag-and-drop |
| `/training` | CSR | User-specific |
| `/knots/[id]/learn` | CSR | Interactive, user progress tracking |
| `/profile` | CSR | User-specific |
| `/`, `/login`, `/register` | SSG | Static pages |

**Client-side data:** Supabase JS client in browser, real-time subscriptions where needed (packing).
**Server-side data:** Supabase server client in Next.js server components / `getStaticProps` for catalog pages.

## Design System — "Горная ночь"

### Colors
| Role | Value | Usage |
|------|-------|-------|
| Background | `#0F1923` | Основной фон |
| Surface | `#1A2735` | Карточки, панели |
| Primary | `#3B82F6` | Кнопки, ссылки, акценты |
| Accent | `#F59E0B` | Прогресс, достижения |
| Success | `#10B981` | "Есть", "Освоен" |
| Danger | `#EF4444` | "Не хватает", предупреждения |
| Text primary | `#F1F5F9` | Основной текст |
| Text secondary | `#94A3B8` | Второстепенный текст |

### Typography
- Заголовки и текст: **Inter**
- Данные (высота, вес): **JetBrains Mono**

### Components Style
- Карточки с `backdrop-blur` и полупрозрачным фоном (glassmorphism)
- `rounded-xl` скругления
- Тонкие бордеры `border-slate-700`
- Hover с мягким свечением
- Иконки: Lucide Icons

### Mood
Тёмный, спокойный интерфейс. Чувство высоты и простора. Янтарные акценты как свет костра.

## Technical Decisions

### PDF → Knowledge Graph
1. Конвертация PDF → Markdown (markitdown)
2. Парсинг по главам/разделам → KG_Nodes
3. Анализ перекрёстных ссылок → KG_Edges
4. Seed в Supabase

### Mountain Data
- Парсинг открытых источников через parallel-web
- Нормализация и загрузка в БД

### Knot Diagrams
- Генерация SVG через scientific-schematics
- Анимации шагов: CSS/Framer Motion по steps_json

### Monetization
- MVP полностью бесплатный
- Архитектура позволяет добавить freemium позже (роли в Supabase Auth)

## Future (Post-MVP)
- Функционал "на маршруте" (погода, акклиматизация, безопасность)
- Мобильное приложение (React Native, переиспользование Supabase API)
- Синхронизация с фитнес-трекерами
- Про-фичи для опытных альпинистов
- Социальные функции (отчёты о восхождениях, сообщество)
