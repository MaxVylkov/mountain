import Link from 'next/link'
import { Zap, ChevronRight } from 'lucide-react'
import type { KGStats, KnotStats } from '@/lib/dashboard-data'

interface Props {
  kgStats: KGStats
  knotStats: KnotStats
  gearCount: number
}

interface Challenge {
  text: string
  href: string
  cta: string
}

function pickChallenge(kgStats: KGStats, knotStats: KnotStats, gearCount: number): Challenge {
  // Use day-of-year as seed for rotation
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)

  const challenges: Challenge[] = []

  if (kgStats.studied < kgStats.total) {
    challenges.push({
      text: 'Изучи одну новую тему в Графе знаний',
      href: '/knowledge',
      cta: 'Открыть граф',
    })
  }

  if (knotStats.mastered < knotStats.total) {
    challenges.push({
      text: 'Попрактикуй один узел до уровня «освоен»',
      href: '/knots',
      cta: 'К узлам',
    })
  }

  challenges.push({
    text: 'Выполни одну тренировку из программы',
    href: '/training',
    cta: 'Тренировки',
  })

  if (gearCount === 0) {
    challenges.push({
      text: 'Добавь первое снаряжение в Кладовку',
      href: '/gear',
      cta: 'Кладовка',
    })
  }

  challenges.push({
    text: 'Загляни на форум — может, кто-то ждёт ответа',
    href: '/forum',
    cta: 'Форум',
  })

  return challenges[dayOfYear % challenges.length]
}

export function DailyChallenge({ kgStats, knotStats, gearCount }: Props) {
  const challenge = pickChallenge(kgStats, knotStats, gearCount)

  return (
    <Link
      href={challenge.href}
      className="group flex items-center gap-3 rounded-lg border border-mountain-border bg-mountain-surface/30 px-4 py-3 hover:border-mountain-accent/30 hover:bg-mountain-accent/[0.03] transition-colors"
    >
      <Zap size={14} className="text-mountain-accent shrink-0" />
      <span className="text-xs text-mountain-text flex-1 min-w-0">
        {challenge.text}
      </span>
      <span className="text-[11px] text-mountain-muted group-hover:text-mountain-accent transition-colors flex items-center gap-0.5 shrink-0">
        {challenge.cta}
        <ChevronRight size={11} />
      </span>
    </Link>
  )
}
