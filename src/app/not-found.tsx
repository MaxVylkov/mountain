import Link from 'next/link'
import { Mountain, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-full bg-mountain-primary/10">
        <Mountain size={32} className="text-mountain-primary" strokeWidth={1.5} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-mountain-text mb-2">
        Страница не найдена
      </h1>
      <p className="text-sm text-mountain-muted max-w-sm mb-8">
        Возможно, маршрут изменился или страница была удалена. Попробуй начать с главной.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-mountain-primary text-white text-sm font-medium hover:bg-mountain-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-mountain-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mountain-bg"
      >
        <ArrowLeft size={16} />
        На главную
      </Link>
    </div>
  )
}
