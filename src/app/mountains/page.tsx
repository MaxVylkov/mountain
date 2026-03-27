import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Mountain } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default async function MountainsPage() {
  const supabase = await createClient()
  const { data: mountains } = await supabase
    .from('mountains')
    .select('*, routes(count)')
    .order('name')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Mountain className="text-mountain-primary" />
          База гор
        </h1>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {mountains?.map((mountain: any) => (
          <Link key={mountain.id} href={`/mountains/${mountain.id}`}>
            <Card hover className="h-full space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{mountain.name}</h2>
                <span className="text-sm font-mono text-mountain-accent">{mountain.height} м</span>
              </div>
              <p className="text-sm text-mountain-muted">{mountain.region}</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-mountain-muted">
                  {mountain.routes?.[0]?.count || 0} маршрутов
                </span>
                <span className="text-mountain-muted">•</span>
                <DifficultyBadge difficulty={mountain.difficulty} />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {(!mountains || mountains.length === 0) && (
        <Card>
          <p className="text-mountain-muted text-center">Горы пока не добавлены.</p>
        </Card>
      )}
    </div>
  )
}

function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const labels: Record<number, { text: string; color: string }> = {
    1: { text: 'Простая', color: 'text-mountain-success' },
    2: { text: 'Средняя', color: 'text-mountain-accent' },
    3: { text: 'Сложная', color: 'text-mountain-accent' },
    4: { text: 'Трудная', color: 'text-mountain-danger' },
    5: { text: 'Экстремальная', color: 'text-mountain-danger' },
  }
  const label = labels[difficulty] || labels[3]
  return <span className={`font-medium ${label.color}`}>{label.text}</span>
}
