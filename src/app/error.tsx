'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-full bg-mountain-danger/10">
        <AlertTriangle size={32} className="text-mountain-danger" strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-mountain-text mb-2">
        Что-то пошло не так
      </h2>
      <p className="text-sm text-mountain-muted max-w-sm mb-8">
        Произошла ошибка при загрузке страницы. Попробуй обновить.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-mountain-primary text-white text-sm font-medium hover:bg-mountain-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-mountain-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mountain-bg"
      >
        <RotateCcw size={16} />
        Попробовать снова
      </button>
    </div>
  )
}
