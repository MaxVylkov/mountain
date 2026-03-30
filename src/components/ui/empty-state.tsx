import { ElementType } from 'react'
import Link from 'next/link'

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: EmptyStateAction
  icon?: ElementType
}

export function EmptyState({ title, description, action, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl border border-mountain-border bg-mountain-surface/50">
      {Icon && (
        <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-mountain-primary/10">
          <Icon size={28} className="text-mountain-primary" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-base font-semibold text-mountain-text">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-mountain-muted max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-mountain-primary text-white text-sm font-medium hover:bg-mountain-primary/80 transition-colors"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-mountain-primary text-white text-sm font-medium hover:bg-mountain-primary/80 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
