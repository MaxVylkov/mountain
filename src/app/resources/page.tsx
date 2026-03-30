import { Globe } from 'lucide-react'
import { ResourcesSection } from '@/components/training/resources-section'

export default function ResourcesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Globe className="text-mountain-primary" />
          Ресурсы
        </h1>
        <p className="text-mountain-muted mt-1 text-sm">
          Проверенные сайты, статьи и сообщества для альпинистов
        </p>
      </div>

      <ResourcesSection />
    </div>
  )
}
