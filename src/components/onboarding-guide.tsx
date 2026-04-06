'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ChevronDown, ChevronRight, MapPin, Anchor, Backpack, Dumbbell,
  MessageSquare, BookOpen, Globe, Users, UtensilsCrossed, Map,
  Compass, Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Level = 'beginner' | 'intermediate' | 'advanced' | null

interface GuideItem {
  icon: React.ElementType
  title: string
  href: string
  desc: string
  progressKey?: string  // key to match with progress data
}

const beginnerGuide: GuideItem[] = [
  {
    icon: BookOpen,
    title: 'Граф знаний',
    href: '/knowledge',
    desc: 'Начни отсюда. Интерактивная карта понятий: снаряжение, страховка, тактика движения. Читай узлы — переходи дальше по связям.',
    progressKey: 'kg',
  },
  {
    icon: Anchor,
    title: 'Узлы',
    href: '/knots',
    desc: 'Изучи восьмёрку, булинь, схватывающий, стремя и УИАА — это минимальный набор для первых выходов. Пошаговые схемы с проверкой.',
    progressKey: 'knots',
  },
  {
    icon: Backpack,
    title: 'Кладовка',
    href: '/gear',
    desc: 'Создай список личного снаряжения. В разделе "С чего начать" есть готовый стартовый набор — можно добавить одним нажатием.',
    progressKey: 'gear',
  },
  {
    icon: Dumbbell,
    title: 'Тренировки',
    href: '/training',
    desc: 'Сохрани 2–3 базовых тренировки: кардиобаза, ноги и кор. Начни за 3–4 месяца до первого выхода.',
    progressKey: 'training',
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
    progressKey: 'gear',
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

interface ProgressData {
  kg: boolean       // has studied any KG node
  knots: boolean    // has mastered any knot
  gear: boolean     // has any gear
  training: boolean // has any training log
}

interface Props {
  level: Level
}

export function OnboardingGuide({ level }: Props) {
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const guide = getGuide(level)

  // Fetch progress when opened
  useEffect(() => {
    if (!guide) return
    if (!open) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const userId = data.user.id

      const [kgRes, knotRes, gearRes, trainingRes] = await Promise.all([
        supabase.from('kg_progress').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).eq('studied', true),
        supabase.from('knot_progress').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).eq('status', 'mastered'),
        supabase.from('user_gear').select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase.from('training_log').select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])

      setProgress({
        kg: (kgRes.count ?? 0) > 0,
        knots: (knotRes.count ?? 0) > 0,
        gear: (gearRes.count ?? 0) > 0,
        training: (trainingRes.count ?? 0) > 0,
      })
    })
  }, [open, guide])

  if (!guide) return null

  const completedCount = progress
    ? guide.filter(item => item.progressKey && progress[item.progressKey as keyof ProgressData]).length
    : 0
  const trackableCount = guide.filter(item => item.progressKey).length

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
        {progress && completedCount > 0 && (
          <span className="text-[11px] text-mountain-accent/70 ml-0.5">
            {completedCount}/{trackableCount}
          </span>
        )}
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
            {guide.map((item) => {
              const isDone = progress && item.progressKey
                ? progress[item.progressKey as keyof ProgressData]
                : false

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-start gap-4 px-5 py-3.5 hover:bg-mountain-border/30 transition-colors group/item"
                >
                  {isDone ? (
                    <div className="mt-0.5 w-[15px] h-[15px] rounded-full bg-mountain-success/20 flex items-center justify-center shrink-0">
                      <Check size={10} className="text-mountain-success" />
                    </div>
                  ) : (
                    <item.icon
                      size={15}
                      className="mt-0.5 text-mountain-accent shrink-0 group-hover/item:text-mountain-primary transition-colors"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-semibold transition-colors ${
                        isDone
                          ? 'text-mountain-muted line-through decoration-mountain-border'
                          : 'text-mountain-text group-hover/item:text-white'
                      }`}>
                        {item.title}
                      </p>
                      <ChevronRight size={12} className="text-mountain-border group-hover/item:text-mountain-accent transition-colors shrink-0" />
                    </div>
                    <p className="text-xs text-mountain-muted mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              )
            })}
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
