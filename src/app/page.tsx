import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'

// Beginner path: curriculum-style vertical progression
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
]

// Expert path: dense tool access, horizontal strip
const expertTools = [
  {
    href: '/mountains',
    label: 'Маршруты',
    sub: 'КГ, ТС, 1А–6А',
  },
  {
    href: '/trips',
    label: 'Поездки',
    sub: 'Планирование выхода',
  },
  {
    href: '/teams',
    label: 'Отделения',
    sub: 'Состав, снаряжение',
  },
  {
    href: '/gear',
    label: 'Кладовка',
    sub: 'Учёт и сборы',
  },
  {
    href: '/rations',
    label: 'Раскладка',
    sub: 'Питание на маршруте',
  },
  {
    href: '/forum',
    label: 'Форум',
    sub: 'Вопросы и опыт',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-14 pb-12 border-b border-mountain-border">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-mountain-accent mb-5">
            Платформа для альпинистов
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-mountain-text mb-5">
            Подготовка к горам —<br />
            <span className="text-mountain-muted font-normal">от первого узла до сложного маршрута</span>
          </h1>
          <p className="text-mountain-muted text-base max-w-xl leading-relaxed">
            Единая среда для обучения, планирования и командной работы.
            Для новичков и опытных альпинистов — каждый найдёт своё.
          </p>
        </div>
      </section>

      {/* ── Two paths ─────────────────────────────────────────── */}
      <section className="pt-12 grid grid-cols-1 lg:grid-cols-[1fr_2px_1fr] gap-0">

        {/* ── Beginner path ──────────────────────────────────── */}
        <div className="pb-12 lg:pb-0 lg:pr-12">
          {/* Path header */}
          <div className="mb-8">
            <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-mountain-accent mb-3">
              Начинаю ходить в горы
            </span>
            <h2 className="text-xl font-semibold text-mountain-text">
              Учись последовательно
            </h2>
            <p className="text-sm text-mountain-muted mt-1">
              Три шага, с которых начинает каждый альпинист
            </p>
          </div>

          {/* Step ladder */}
          <ol className="relative">
            {beginnerSteps.map((item, idx) => (
              <li key={item.href} className="relative">
                {/* Connector line */}
                {idx < beginnerSteps.length - 1 && (
                  <div className="absolute left-[19px] top-[40px] bottom-0 w-px bg-mountain-border" />
                )}

                <Link
                  href={item.href}
                  className="group flex gap-5 items-start py-5 transition-opacity duration-150 hover:opacity-100 opacity-95"
                >
                  {/* Step number bubble */}
                  <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full border border-mountain-accent/40 bg-mountain-surface flex items-center justify-center group-hover:border-mountain-accent group-hover:bg-mountain-accent/10 transition-colors duration-200">
                    <span className="text-[11px] font-bold text-mountain-accent">{item.step}</span>
                  </div>

                  {/* Content */}
                  <div className="pt-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-mountain-muted">
                        {item.tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-mountain-text group-hover:text-white transition-colors">
                        {item.title}
                      </span>
                      <ChevronRight
                        size={14}
                        className="text-mountain-border group-hover:text-mountain-accent group-hover:translate-x-0.5 transition-all duration-200"
                      />
                    </div>
                    <p className="text-sm text-mountain-muted mt-1 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>

          {/* CTA for beginners */}
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

        {/* ── Divider ────────────────────────────────────────── */}
        <div className="hidden lg:block w-px bg-mountain-border mx-0" />
        <div className="lg:hidden h-px bg-mountain-border mb-12" />

        {/* ── Expert path ────────────────────────────────────── */}
        <div className="lg:pl-12">
          {/* Path header */}
          <div className="mb-8">
            <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-mountain-primary mb-3">
              Планирую маршрут / команду
            </span>
            <h2 className="text-xl font-semibold text-mountain-text">
              Инструменты под рукой
            </h2>
            <p className="text-sm text-mountain-muted mt-1">
              Быстрый доступ ко всему нужному перед выходом
            </p>
          </div>

          {/* Tool grid — 2-col, deliberately dense, no icons */}
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
                    <div className="text-[12px] text-mountain-muted mt-0.5">
                      {tool.sub}
                    </div>
                  </div>
                  <ChevronRight
                    size={13}
                    className="text-mountain-border group-hover:text-mountain-primary mt-0.5 shrink-0 transition-colors duration-150"
                  />
                </div>
              </Link>
            ))}
          </div>

          {/* Expert CTA — placeholder, to be added when user journey is defined */}
        </div>
      </section>

      {/* ── Bottom strip: social proof / context ─────────────── */}
      <section className="mt-16 pt-8 border-t border-mountain-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-mountain-muted">
            Горы Кавказа, Крыма и других регионов · Маршруты 1А–6А · Команды и снаряжение
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
