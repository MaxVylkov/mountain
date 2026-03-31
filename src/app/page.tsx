import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BeginnerDashboard } from '@/components/beginner-dashboard'
import { OnboardingGuide } from '@/components/onboarding-guide'

const beginnerSteps = [
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
  {
    href: '/gear',
    step: '04',
    title: 'Снаряжение',
    detail: 'Составь список личного снаряжения и веди учёт в Кладовке',
    tag: 'Экипировка',
  },
]

const expertTools = [
  { href: '/mountains', label: 'Маршруты', sub: 'КГ, ТС, 1Б–6Б' },
  { href: '/trips', label: 'Поездки', sub: 'Планирование выхода' },
  { href: '/teams', label: 'Отделения', sub: 'Состав, снаряжение' },
  { href: '/gear', label: 'Кладовка', sub: 'Учёт и сборы' },
  { href: '/rations', label: 'Раскладка', sub: 'Питание на маршруте' },
  { href: '/forum', label: 'Форум', sub: 'Вопросы и опыт' },
]

const learningTools = [
  { href: '/knowledge', label: 'Граф знаний', sub: 'Основы и теория' },
  { href: '/knots', label: 'Узлы', sub: 'Пошаговое изучение' },
  { href: '/training', label: 'Тренировки', sub: 'Физподготовка' },
  { href: '/resources', label: 'Ресурсы', sub: 'Статьи и организации' },
]

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let experienceLevel: string | null = null
  let showBeginner = false
  let userId = ''

  if (user) {
    userId = user.id
    const { data: profile } = await supabase
      .from('profiles')
      .select('experience_level, onboarded')
      .eq('id', user.id)
      .single()

    experienceLevel = profile?.experience_level ?? null
    showBeginner = experienceLevel === 'beginner' && !profile?.onboarded
  }

  const isExpert = experienceLevel === 'intermediate' || experienceLevel === 'advanced'
  const isBeginner = experienceLevel === 'beginner'

  return (
    <div className="min-h-[calc(100vh-4rem)]">

      {showBeginner && <BeginnerDashboard userId={userId} />}

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-14 pb-12 border-b border-mountain-border">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-mountain-accent mb-5">
            Платформа для альпинистов
          </p>
          {isBeginner ? (
            <>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-mountain-text mb-5">
                Твой путь в горы —<br />
                <span className="text-mountain-muted font-normal">шаг за шагом, от азов до маршрута</span>
              </h1>
              <p className="text-mountain-muted text-base max-w-xl leading-relaxed">
                Учись в своём темпе: узлы, снаряжение, физподготовка и теория —
                всё в одном месте.
              </p>
            </>
          ) : isExpert ? (
            <>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-mountain-text mb-5">
                Инструменты готовы —<br />
                <span className="text-mountain-muted font-normal">планируй выход, собирай команду</span>
              </h1>
              <p className="text-mountain-muted text-base max-w-xl leading-relaxed">
                Маршруты, отделения, снаряжение и раскладка — быстрый доступ
                ко всему нужному перед выходом.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-mountain-text mb-5">
                Подготовка к горам —<br />
                <span className="text-mountain-muted font-normal">от первого узла до сложного маршрута</span>
              </h1>
              <p className="text-mountain-muted text-base max-w-xl leading-relaxed">
                Единая среда для обучения, планирования и командной работы.
                Для новичков и опытных альпинистов — каждый найдёт своё.
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── BEGINNER layout ───────────────────────────────────── */}
      {isBeginner && (
        <>
          <section className="pt-12">
            <div className="mb-8">
              <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-mountain-accent mb-3">
                Путь обучения
              </span>
              <h2 className="text-xl font-semibold text-mountain-text">
                Четыре шага для старта
              </h2>
              <p className="text-sm text-mountain-muted mt-1">
                Пройди их последовательно — это фундамент каждого альпиниста
              </p>
              <OnboardingGuide level="beginner" />
            </div>

            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {beginnerSteps.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex gap-4 items-start p-5 rounded-xl border border-mountain-border bg-mountain-surface hover:border-mountain-accent/50 hover:bg-mountain-accent/5 transition-colors duration-200"
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-full border border-mountain-accent/40 bg-mountain-bg flex items-center justify-center group-hover:border-mountain-accent group-hover:bg-mountain-accent/10 transition-colors">
                      <span className="text-[11px] font-bold text-mountain-accent">{item.step}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-mountain-muted block mb-1">
                        {item.tag}
                      </span>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-semibold text-mountain-text group-hover:text-white transition-colors text-sm">
                          {item.title}
                        </span>
                        <ChevronRight size={13} className="text-mountain-border group-hover:text-mountain-accent transition-colors shrink-0" />
                      </div>
                      <p className="text-xs text-mountain-muted leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          {/* Secondary: tools */}
          <section className="mt-12 pt-8 border-t border-mountain-border">
            <div className="mb-5">
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-mountain-muted">
                Инструменты платформы
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-mountain-border rounded-lg overflow-hidden border border-mountain-border">
              {expertTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group bg-mountain-surface px-4 py-3 hover:bg-mountain-border/60 transition-colors duration-150"
                >
                  <div className="font-medium text-mountain-text text-sm group-hover:text-white transition-colors">
                    {tool.label}
                  </div>
                  <div className="text-[11px] text-mountain-muted mt-0.5">{tool.sub}</div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── EXPERT layout ─────────────────────────────────────── */}
      {isExpert && (
        <>
          <section className="pt-12">
            <div className="mb-8">
              <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-mountain-primary mb-3">
                Инструменты
              </span>
              <h2 className="text-xl font-semibold text-mountain-text">Быстрый доступ</h2>
              <p className="text-sm text-mountain-muted mt-1">Всё нужное перед выходом</p>
              <OnboardingGuide level={experienceLevel as 'intermediate' | 'advanced'} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-mountain-border rounded-lg overflow-hidden border border-mountain-border">
              {expertTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group bg-mountain-surface px-5 py-5 hover:bg-mountain-border/60 transition-colors duration-150"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-mountain-text text-sm group-hover:text-white transition-colors">
                        {tool.label}
                      </div>
                      <div className="text-[12px] text-mountain-muted mt-0.5">{tool.sub}</div>
                    </div>
                    <ChevronRight size={13} className="text-mountain-border group-hover:text-mountain-primary mt-0.5 shrink-0 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Secondary: learning */}
          <section className="mt-12 pt-8 border-t border-mountain-border">
            <div className="mb-5">
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-mountain-muted">
                Обучение
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-mountain-border rounded-lg overflow-hidden border border-mountain-border">
              {learningTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group bg-mountain-surface px-4 py-3 hover:bg-mountain-border/60 transition-colors duration-150"
                >
                  <div className="font-medium text-mountain-text text-sm group-hover:text-white transition-colors">
                    {tool.label}
                  </div>
                  <div className="text-[11px] text-mountain-muted mt-0.5">{tool.sub}</div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── DEFAULT layout (not logged in) ────────────────────── */}
      {!isBeginner && !isExpert && (
        <section className="pt-12 grid grid-cols-1 lg:grid-cols-[1fr_2px_1fr] gap-0">

          {/* Beginner path */}
          <div className="pb-12 lg:pb-0 lg:pr-12">
            <div className="mb-8">
              <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-mountain-accent mb-3">
                Начинаю ходить в горы
              </span>
              <h2 className="text-xl font-semibold text-mountain-text">Учись последовательно</h2>
              <p className="text-sm text-mountain-muted mt-1">
                Три шага, с которых начинает каждый альпинист
              </p>
              <OnboardingGuide level="beginner" />
            </div>

            <ol className="relative">
              {beginnerSteps.slice(0, 3).map((item, idx) => (
                <li key={item.href} className="relative">
                  {idx < 2 && (
                    <div className="absolute left-[19px] top-[40px] bottom-0 w-px bg-mountain-border" />
                  )}
                  <Link
                    href={item.href}
                    className="group flex gap-5 items-start py-5 transition-opacity duration-150 hover:opacity-100 opacity-95"
                  >
                    <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full border border-mountain-accent/40 bg-mountain-surface flex items-center justify-center group-hover:border-mountain-accent group-hover:bg-mountain-accent/10 transition-colors duration-200">
                      <span className="text-[11px] font-bold text-mountain-accent">{item.step}</span>
                    </div>
                    <div className="pt-1 flex-1 min-w-0">
                      <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-mountain-muted block mb-1">
                        {item.tag}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-mountain-text group-hover:text-white transition-colors">
                          {item.title}
                        </span>
                        <ChevronRight size={14} className="text-mountain-border group-hover:text-mountain-accent group-hover:translate-x-0.5 transition-all duration-200" />
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
          <div className="lg:hidden h-px bg-mountain-border mb-12" />

          {/* Expert path */}
          <div className="lg:pl-12">
            <div className="mb-8">
              <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-mountain-primary mb-3">
                Планирую маршрут / команду
              </span>
              <h2 className="text-xl font-semibold text-mountain-text">Инструменты под рукой</h2>
              <p className="text-sm text-mountain-muted mt-1">
                Быстрый доступ ко всему нужному перед выходом
              </p>
              <OnboardingGuide level="advanced" />
            </div>

            <div className="grid grid-cols-2 gap-px bg-mountain-border rounded-lg overflow-hidden border border-mountain-border">
              {expertTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group bg-mountain-surface px-5 py-4 hover:bg-mountain-border/60 transition-colors duration-150"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-mountain-text text-sm group-hover:text-white transition-colors">
                        {tool.label}
                      </div>
                      <div className="text-[12px] text-mountain-muted mt-0.5">{tool.sub}</div>
                    </div>
                    <ChevronRight size={13} className="text-mountain-border group-hover:text-mountain-primary mt-0.5 shrink-0 transition-colors duration-150" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom strip ─────────────────────────────────────── */}
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
