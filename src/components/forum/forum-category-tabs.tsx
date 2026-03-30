'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { categoryLabel, type ForumCategory } from './forum-types'

const CATEGORIES: ForumCategory[] = ['routes', 'gear', 'learning', 'training', 'rations']

export function ForumCategoryTabs() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 border-b border-mountain-border overflow-x-auto">
      {CATEGORIES.map(cat => {
        const href = `/forum/${cat}`
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={cat}
            href={href}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active
                ? 'border-mountain-primary text-mountain-text'
                : 'border-transparent text-mountain-muted hover:text-mountain-text'
            }`}
          >
            {categoryLabel(cat)}
          </Link>
        )
      })}
      {/* Лента tab — disabled, coming soon */}
      <span className="px-4 py-2.5 text-sm font-medium text-mountain-muted/50 border-b-2 border-transparent whitespace-nowrap flex items-center gap-1.5 cursor-not-allowed">
        Лента
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-mountain-surface text-mountain-muted">Скоро</span>
      </span>
    </div>
  )
}
