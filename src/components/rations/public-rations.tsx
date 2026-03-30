'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Users, Calendar, Weight, Flame, ChevronRight, ChevronDown, ChevronUp, Coffee, Sun, Moon, Download, ShoppingCart, Utensils } from 'lucide-react'
import * as XLSX from 'xlsx'
import templates from '@/lib/data/ration-templates.json'

interface Ingredient { name: string; grams: number; calories: number }
interface Meal { name: string; ingredients: Ingredient[]; recipe: string }
interface DayMenu { day: number; meals: { breakfast: Meal; lunch: Meal; dinner: Meal } }
interface Template {
  id: string; name: string; description: string
  gramsPerPersonPerDay: number; caloriesPerDay: number; days: DayMenu[]
}

const MEAL_ICON = { breakfast: Coffee, lunch: Sun, dinner: Moon }
const MEAL_LABEL = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин' }

export function PublicRations() {
  const [selected, setSelected] = useState<Template | null>(null)
  const [people, setPeople] = useState(6)
  const [days, setDays] = useState(5)
  const [activeTab, setActiveTab] = useState<'menu' | 'shopping' | 'distribution'>('shopping')
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set())
  const [memberNames, setMemberNames] = useState<string[]>([])
  const [showNamesInput, setShowNamesInput] = useState(false)

  // Sync memberNames length with people
  const names = useMemo(() => {
    const arr = [...memberNames]
    while (arr.length < people) arr.push(`Участник ${arr.length + 1}`)
    return arr.slice(0, people)
  }, [memberNames, people])

  const shoppingList = useMemo(() => {
    if (!selected) return []
    const map = new Map<string, { grams: number; calories: number }>()
    for (let d = 0; d < days; d++) {
      const dayData = selected.days[d % selected.days.length]
      for (const meal of Object.values(dayData.meals)) {
        for (const ing of meal.ingredients) {
          const ex = map.get(ing.name) || { grams: 0, calories: 0 }
          map.set(ing.name, { grams: ex.grams + ing.grams * people, calories: ex.calories + ing.calories * people })
        }
      }
    }
    return Array.from(map.entries()).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.grams - a.grams)
  }, [selected, people, days])

  // Distribute items evenly across people
  const distribution = useMemo(() => {
    if (!shoppingList.length || !people) return []
    const perPerson = Math.ceil(shoppingList.length / people)
    return names.map((name, i) => ({
      name,
      items: shoppingList.slice(i * perPerson, (i + 1) * perPerson),
      totalGrams: shoppingList.slice(i * perPerson, (i + 1) * perPerson).reduce((s, it) => s + it.grams, 0),
    }))
  }, [shoppingList, people, names])

  const totalWeight = shoppingList.reduce((s, i) => s + i.grams, 0)

  const exportToExcel = () => {
    if (!selected) return
    const wb = XLSX.utils.book_new()

    // Shopping list sheet
    const rows = shoppingList.map(item => ({
      'Продукт': item.name,
      'Вес на группу, г': item.grams,
      'Вес на группу, кг': +(item.grams / 1000).toFixed(2),
      'Калории': item.calories,
    }))
    rows.push({ 'Продукт': 'ИТОГО', 'Вес на группу, г': totalWeight, 'Вес на группу, кг': +(totalWeight / 1000).toFixed(2), 'Калории': shoppingList.reduce((s, i) => s + i.calories, 0) })
    const ws1 = XLSX.utils.json_to_sheet(rows)
    ws1['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 18 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Список покупок')

    // Distribution sheet
    const distRows: Record<string, unknown>[] = []
    distribution.forEach(person => {
      person.items.forEach((item, i) => {
        distRows.push({
          'Участник': i === 0 ? person.name : '',
          'Продукт': item.name,
          'Вес, г': item.grams,
          'Вес, кг': +(item.grams / 1000).toFixed(2),
        })
      })
      distRows.push({ 'Участник': '', 'Продукт': `Итого ${person.name}`, 'Вес, г': person.totalGrams, 'Вес, кг': +(person.totalGrams / 1000).toFixed(2) })
      distRows.push({ 'Участник': '', 'Продукт': '', 'Вес, г': '', 'Вес, кг': '' })
    })
    const ws2 = XLSX.utils.json_to_sheet(distRows)
    ws2['!cols'] = [{ wch: 20 }, { wch: 36 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Распределение')

    XLSX.writeFile(wb, `общественная_раскладка_${selected.id}_${people}чел_${days}дн.xlsx`)
  }

  // ── Template selection ──────────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="space-y-6">
        {/* Calculator */}
        <Card className="p-5 space-y-4">
          <h2 className="text-base font-bold">Параметры группы</h2>
          <div className="flex flex-wrap gap-6">
            <div className="space-y-1">
              <label className="text-sm text-mountain-muted flex items-center gap-1.5"><Users size={14} /> Человек</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setPeople(p => Math.max(1, p - 1))} className="w-8 h-8 rounded-lg bg-mountain-surface border border-mountain-border text-mountain-text hover:border-mountain-primary transition-colors">−</button>
                <span className="w-8 text-center font-mono font-bold text-lg">{people}</span>
                <button onClick={() => setPeople(p => Math.min(30, p + 1))} className="w-8 h-8 rounded-lg bg-mountain-surface border border-mountain-border text-mountain-text hover:border-mountain-primary transition-colors">+</button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-mountain-muted flex items-center gap-1.5"><Calendar size={14} /> Дней</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setDays(d => Math.max(1, d - 1))} className="w-8 h-8 rounded-lg bg-mountain-surface border border-mountain-border text-mountain-text hover:border-mountain-primary transition-colors">−</button>
                <span className="w-8 text-center font-mono font-bold text-lg">{days}</span>
                <button onClick={() => setDays(d => Math.min(30, d + 1))} className="w-8 h-8 rounded-lg bg-mountain-surface border border-mountain-border text-mountain-text hover:border-mountain-primary transition-colors">+</button>
              </div>
            </div>
          </div>
        </Card>

        {/* Templates */}
        <div className="space-y-3">
          <h2 className="text-base font-bold">Выбери шаблон раскладки</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(templates as Template[]).map(tpl => {
              const totalKg = (tpl.gramsPerPersonPerDay * people * days / 1000).toFixed(1)
              return (
                <Card key={tpl.id} hover className="p-4 space-y-3 cursor-pointer" onClick={() => setSelected(tpl)}>
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-mountain-text">{tpl.name}</h3>
                    <ChevronRight size={18} className="text-mountain-muted shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-mountain-muted">{tpl.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-mountain-muted">
                    <span className="flex items-center gap-1"><Weight size={12} />{tpl.gramsPerPersonPerDay} г/чел/день</span>
                    <span className="flex items-center gap-1"><Flame size={12} />{tpl.caloriesPerDay} ккал/день</span>
                  </div>
                  <div className="pt-2 border-t border-mountain-border/50 flex justify-between text-xs">
                    <span className="text-mountain-muted">На {people} чел. × {days} дн.</span>
                    <span className="text-mountain-primary font-medium">{totalKg} кг</span>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Detail view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <button onClick={() => setSelected(null)} className="text-sm text-mountain-muted hover:text-mountain-text transition-colors mb-1">← Назад</button>
          <h2 className="text-xl font-bold">{selected.name}</h2>
          <p className="text-sm text-mountain-muted">{people} чел. · {days} дн. · {(totalWeight / 1000).toFixed(1)} кг</p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mountain-primary text-white text-sm font-medium hover:bg-mountain-primary/80 transition-colors"
        >
          <Download size={15} />
          Скачать .xlsx
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-mountain-border gap-1">
        {([
          { key: 'shopping', label: 'Список покупок', icon: ShoppingCart },
          { key: 'menu', label: 'Меню', icon: Utensils },
          { key: 'distribution', label: 'Распределение', icon: Users },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key ? 'border-mountain-primary text-mountain-primary' : 'border-transparent text-mountain-muted hover:text-mountain-text'
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* Shopping list */}
      {activeTab === 'shopping' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-mountain-muted font-medium px-1">
            <span>Продукт</span>
            <div className="flex gap-6">
              <span>Калории</span>
              <span className="w-16 text-right">Вес, кг</span>
            </div>
          </div>
          {shoppingList.map(item => (
            <Card key={item.name} className="flex items-center justify-between py-2.5 px-4">
              <span className="text-sm text-mountain-text flex-1">{item.name}</span>
              <div className="flex gap-6 items-center shrink-0">
                <span className="text-xs text-mountain-muted w-16 text-right">{item.calories} ккал</span>
                <span className="text-sm font-mono text-mountain-accent w-14 text-right">{(item.grams / 1000).toFixed(2)} кг</span>
              </div>
            </Card>
          ))}
          <Card className="flex items-center justify-between py-2.5 px-4 border-mountain-primary/30">
            <span className="text-sm font-bold text-mountain-text">Итого</span>
            <div className="flex gap-6">
              <span className="text-xs text-mountain-muted w-16 text-right">{shoppingList.reduce((s, i) => s + i.calories, 0)} ккал</span>
              <span className="text-sm font-mono font-bold text-mountain-accent w-14 text-right">{(totalWeight / 1000).toFixed(2)} кг</span>
            </div>
          </Card>
        </div>
      )}

      {/* Menu */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          {Array.from({ length: days }).map((_, di) => {
            const dayData = selected.days[di % selected.days.length]
            return (
              <Card key={di} className="space-y-3">
                <h3 className="font-semibold text-mountain-text">День {di + 1}</h3>
                {(['breakfast', 'lunch', 'dinner'] as const).map(mealType => {
                  const meal = dayData.meals[mealType]
                  const key = `${di}-${mealType}`
                  const Icon = MEAL_ICON[mealType]
                  const isOpen = expandedMeals.has(key)
                  return (
                    <div key={mealType} className="border-t border-mountain-border/40 pt-3">
                      <button
                        className="w-full flex items-center justify-between gap-2 text-left"
                        onClick={() => setExpandedMeals(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s })}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-mountain-muted" />
                          <span className="text-xs text-mountain-muted">{MEAL_LABEL[mealType]}</span>
                          <span className="text-sm font-medium text-mountain-text">{meal.name}</span>
                        </div>
                        {isOpen ? <ChevronUp size={16} className="text-mountain-muted" /> : <ChevronDown size={16} className="text-mountain-muted" />}
                      </button>
                      {isOpen && (
                        <div className="mt-2 pl-6 space-y-1">
                          {meal.ingredients.map(ing => (
                            <div key={ing.name} className="flex justify-between text-xs">
                              <span className="text-mountain-text">{ing.name}</span>
                              <span className="text-mountain-muted font-mono">{ing.grams * people} г</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </Card>
            )
          })}
        </div>
      )}

      {/* Distribution */}
      {activeTab === 'distribution' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-mountain-muted">Продукты распределены поровну по {people} участникам.</p>
            <button
              onClick={() => setShowNamesInput(v => !v)}
              className="text-xs text-mountain-primary hover:underline shrink-0"
            >
              {showNamesInput ? 'Скрыть имена' : 'Указать имена'}
            </button>
          </div>

          {showNamesInput && (
            <Card className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
              {Array.from({ length: people }).map((_, i) => (
                <input
                  key={i}
                  value={memberNames[i] ?? ''}
                  onChange={e => setMemberNames(prev => { const a = [...prev]; a[i] = e.target.value; return a })}
                  placeholder={`Участник ${i + 1}`}
                  className="rounded-lg border border-mountain-border bg-mountain-surface px-2.5 py-1.5 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
                />
              ))}
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {distribution.map(person => (
              <Card key={person.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-mountain-text">{person.name}</h3>
                  <span className="text-xs font-mono text-mountain-accent">{(person.totalGrams / 1000).toFixed(2)} кг</span>
                </div>
                <ul className="space-y-1">
                  {person.items.map(item => (
                    <li key={item.name} className="flex justify-between text-xs">
                      <span className="text-mountain-muted truncate flex-1">{item.name}</span>
                      <span className="text-mountain-text font-mono ml-2 shrink-0">{item.grams} г</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
