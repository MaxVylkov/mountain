# Путь пользователя: дыры и план реализации

## Реальный путь альпиниста

```
Решил ехать → Выбрал район/лагерь → Собрал команду → Сборы (снаряжение + раскладка)
→ Приехал в лагерь → Акклиматизация, лекции, скалы → Выбрал маршрут → Выход
→ Вернулся → Отчёт
```

Ключевое: маршрут выбирается НА МЕСТЕ, не заранее. Район + альплагерь = точка входа.

---

## Блок 1: Приглашения + Альплагеря + Поездка→Район

### 1.1 Inbox приглашений в отделения

**Проблема:** Участник узнаёт о приглашении только через мессенджер. Нет pending-состояния в приложении.

**Решение:**
- Новая таблица `team_invites`:
  ```sql
  CREATE TABLE team_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES teams ON DELETE CASCADE NOT NULL,
    inviter_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
    invitee_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
    status text CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    UNIQUE(team_id, invitee_id)
  );
  ```
- Лидер приглашает по имени/email (поиск как в друзьях)
- Блок «Приглашения в отделения» в профиле (`/profile`):
  - Название отделения, кто пригласил
  - Кнопки «Принять» / «Отклонить»
- При принятии — insert в `team_members`, update invite status
- Ссылочный invite (`/teams/join/[token]`) остаётся как альтернатива

**Файлы:**
- `supabase/migrations/0XX_team_invites.sql`
- `src/components/profile/team-invites.tsx` — блок в профиле
- `src/components/teams/team-members.tsx` — добавить кнопку «Пригласить по имени»
- `src/app/profile/page.tsx` — подключить блок

### 1.2 Сущность «Альплагерь»

**Проблема:** Нет информации о лагерях.

**Решение:**
- Новая таблица `alpine_camps`:
  ```sql
  CREATE TABLE alpine_camps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    region text NOT NULL,           -- совпадает с mountains.region
    description text,               -- как добраться, сезон, инфраструктура
    rock_lab text,                  -- описание скальной лаборатории
    website text,
    phone text,
    email text,
    latitude double precision,
    longitude double precision,
    season_start smallint,          -- месяц начала сезона (6 = июнь)
    season_end smallint,            -- месяц конца сезона (9 = сентябрь)
    created_at timestamptz DEFAULT now()
  );
  ```
- Seed данные: Уллу-Тау, Узункол, Безенги, Алибек, Дигория (основные)
- Страница каталога `/camps` — список лагерей
- Карточка лагеря `/camps/[id]`:
  - Контакты, описание, скальная лаборатория
  - Маршруты района (из существующих `mountains` с тем же `region`)
  - Погода (привязка к координатам)

**Файлы:**
- `supabase/migrations/0XX_alpine_camps.sql`
- `supabase/seed/0XX_alpine_camps.sql`
- `src/app/camps/page.tsx`
- `src/app/camps/[id]/page.tsx`
- `src/components/camps/camp-card.tsx`
- `src/components/camps/camp-detail.tsx`

### 1.3 Поездка привязана к району, не к горе

**Проблема:** При создании поездки выбирается конкретная гора. В реальности выбирается район.

**Решение:**
- Изменить таблицу `trips`:
  ```sql
  ALTER TABLE trips ADD COLUMN region text;
  ALTER TABLE trips ADD COLUMN camp_id uuid REFERENCES alpine_camps ON DELETE SET NULL;
  -- mountain_id остаётся, но становится необязательным
  ```
- При создании поездки: выбор района (обязательно) + альплагерь (опционально)
- Маршруты добавляются позже через `trip_routes` (many-to-many):
  ```sql
  CREATE TABLE trip_routes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid REFERENCES trips ON DELETE CASCADE NOT NULL,
    route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
    completed boolean DEFAULT false,
    completed_at timestamptz,
    notes text,                     -- комментарий к восхождению
    UNIQUE(trip_id, route_id)
  );
  ```

**Файлы:**
- `supabase/migrations/0XX_trips_region.sql`
- `src/components/trips/trip-form.tsx` — переделать форму создания
- `src/components/trips/trip-routes.tsx` — новый компонент: добавление маршрутов в поездку
- `src/app/trips/[id]/page.tsx` — показать маршруты поездки

---

## Блок 2: Жизнь в лагере и после маршрута

