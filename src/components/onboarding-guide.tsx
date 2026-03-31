'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown, ChevronRight, MapPin, Anchor, Backpack, Dumbbell,
  MessageSquare, BookOpen, Globe, Users, UtensilsCrossed, Map,
  Compass,
} from 'lucide-react'

type Level = 'beginner' | 'intermediate' | 'advanced' | null

interface GuideItem {
  icon: React.ElementType
  title: string
  href: string
  desc: string
}

const beginnerGuide: GuideItem[] = [
  {
    icon: BookOpen,
    title: 'Граф знаний',
    href: '/knowledge',
    desc: 'Начни отсюда. Интерактивная карта понятий: снаряжение, страховка, тактика движения. Читай узлы — переходи дальше по связям.',
  },
  {
    icon: Anchor,
    title: 'Узлы',
    href: '/knots',
    desc: 'Изучи восьмёрку, булинь, схватывающий, стремя и УИАА — это минимальный набор для первых выходов. Пошаговые схемы с проверкой.',
  },
  {
    icon: Backpack,
    title: 'Кладовка',
    href: '/gear',
    desc: 'Создай список личного снаряжения. В разделе "С чего начать" есть готовый стартовый набор — можно добавить одним нажатием.',
  },
  {
    icon: Dumbbell,
    title: 'Тренировки',
    href: '/training',
    desc: 'Сохрани 2–3 базовых тренировки: кардиобаза, ноги и кор. Начни за 3–4 месяца до первого выхода.',
  },
  {
    icon: MessageSquare,
    title: 'Форум',
    href: '/forum/beginners',
    desc: 'Задавай любые вопросы в разделе "Новичкам". Там же найдёшь отчёты с маршрутов и советы по снаряжению.',
  },
  {
    icon: Globe,
    title: 'Ресурсы',
    href: '/resources',
    desc: 'Сайт ФАР — список клубов и ближайшие сборы. Статьи Спорт-Марафона — введение в альпинизм, основы безопасности.',
  },
]

const expertGuide: GuideItem[] = [
  {
    icon: Map,
    title: 'Маршруты',
    href: '/mountains',
    desc: 'Ищи по горе, категории (1Б–6Б), региону. Детальные описания с рельефом, станциями и фотоматериалами.',
  },
  {
    icon: Users,
    title: 'Отделения',
    href: '/teams',
    desc: 'Создай команду — добавь участников по ссылке, прикрепи маршрут, распредели снаряжение по сборам, укажи даты.',
  },
  {
    icon: Backpack,
    title: 'Кладовка',
    href: '/gear',
    desc: 'Веди учёт личного снаряжения. Создавай сборы под конкретные маршруты и распределяй вещи по рюкзакам.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Раскладка',
    href: '/rations',
    desc: 'Планируй питание группы по дням: калории, вес, КБЖУ. Используй шаблоны или создавай своё меню.',
  },
  {
    icon: MessageSquare,
    title: 'Форум',
    href: '/forum',
    desc: 'Делись отчётами с маршрутов, прикрепляй маршрут к обсуждению. Ищи партнёров по связке или команду.',
  },
  {
    icon: MapPin,
    title: 'Поездки',
    href: '/trips',
    desc: 'Планируй логистику выхода: сроки, участники, маршрут. Всё в одном месте.',
  },
]


function getGuide(level: Level): GuideItem[] | null {
  if (level === 'beginner') return beginnerGuide
  if (level === 'intermediate' || level === 'advanced') return expertGuide
  return null
}


function getTitle(level: Level): string {
  if (level === 'beginner') return 'Что доступно новичку'
  return 'Инструменты платформы'
}

function getHint(level: Level): string {
  if (level === 'beginner')
    return 'Начни с Графа знаний — он даст общую картину. Потом узлы и снаряжение.'
  if (level === 'intermediate')
    return 'Создай отделение и попробуй распределить снаряжение через Кладовку.'
  return 'Маршруты, Отделения и Раскладка — главные инструменты перед выходом.'
}

interface Props {
  level: Level
}

export function OnboardingGuide({ level }: Props) {
  const [open, setOpen] = useState(false)
  const guide = getGuide(level)
  if (!guide) return null

  return (
    <div className="mt-5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className={`
          inline-flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-colors
          ${open
            ? 'border-mountain-accent/60 bg-mountain-accent/10 text-mountain-accent'
            : 'border-mountain-border bg-mountain-surface text-mountain-text hover:border-mountain-accent/50 hover:text-mountain-accent'
          }
        `}
      >
        <Compass size={15} className={open ? 'text-mountain-accent' : 'text-mountain-muted'} />
        С чего начать?
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ml-0.5 ${open ? 'rotate-180 text-mountain-accent' : 'text-mountain-muted'}`}
        />
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-mountain-border bg-mountain-surface overflow-hidden">

          {/* Platform sections */}
          <div className="px-5 py-3 border-b border-mountain-border bg-mountain-bg/40">
            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-mountain-accent">
              {getTitle(level)}
            </p>
          </div>

          <div className="divide-y divide-mountain-border">
            {guide.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-start gap-4 px-5 py-3.5 hover:bg-mountain-border/30 transition-colors group/item"
              >
                <item.icon
                  size={15}
                  className="mt-0.5 text-mountain-accent shrink-0 group-hover/item:text-mountain-primary transition-colors"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-mountain-text group-hover/item:text-white transition-colors">
                      {item.title}
                    </p>
                    <ChevronRight size={12} className="text-mountain-border group-hover/item:text-mountain-accent transition-colors shrink-0" />
                  </div>
                  <p className="text-xs text-mountain-muted mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="px-5 py-2.5 border-t border-mountain-border bg-mountain-bg/40">
            <p className="text-xs text-mountain-muted">
              {getHint(level)}
            </p>
          </div>

          {/* Forum link */}
          <div className="border-t border-mountain-border px-5 py-3.5 bg-mountain-bg/40 flex items-center justify-between">
            <p className="text-xs text-mountain-muted">Есть вопросы? Ответы на самые частые — на форуме</p>
            <Link
              href="/forum/beginners"
              className="inline-flex items-center gap-1 text-xs text-mountain-primary hover:text-mountain-primary/80 transition-colors shrink-0 ml-3"
            >
              Раздел «Новичкам»
              <ChevronRight size={11} />
            </Link>
          </div>

        </div>
      )}
    </div>
  )
}
