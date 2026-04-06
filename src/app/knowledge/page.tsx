import { createClient } from '@/lib/supabase/server'
import { BookOpen } from 'lucide-react'
import { KnowledgeGraph } from '@/components/knowledge/knowledge-graph'
import { NextStepBanner } from '@/components/flow/next-step-banner'

export default async function KnowledgePage() {
  const supabase = await createClient()

  const { data: nodes } = await supabase
    .from('kg_nodes')
    .select('*')
    .order('level')
    .order('title')

  const { data: edges } = await supabase
    .from('kg_edges')
    .select('*')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <BookOpen className="text-mountain-primary" />
        Граф знаний
      </h1>
      <p className="text-mountain-muted">
        Интерактивная карта знаний альпиниста на основе учебника «Школа альпинизма» ФАР.
        Изучай темы, отслеживай прогресс.
      </p>
      <KnowledgeGraph nodes={nodes || []} edges={edges || []} />
      <NextStepBanner currentModule="knowledge" />
    </div>
  )
}