### 2.1 Заметки в Графе знаний

**Проблема:** Поле `notes` в `kg_progress` есть, но нет UI. На лекциях некуда записать.

**Решение:**
- В узле KG: кнопка «Добавить заметку» → textarea → сохранение в `kg_progress.notes`
- Страница «Мои заметки» `/knowledge/notes` — все заметки пользователя, сгруппированные по главам
- Кнопка «Поделиться на форуме» → создаёт пост с предзаполненной ссылкой на узел KG

**Файлы:**
- `src/components/knowledge/node-notes.tsx`
- `src/app/knowledge/notes/page.tsx`
- Модификация `src/components/knowledge/knowledge-graph.tsx` — добавить UI заметок

### 2.2 Статус `in_camp` в поездке

**Проблема:** Нет фазы пребывания в лагере.

**Решение:**
- Добавить статус `in_camp` в enum поездки: `planning → packing → in_camp → active → completed`
- В фазе `in_camp` показывать:
  - Карточку альплагеря (если привязан)
  - Маршруты района
  - Погоду
  - Кнопку «Добавить маршрут»

**Файлы:**
- `supabase/migrations/0XX_trip_in_camp.sql` — обновить CHECK constraint
- `src/lib/dashboard-data.ts` — обновить `getTripStatusLabel`
- `src/components/trips/trip-detail.tsx` — UI для фазы in_camp

### 2.3 Отчёт после маршрута

**Проблема:** После восхождения — только галочка `completed`.

**Решение:**
- При отметке маршрута как пройденного в `trip_routes`:
  - Дата восхождения
  - Условия (опционально): погода, состояние маршрута
  - Комментарий
- Кнопка «Написать отчёт» → открывает форму создания поста на форуме с предзаполненным маршрутом
- В профиле: список пройденных маршрутов с датами

**Файлы:**
- `src/components/trips/route-completion-modal.tsx`
- Модификация форума: предзаполнение маршрута при создании поста

---

## Порядок реализации

### Блок 1 (основной флоу)
1. Миграция `team_invites` + UI в профиле
2. Миграция `alpine_camps` + seed + каталог + карточка
3. Миграция `trips` (region, camp_id) + `trip_routes` + переделка формы поездки
4. Навигация: добавить «Альплагеря» в меню

### Блок 2 (лагерный этап)
5. UI заметок в KG + страница «Мои заметки»
6. Статус `in_camp` + UI фазы
7. Модалка завершения маршрута + связь с форумом
8. Список пройденных маршрутов в профиле

---

## Текущее состояние проекта

### Стек
- Next.js 15, React 19, TypeScript, Tailwind CSS 4
- Supabase (PostgreSQL + Auth) — remote: ceanknanoqnzmbvmecdd.supabase.co
- Framer Motion, Lucide icons, Geologica font

### Реализованные модули
- Дашборд (ResumeCard, TripCard, StreakCard, DailyChallenge)
- Граф знаний (дерево + визуальная карта, прогресс, избранное)
- Узлы (пошаговое изучение, уровни, прогресс)
- Тренировки (программы, упражнения)
- Маршруты (горы по регионам, карта, фильтры want/visited)
- Кладовка (каталог + личное снаряжение)
- Отделения (команды, участники, снаряжение команды)
- Поездки (создание, сборы, чек-лист)
- Раскладка (питание, КБЖУ)
- Форум (категории, посты, ответы, привязка маршрута)
- Ресурсы (ссылки)
- Погода
- Профиль (уровень, друзья, приглашения, документы, путь к вершине)

### Flow-система (только что реализована)
- Flow engine: определение этапа, next-step, мосты между модулями
- NextStepBanner на страницах модулей
- Streak + DailyChallenge + MilestoneToast
- OnboardingGuide с прогрессом
- ProfileJourney (путь к вершине в профиле)

### Что НЕ реализовано
- Альплагеря (блок 1.2)
- Inbox приглашений в отделения (блок 1.1)
- Поездка→район + добавление маршрутов позже (блок 1.3)
- Заметки в KG (блок 2.1)
- Статус in_camp (блок 2.2)
- Отчёт после маршрута (блок 2.3)
- Светлая тема
- Мобильное приложение (Expo, отдельный репозиторий ~/Desktop/mountaine-mobile)
