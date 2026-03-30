'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Package, Backpack } from 'lucide-react'
import { GearInventory } from './gear-inventory'
import { GearPacking } from './gear-packing'

interface GearItem {
  id: string
  name: string
  category: string
  description: string | null
  weight: number | null
  brand: string | null
}

export function GearModule({ catalog }: { catalog: GearItem[] }) {
  const [tab, setTab] = useState<'inventory' | 'packing'>('inventory')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 rounded-full border-2 border-mountain-border border-t-mountain-primary animate-spin" />
    </div>
  )

  if (!userId) {
    return (
      <Card className="py-12 text-center space-y-4">
        <div>
          <p className="font-semibold text-mountain-text mb-1">Управляй своим снаряжением</p>
          <p className="text-sm text-mountain-muted max-w-sm mx-auto">
            Веди учёт, отслеживай состояние и собирай списки для каждого выхода — всё в одном месте.
          </p>
        </div>
        <a
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-mountain-primary text-white text-sm font-medium hover:bg-mountain-primary/90 transition-colors"
        >
          Войти
        </a>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex border-b border-mountain-border">
        <button
          onClick={() => setTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'inventory'
              ? 'border-mountain-primary text-mountain-primary'
              : 'border-transparent text-mountain-muted hover:text-mountain-text'
          }`}
        >
          <Package size={18} />
          Моё снаряжение
        </button>
        <button
          onClick={() => setTab('packing')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'packing'
              ? 'border-mountain-primary text-mountain-primary'
              : 'border-transparent text-mountain-muted hover:text-mountain-text'
          }`}
        >
          <Backpack size={18} />
          Сборы
        </button>
      </div>

      {tab === 'inventory' && <GearInventory catalog={catalog} userId={userId} />}
      {tab === 'packing' && <GearPacking userId={userId} />}
    </div>
  )
}
