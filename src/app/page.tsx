import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
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

function ToolGrid({ tools, cols = '3' }: { tools: typeof expertTools; cols?: '2' | '3' | '4' }) {
  const colClass =
    cols === '2' ? 'grid-cols-2' : cols === '4' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'
  return (
    <div
      className={`grid ${colClass} gap-px bg-mountain-border rounded-lg overflow-hidden border border-mountain-border`}
    >
      {tools.map((tool) => (
        <Link
          key={tool.href + tool.label}
          href={tool.href}
          className="group bg-mountain-surface px-4 py-4 hover:bg-mountain-border/60 transition-colors duration-150"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-mountain-text text-sm group-hover:text-mountain-text transition-colors">
                {tool.label}
              </div>
              <div className="text-xs text-mountain-muted mt-0.5">{tool.sub}</div>
            </div>
            <ChevronRight
              size={13}
              className="text-mountain-border group-hover:text-mountain-primary mt-0.5 shrink-0 transition-colors"
            />
          </div>
        </Link>
      ))}
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

    const firstName = getFirstName(profile?.display_name ?? null)
    const levelLabel = getLevelLabel(experienceLevel)

    return (
      <div className="min-h-[calc(100vh-4rem)]">
        {/* Hero — compact greeting */}
        <section
          aria-label="Приветствие"
          className="pt-14 pb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-mountain-text mb-1">
            {firstName ? `Привет, ${firstName}` : 'Добро пожаловать'}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            {(levelLabel || completedRoutes > 0) && (
              <p className="text-sm text-mountain-muted">
                {levelLabel}
                {levelLabel && completedRoutes > 0 && ' · '}
                {completedRoutes > 0 && `${completedRoutes} восхождений`}
              </p>
            )}
            <StreakCard streak={streak} />
          </div>
        </section>

        {/* Primary action row — Resume gets more weight */}
        <section aria-label="Быстрый доступ">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="md:col-span-3">
              <ResumeCard activity={lastActivity} nextStep={primaryNextStep} />
            </div>
            <div className="md:col-span-2">
              <TripCard trip={activeTrip} />
            </div>
          </div>

          <div className="mt-4">
            <DailyChallenge kgStats={kgStats} knotStats={knotStats} gearCount={gearCount} />
          </div>
        </section>

        {/* Tools — split into primary and secondary */}
        <section
          aria-label="Инструменты"
          className="mt-10 pt-8 border-t border-mountain-border"
        >
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-mountain-muted mb-5">
            Инструменты
          </p>
          <ToolGrid tools={tools} />

          <div className="mt-6">
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
          <ToolGrid tools={landingExpertTools} cols="2" />
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
