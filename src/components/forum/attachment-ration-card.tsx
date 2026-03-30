'use client'

import { ChefHat } from 'lucide-react'
import Link from 'next/link'
import templates from '@/lib/data/ration-templates.json'

interface Props {
  templateId: string
}

export function AttachmentRationCard({ templateId }: Props) {
  const tpl = (templates as any[]).find(t => t.id === templateId)
  if (!tpl) return null

  return (
    <div className="rounded-xl border border-mountain-border bg-mountain-surface/40 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <ChefHat className="w-4 h-4 text-mountain-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-mountain-text">{tpl.name}</p>
          <p className="text-xs text-mountain-muted">{tpl.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-mono text-mountain-accent">{tpl.caloriesPerDay} ккал/день</p>
          <p className="text-xs text-mountain-muted">{tpl.gramsPerPersonPerDay} г/день</p>
        </div>
      </div>
      <Link
        href="/rations"
        className="text-xs text-mountain-primary hover:underline"
      >
        Открыть в раскладках →
      </Link>
    </div>
  )
}
