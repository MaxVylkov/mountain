import { ExternalLink, BookOpen } from 'lucide-react'

interface Resource {
  title: string
  description: string
  url: string
  tags?: string[]
}

interface ResourceCategory {
  label: string
  resources: Resource[]
}

const CATEGORIES: ResourceCategory[] = [
  {
    label: 'Основы альпинизма',
    resources: [
      {
        title: 'Введение в альпинизм',
        description: 'Статья Спорт-Марафон — с чего начать, базовые понятия, снаряжение и подготовка для новичков.',
        url: 'https://sport-marafon.ru/article/vvedenie-v-alpinizm/',
        tags: ['Спорт-Марафон', 'Новичкам'],
      },
    ],
  },
]

export function ResourcesSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-mountain-primary" />
        <h2 className="text-lg font-semibold text-mountain-text">Полезные ресурсы</h2>
      </div>

      {CATEGORIES.map(cat => (
        <div key={cat.label} className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase text-mountain-muted">{cat.label}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {cat.resources.map(r => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block surface-card p-4 space-y-2 hover:border-mountain-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-mountain-text group-hover:text-mountain-primary transition-colors leading-snug">
                    {r.title}
                  </p>
                  <ExternalLink className="w-3.5 h-3.5 text-mountain-muted shrink-0 mt-0.5 group-hover:text-mountain-primary transition-colors" />
                </div>
                <p className="text-xs text-mountain-muted leading-relaxed">{r.description}</p>
                {r.tags && (
                  <div className="flex gap-1.5 flex-wrap">
                    {r.tags.map(tag => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-mountain-surface border border-mountain-border text-mountain-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
