'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Anchor, Backpack, Dumbbell, Mountain, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getModuleBridges, type ModuleLink } from '@/lib/flow-engine'

const MODULE_ICONS: Record<string, React.ElementType> = {
  'Граф знаний': BookOpen,
  'Узлы': Anchor,
  'Кладовка': Backpack,
  'Тренировки': Dumbbell,
  'Маршруты': Mountain,
  'Поездки': MapPin,
}

interface Props {
  currentModule: 'knowledge' | 'knots' | 'training' | 'gear' | 'mountains'
}

export function NextStepBanner({ currentModule }: Props) {
  const [links, setLinks] = useState<ModuleLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setLoading(false)
        return
      }

      const userId = data.user.id

      const [kgRes, knotRes, gearRes] = await Promise.all([
        Promise.all([
          supabase.from('kg_nodes').select('*', { count: 'exact', head: true }),
          supabase.from('kg_progress').select('*', { count: 'exact', head: true })
            .eq('user_id', userId).eq('studied', true),
        ]),
        Promise.all([
          supabase.from('knots').select('*', { count: 'exact', head: true }),
          supabase.from('knot_progress').select('*', { count: 'exact', head: true })
            .eq('user_id', userId).eq('status', 'mastered'),
        ]),
        supabase.from('user_gear').select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])

      const kgTotal = kgRes[0].count ?? 0
      const kgStudied = kgRes[1].count ?? 0
      const knotTotal = knotRes[0].count ?? 0
      const knotMastered = knotRes[1].count ?? 0
      const gearCount = gearRes.count ?? 0

      const kgPercent = kgTotal > 0 ? Math.round((kgStudied / kgTotal) * 100) : 0
      const knotPercent = knotTotal > 0 ? Math.round((knotMastered / knotTotal) * 100) : 0

      setLinks(getModuleBridges(currentModule, kgPercent, knotPercent, gearCount))
      setLoading(false)
    })
  }, [currentModule])

  if (loading || links.length === 0) return null

  return (
    <div className="mt-10 pt-6 border-t border-mountain-border">
      <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-4">
        Следующий шаг
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => {
          const Icon = MODULE_ICONS[link.label] ?? ArrowRight
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start gap-3 rounded-lg border border-mountain-border bg-mountain-surface/30 px-4 py-3.5 hover:border-mountain-accent/40 hover:bg-mountain-accent/[0.04] transition-colors"
            >
              <Icon
                size={16}
                className="mt-0.5 text-mountain-muted group-hover:text-mountain-accent transition-colors shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-mountain-text group-hover:text-white transition-colors">
                    {link.label}
                  </span>
                  <ArrowRight
                    size={12}
                    className="text-mountain-border group-hover:text-mountain-accent group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </div>
                <p className="text-xs text-mountain-muted mt-0.5 leading-relaxed">
                  {link.reason}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
