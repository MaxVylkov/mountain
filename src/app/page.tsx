import Link from 'next/link'
import { ArrowRight, ChevronRight, ClipboardCheck, Map, PackageCheck, Route } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OnboardingGuide } from '@/components/onboarding-guide'
import { ResumeCard } from '@/components/dashboard/resume-card'
import { TripCard } from '@/components/dashboard/trip-card'
import {
  fetchKGStats,
  fetchKnotStats,
  fetchLastActivity,
  fetchActiveTrip,
  fetchGearCount,
  fetchCompletedRoutes,
  fetchStreak,
  getFirstName,
  getLevelLabel,
} from '@/lib/dashboard-data'
import { computeNextSteps } from '@/lib/flow-engine'
import { StreakCard } from '@/components/dashboard/streak-card'
import { DailyChallenge } from '@/components/dashboard/daily-challenge'

// ─── Tool grids ──────────────────────────────────────────────────────────────

const beginnerTools = [
  { href: '/knowledge', label: 'Граф знаний', sub: 'Основы и теория' },
  { href: '/knots', label: 'Узлы', sub: 'Пошаговое изучение' },
  { href: '/training', label: 'Тренировки', sub: 'Физподготовка' },
  { href: '/gear', label: 'Кладовка', sub: 'Учёт снаряжения' },
  { href: '/mountains', label: 'Маршруты', sub: 'КГ, ТС, 1Б–6Б' },
  { href: '/forum', label: 'Форум', sub: 'Вопросы и опыт' },
  { href: '/marketplace', label: 'Барахолка', sub: 'Купить и продать снаряжение' },
]

const expertTools = [
  { href: '/mountains', label: 'Маршруты', sub: 'КГ, ТС, 1Б–6Б' },
  { href: '/teams', label: 'Отделения', sub: 'Состав, снаряжение' },
  { href: '/gear', label: 'Кладовка', sub: 'Учёт и сборы' },
  { href: '/marketplace', label: 'Барахолка', sub: 'Купить и продать снаряжение' },
  { href: '/trips', label: 'Поездки', sub: 'Планирование выхода' },
  { href: '/rations', label: 'Раскладка', sub: 'Питание на маршруте' },
  { href: '/forum', label: 'Форум', sub: 'Вопросы и опыт' },
]

// ─── Landing page tool grid (reused for logged-out visitors) ─────────────────
// Order differs from expertTools intentionally: landing page prioritises Маршруты+Поездки first

const landingExpertTools = [
  { href: '/mountains', label: 'Маршруты', sub: 'КГ, ТС, 1Б–6Б' },
  { href: '/trips', label: 'Поездки', sub: 'Планирование выхода' },
  { href: '/teams', label: 'Отделения', sub: 'Состав, снаряжение' },
  { href: '/gear', label: 'Кладовка', sub: 'Учёт и сборы' },
  { href: '/rations', label: 'Раскладка', sub: 'Питание на маршруте' },
  { href: '/forum', label: 'Форум', sub: 'Вопросы и опыт' },
]

const beginnerLandingSteps = [
  {
    href: '/knowledge',
    step: '01',
    title: 'Граф знаний',
    detail: 'Интерактивная карта альпинистских знаний — от снаряжения до тактики',
    tag: 'Основы',
  },
  {
    href: '/knots',
    step: '02',
    title: 'Узлы',
    detail: 'Пошаговое изучение — от простых к сложным. Практика с проверкой',
    tag: 'Навыки',
  },
  {
    href: '/training',
    step: '03',
    title: 'Тренировки',
    detail: 'Упражнения и рекомендации для физической подготовки к восхождениям',
    tag: 'Подготовка',
  },
]

