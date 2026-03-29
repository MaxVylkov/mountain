'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Calendar, Weight, Flame, ChevronRight, ShoppingCart, ChefHat } from 'lucide-react'
import templates from '@/lib/data/ration-templates.json'
import { RationDetail } from './ration-detail'

type Template = (typeof templates)[number]

export function RationsModule() {
  const [selected, setSelected] = useState<Template | null>(null)
  const [people, setPeople] = useState(4)
  const [days, setDays] = useState(3)

  if (selected) {
    return (
      <RationDetail
        template={selected}
        people={people}
        days={days}
        onBack={() => setSelected(null)}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Calculator inputs */}
      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-bold">Калькулятор</h2>
        <div className="flex flex-wrap gap-6">
          <div className="space-y-1">
            <label className="text-sm text-mountain-muted flex items-center gap-1.5">
              <Users size={14} /> Количество человек
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPeople(Math.max(1, people - 1))}
                className="w-8 h-8 rounded-lg bg-mountain-surface border border-mountain-border text-mountain-text hover:border-mountain-primary transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center font-mono font-bold text-lg">{people}</span>
              <button
                onClick={() => setPeople(Math.min(20, people + 1))}
                className="w-8 h-8 rounded-lg bg-mountain-surface border border-mountain-border text-mountain-text hover:border-mountain-primary transition-colors"
              >
                +
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-mountain-muted flex items-center gap-1.5">
              <Calendar size={14} /> Количество дней
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDays(Math.max(1, days - 1))}
                className="w-8 h-8 rounded-lg bg-mountain-surface border border-mountain-border text-mountain-text hover:border-mountain-primary transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center font-mono font-bold text-lg">{days}</span>
              <button
                onClick={() => setDays(Math.min(30, days + 1))}
                className="w-8 h-8 rounded-lg bg-mountain-surface border border-mountain-border text-mountain-text hover:border-mountain-primary transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Templates */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Выбери шаблон раскладки</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const totalWeight = (tpl.gramsPerPersonPerDay * people * days / 1000).toFixed(1)
            return (
              <Card
                key={tpl.id}
                hover
                className="p-4 space-y-3 cursor-pointer"
                onClick={() => setSelected(tpl)}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-mountain-text">{tpl.name}</h3>
                  <ChevronRight size={18} className="text-mountain-muted flex-shrink-0 mt-0.5" />
                </div>
                <p className="text-xs text-mountain-muted">{tpl.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-mountain-muted">
                  <span className="flex items-center gap-1">
                    <Weight size={12} />
                    {tpl.gramsPerPersonPerDay} г/чел/день
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame size={12} />
                    {tpl.caloriesPerDay} ккал/день
                  </span>
                </div>
                <div className="pt-2 border-t border-mountain-border/50 flex justify-between text-xs">
                  <span className="text-mountain-muted">На {people} чел. × {days} дн.</span>
                  <span className="text-mountain-primary font-medium">{totalWeight} кг</span>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
