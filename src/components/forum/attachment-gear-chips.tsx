import Link from 'next/link'
import { Package } from 'lucide-react'

interface GearChip {
  gearId: string
  gearName: string
  category: string
}

interface Props {
  chips: GearChip[]
}

export function AttachmentGearChips({ chips }: Props) {
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(chip => (
        <Link
          key={chip.gearId}
          href={`/gear?highlight=${chip.gearId}`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-mountain-border bg-mountain-surface/50 text-xs text-mountain-text hover:border-mountain-primary transition-colors"
        >
          <Package className="w-3 h-3 text-mountain-muted" />
          {chip.gearName}
        </Link>
      ))}
    </div>
  )
}