// Three-tier tool layout: primary (full-width, large) → secondary (2-col, medium) → compact (no subtitle, muted)
function ToolSection({ tools }: { tools: typeof expertTools }) {
  const primary = tools[0]
  const secondary = tools.slice(1, 3)
  const compact = tools.slice(3)

  return (
    <div className="border border-mountain-border rounded-lg overflow-hidden divide-y divide-mountain-border">
      {/* Primary — full width, prominent */}
      <Link
        href={primary.href}
        className="group flex items-center justify-between bg-mountain-surface px-5 py-5 hover:bg-mountain-border/40 transition-colors duration-150"
      >
        <div>
          <div className="text-base font-bold text-mountain-text leading-tight">{primary.label}</div>
          <div className="text-sm text-mountain-muted mt-1">{primary.sub}</div>
        </div>
        <ChevronRight size={16} className="text-mountain-muted group-hover:text-mountain-primary shrink-0 transition-colors" />
      </Link>

      {/* Secondary — 2-column, medium weight */}
      {secondary.length > 0 && (
        <div className="grid grid-cols-2 divide-x divide-mountain-border">
          {secondary.map((tool) => (
            <Link
              key={tool.href + tool.label}
              href={tool.href}
              className="group flex items-start justify-between bg-mountain-surface px-4 py-4 hover:bg-mountain-border/40 transition-colors duration-150"
            >
              <div>
                <div className="text-sm font-semibold text-mountain-text">{tool.label}</div>
                <div className="text-xs text-mountain-muted mt-0.5">{tool.sub}</div>
              </div>
              <ChevronRight size={13} className="text-mountain-border group-hover:text-mountain-primary mt-0.5 shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      )}

      {/* Compact — tight, no subtitle, muted until hover */}
      {compact.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-mountain-border">
          {compact.map((tool) => (
            <Link
              key={tool.href + tool.label}
              href={tool.href}
              className="group flex items-center justify-between bg-mountain-surface px-4 py-3 hover:bg-mountain-border/40 transition-colors duration-150"
            >
              <span className="text-sm font-medium text-mountain-muted group-hover:text-mountain-text transition-colors">{tool.label}</span>
              <ChevronRight size={11} className="text-mountain-border group-hover:text-mountain-primary shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Compact flat grid for landing page (no hierarchy needed — all tools equal weight for discovery)
function ToolGrid({ tools }: { tools: typeof expertTools }) {
  return (
    <div className="border border-mountain-border rounded-lg overflow-hidden divide-y divide-mountain-border">
      <div className="grid grid-cols-2 divide-x divide-mountain-border">
        {tools.slice(0, 2).map((tool) => (
          <Link
            key={tool.href + tool.label}
            href={tool.href}
            className="group flex items-start justify-between bg-mountain-surface px-4 py-4 hover:bg-mountain-border/40 transition-colors duration-150"
          >
            <div>
              <div className="text-sm font-semibold text-mountain-text">{tool.label}</div>
              <div className="text-xs text-mountain-muted mt-0.5">{tool.sub}</div>
            </div>
            <ChevronRight size={13} className="text-mountain-border group-hover:text-mountain-primary mt-0.5 shrink-0 transition-colors" />
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-mountain-border">
        {tools.slice(2).map((tool) => (
          <Link
            key={tool.href + tool.label}
            href={tool.href}
            className="group flex items-center justify-between bg-mountain-surface px-4 py-3 hover:bg-mountain-border/40 transition-colors duration-150"
          >
            <span className="text-sm font-medium text-mountain-muted group-hover:text-mountain-text transition-colors">{tool.label}</span>
            <ChevronRight size={11} className="text-mountain-border group-hover:text-mountain-primary shrink-0 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Authenticated dashboard ─────────────────────────────────────────────
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, experience_level')
      .eq('id', user.id)
      .single()

    const experienceLevel = profile?.experience_level ?? null
    const isExpert = experienceLevel === 'intermediate' || experienceLevel === 'advanced'
    const tools = isExpert ? expertTools : beginnerTools

    const [kgStats, knotStats, activeTrip, gearCount, completedRoutes, streak] = await Promise.all([
      fetchKGStats(supabase, user.id),
      fetchKnotStats(supabase, user.id),
      fetchActiveTrip(supabase, user.id),
      fetchGearCount(supabase, user.id),
      fetchCompletedRoutes(supabase, user.id),
      fetchStreak(supabase, user.id),
    ])

    // fetchLastActivity depends on kgStats/knotStats — called after Promise.all intentionally
    const lastActivity = await fetchLastActivity(supabase, user.id, kgStats, knotStats)
    const nextSteps = computeNextSteps(kgStats, knotStats, gearCount, activeTrip, completedRoutes, experienceLevel)
    const primaryNextStep = nextSteps[0] ?? null
    const commandHref = primaryNextStep?.href ?? (activeTrip ? `/trips/${activeTrip.id}` : '/mountains')

    const firstName = getFirstName(profile?.display_name ?? null)
    const levelLabel = getLevelLabel(experienceLevel)

    return (
      <div className="min-h-[calc(100vh-4rem)]">
        {/* Command center */}
        <section aria-label="Командный центр" className="pt-10 pb-8">
          <div className="rounded-lg border border-mountain-border bg-mountain-surface overflow-hidden">
            <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-xs font-semibold uppercase tracking-wide text-mountain-muted">
                    Командный центр
                  </p>
                  <StreakCard streak={streak} />
                </div>
                <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-mountain-text">
                  {firstName ? `${firstName}, следующий шаг уже виден` : 'Следующий шаг уже виден'}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-mountain-muted">
                  {primaryNextStep
                    ? primaryNextStep.description
                    : 'Выбери маршрут, собери снаряжение или продолжи подготовку из последней активности.'}
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href={commandHref}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-mountain-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-mountain-primary/90"
                  >
                    {primaryNextStep?.title || (activeTrip ? 'Открыть поездку' : 'Выбрать маршрут')}
                    <ArrowRight size={15} />
                  </Link>
                  {(levelLabel || completedRoutes > 0) && (
                    <p className="text-sm text-mountain-muted">
                      {levelLabel}
                      {levelLabel && completedRoutes > 0 && ' · '}
                      {completedRoutes > 0 && `${completedRoutes} восхождений`}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 border-t border-mountain-border lg:border-l lg:border-t-0">
                <div className="border-r border-b border-mountain-border p-4">
                  <Map className="h-4 w-4 text-mountain-primary" />
                  <p className="mt-3 text-2xl font-bold text-mountain-text">{completedRoutes}</p>
                  <p className="text-xs text-mountain-muted">пройдено маршрутов</p>
                </div>
                <div className="border-b border-mountain-border p-4">
                  <PackageCheck className="h-4 w-4 text-mountain-accent" />
                  <p className="mt-3 text-2xl font-bold text-mountain-text">{gearCount}</p>
                  <p className="text-xs text-mountain-muted">вещей в кладовке</p>
                </div>
                <div className="border-r border-mountain-border p-4">
                  <ClipboardCheck className="h-4 w-4 text-mountain-success" />
                  <p className="mt-3 text-2xl font-bold text-mountain-text">
                    {kgStats.total > 0 ? Math.round((kgStats.studied / kgStats.total) * 100) : 0}%
                  </p>
                  <p className="text-xs text-mountain-muted">теории изучено</p>
                </div>
                <div className="p-4">
                  <Route className="h-4 w-4 text-mountain-primary" />
                  <p className="mt-3 text-2xl font-bold text-mountain-text">
                    {activeTrip ? activeTrip.packingPercent : '—'}
                    {activeTrip && '%'}
                  </p>
                  <p className="text-xs text-mountain-muted">сборы поездки</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Рабочая зона">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
            <div className="md:col-span-3">
              <ResumeCard activity={lastActivity} nextStep={primaryNextStep} />
            </div>
            <div className="md:col-span-2">
              <TripCard trip={activeTrip} />
            </div>
          </div>
          <DailyChallenge kgStats={kgStats} knotStats={knotStats} gearCount={gearCount} />
        </section>

        {/* Tools */}
        <section
          aria-label="Инструменты"
          className="mt-12 pt-8 border-t border-mountain-border"
        >
          <ToolSection tools={tools} />

          <div className="mt-5">
            <OnboardingGuide level={experienceLevel as 'beginner' | 'intermediate' | 'advanced' | null} />
          </div>
        </section>
      </div>
    )
  }

  // ── Unauthenticated landing page (unchanged) ────────────────────────────
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section aria-label="Заголовок" className="pt-14 pb-12 border-b border-mountain-border">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-mountain-accent mb-5">
            Платформа для альпинистов
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-mountain-text mb-5">
            Подготовка к горам —<br />
            <span className="text-mountain-muted font-normal">
              от первого узла до сложного маршрута
            </span>
          </h1>
          <p className="text-mountain-muted text-base max-w-xl leading-relaxed">
            Единая среда для обучения, планирования и командной работы. Для новичков и опытных
            альпинистов — каждый найдёт своё.
          </p>
        </div>
      </section>

      {/* Two-column landing */}
      <section className="pt-12 grid grid-cols-1 lg:grid-cols-[1fr_2px_1fr] gap-0">
        {/* Beginner path */}
        <div className="pb-12 lg:pb-0 lg:pr-12">
          <div className="mb-8">
            <span className="inline-block text-xs font-semibold tracking-[0.18em] uppercase text-mountain-accent mb-3">
              Начинаю ходить в горы
            </span>
            <h2 className="text-xl font-semibold text-mountain-text">Учись последовательно</h2>
            <p className="text-sm text-mountain-muted mt-1">
              Три шага, с которых начинает каждый альпинист
            </p>
            <OnboardingGuide level="beginner" />
          </div>

          <ol className="relative">
            {beginnerLandingSteps.map((item, idx) => (
              <li key={item.href} className="relative">
                {idx < 2 && (
                  <div className="absolute left-5 top-[40px] bottom-0 w-px bg-mountain-border" />
                )}
                <Link
                  href={item.href}
                  className="group flex gap-5 items-start py-5 transition-opacity duration-150 hover:opacity-100 opacity-95"
                >
                  <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full border border-mountain-accent/40 bg-mountain-surface flex items-center justify-center group-hover:border-mountain-accent group-hover:bg-mountain-accent/10 transition-colors duration-200">
                    <span className="text-xs font-bold text-mountain-accent">{item.step}</span>
                  </div>
                  <div className="pt-1 flex-1 min-w-0">
                    <span className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted block mb-1">
                      {item.tag}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-mountain-text group-hover:text-mountain-text transition-colors">
                        {item.title}
                      </span>
                      <ChevronRight
                        size={14}
                        className="text-mountain-border group-hover:text-mountain-accent group-hover:translate-x-0.5 transition-all duration-200"
                      />
                    </div>
                    <p className="text-sm text-mountain-muted mt-1 leading-relaxed">{item.detail}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>

          <div className="mt-4 pl-[60px]">
            <Link
              href="/knowledge"
              className="inline-flex items-center gap-2 text-sm font-medium text-mountain-accent hover:text-mountain-accent/80 transition-colors"
            >
              Начать с основ
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="hidden lg:block w-px bg-mountain-border mx-0" />
        <div className="lg:hidden h-px bg-mountain-border my-12" />

        {/* Expert path */}
        <div className="lg:pl-12">
          <div className="mb-8">
            <span className="inline-block text-xs font-semibold tracking-[0.18em] uppercase text-mountain-primary mb-3">
              Планирую маршрут / команду
            </span>
            <h2 className="text-xl font-semibold text-mountain-text">Инструменты под рукой</h2>
            <p className="text-sm text-mountain-muted mt-1">
              Быстрый доступ ко всему нужному перед выходом
            </p>
            <OnboardingGuide level="advanced" />
          </div>
          <ToolGrid tools={landingExpertTools} />
        </div>
      </section>

      {/* Bottom strip */}
      <section className="mt-16 pt-8 border-t border-mountain-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-mountain-muted">
            Горы Кавказа, Крыма и других регионов · Маршруты 1Б–6Б · Команды и снаряжение
          </p>
          <Link
            href="/mountains"
            className="text-sm text-mountain-primary hover:text-mountain-primary/80 transition-colors flex items-center gap-1.5"
          >
            Смотреть базу маршрутов
            <ArrowRight size={13} />
          </Link>
        </div>
      </section>
    </div>
  )
}
