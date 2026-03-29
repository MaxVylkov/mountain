'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Coffee, Sun, Moon, ChevronDown, ChevronUp, Download, Users, Calendar, Weight, Flame } from 'lucide-react'
import * as XLSX from 'xlsx'
import templates from '@/lib/data/ration-templates.json'

interface RationTemplate {
  id: string
  name: string
  description: string
  gramsPerPersonPerDay: number
  caloriesPerDay: number
  days: {
    day: number
    meals: {
      breakfast: Meal
      lunch: Meal
      dinner: Meal
    }
  }[]
}

interface Meal {
  name: string
  ingredients: { name: string; grams: number; calories: number }[]
  recipe: string
}

interface TeamRationsProps {
  teamId: string
  memberCount: number
  startDate: string | null
  endDate: string | null
}

export function TeamRations({ teamId, memberCount, startDate, endDate }: TeamRationsProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [people, setPeople] = useState(memberCount)
  const [activeTab, setActiveTab] = useState<'menu' | 'shopping'>('menu')
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set())

  const autoDays = useMemo(() => {
    if (!startDate || !endDate) return null
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : null
  }, [startDate, endDate])

  const [manualDays, setManualDays] = useState<number>(autoDays ?? 3)
  const days = autoDays ?? manualDays

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null
    return (templates as RationTemplate[]).find(t => t.id === selectedTemplateId) ?? null
  }, [selectedTemplateId])

  const totalWeight = useMemo(() => {
    if (!selectedTemplate) return 0
    return selectedTemplate.gramsPerPersonPerDay * people * days
  }, [selectedTemplate, people, days])

  const shoppingList = useMemo(() => {
    if (!selectedTemplate) return []
    const map = new Map<string, { grams: number; calories: number }>()
    const templateDays = selectedTemplate.days
    for (let d = 0; d < days; d++) {
      const dayData = templateDays[d % templateDays.length]
      const meals = [dayData.meals.breakfast, dayData.meals.lunch, dayData.meals.dinner]
      for (const meal of meals) {
        for (const ing of meal.ingredients) {
          const existing = map.get(ing.name) || { grams: 0, calories: 0 }
          map.set(ing.name, {
            grams: existing.grams + ing.grams * people,
            calories: existing.calories + ing.calories * people,
          })
        }
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, grams: data.grams, calories: data.calories }))
      .sort((a, b) => b.grams - a.grams)
  }, [selectedTemplate, people, days])

  const toggleMeal = (key: string) => {
    setExpandedMeals(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const exportToExcel = () => {
    if (!selectedTemplate) return
    const rows = shoppingList.map(item => ({
      'Продукт': item.name,
      'Вес (г)': item.grams,
      'Вес (кг)': Math.round(item.grams / 10) / 100,
      'Калории': item.calories,
    }))
    rows.push({
      'Продукт': 'ИТОГО',
      'Вес (г)': shoppingList.reduce((s, i) => s + i.grams, 0),
      'Вес (кг)': Math.round(shoppingList.reduce((s, i) => s + i.grams, 0) / 10) / 100,
      'Калории': shoppingList.reduce((s, i) => s + i.calories, 0),
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Список покупок')
    XLSX.writeFile(wb, `раскладка_${selectedTemplate.id}_${people}чел_${days}дн.xlsx`)
  }

  const mealIcon = (type: 'breakfast' | 'lunch' | 'dinner') => {
    switch (type) {
      case 'breakfast': return <Coffee className="w-4 h-4" />
      case 'lunch': return <Sun className="w-4 h-4" />
      case 'dinner': return <Moon className="w-4 h-4" />
    }
  }

  const mealLabel = (type: 'breakfast' | 'lunch' | 'dinner') => {
    switch (type) {
      case 'breakfast': return 'Завтрак'
      case 'lunch': return 'Обед'
      case 'dinner': return 'Ужин'
    }
  }

  // Template selection grid
  if (!selectedTemplate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-mountain-muted" />
            <label className="text-sm text-mountain-muted">Человек:</label>
            <input
              type="number"
              min={1}
              max={30}
              value={people}
              onChange={e => setPeople(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 rounded-lg bg-mountain-surface border border-mountain-border px-2 py-1 text-sm text-mountain-text"
            />
          </div>
          {!autoDays && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-mountain-muted" />
              <label className="text-sm text-mountain-muted">Дней:</label>
              <input
                type="number"
                min={1}
                max={30}
                value={manualDays}
                onChange={e => setManualDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 rounded-lg bg-mountain-surface border border-mountain-border px-2 py-1 text-sm text-mountain-text"
              />
            </div>
          )}
          {autoDays && (
            <span className="text-sm text-mountain-muted">
              <Calendar className="w-4 h-4 inline mr-1" />
              {autoDays} дн. (по датам похода)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(templates as RationTemplate[]).map(t => (
            <Card
              key={t.id}
              hover
              onClick={() => setSelectedTemplateId(t.id)}
              className="flex flex-col gap-2"
            >
              <h3 className="font-semibold text-mountain-text">{t.name}</h3>
              <p className="text-sm text-mountain-muted">{t.description}</p>
              <div className="flex items-center gap-4 mt-auto pt-2 text-xs text-mountain-muted">
                <span className="flex items-center gap-1">
                  <Weight className="w-3.5 h-3.5" />
                  {t.gramsPerPersonPerDay} г/чел/день
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  {t.caloriesPerDay} ккал/день
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Detail view
  const templateDays = selectedTemplate.days
  const displayDays = Array.from({ length: days }, (_, i) => ({
    dayNumber: i + 1,
    data: templateDays[i % templateDays.length],
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => setSelectedTemplateId(null)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Назад
        </Button>
        <h3 className="font-semibold text-mountain-text text-lg">{selectedTemplate.name}</h3>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-mountain-muted text-xs mb-1">
            <Users className="w-3.5 h-3.5" />
            Человек
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPeople(p => Math.max(1, p - 1))}
              className="w-6 h-6 rounded-full bg-mountain-surface border border-mountain-border text-mountain-text text-sm flex items-center justify-center hover:bg-mountain-border"
            >
              −
            </button>
            <span className="text-xl font-bold text-mountain-text">{people}</span>
            <button
              onClick={() => setPeople(p => p + 1)}
              className="w-6 h-6 rounded-full bg-mountain-surface border border-mountain-border text-mountain-text text-sm flex items-center justify-center hover:bg-mountain-border"
            >
              +
            </button>
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-mountain-muted text-xs mb-1">
            <Calendar className="w-3.5 h-3.5" />
            Дней
          </div>
          <span className="text-xl font-bold text-mountain-text">{days}</span>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-mountain-muted text-xs mb-1">
            <Weight className="w-3.5 h-3.5" />
            Общий вес
          </div>
          <span className="text-xl font-bold text-mountain-text">
            {totalWeight >= 1000 ? `${(totalWeight / 1000).toFixed(1)} кг` : `${totalWeight} г`}
          </span>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-mountain-muted text-xs mb-1">
            <Flame className="w-3.5 h-3.5" />
            г/чел/день
          </div>
          <span className="text-xl font-bold text-mountain-text">{selectedTemplate.gramsPerPersonPerDay}</span>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-mountain-border pb-1">
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'menu'
              ? 'text-mountain-primary border-b-2 border-mountain-primary'
              : 'text-mountain-muted hover:text-mountain-text'
          }`}
        >
          Меню по дням
        </button>
        <button
          onClick={() => setActiveTab('shopping')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'shopping'
              ? 'text-mountain-primary border-b-2 border-mountain-primary'
              : 'text-mountain-muted hover:text-mountain-text'
          }`}
        >
          Список покупок
        </button>
      </div>

      {/* Menu tab */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          {displayDays.map(({ dayNumber, data }) => (
            <Card key={dayNumber} className="p-4">
              <h4 className="font-semibold text-mountain-text mb-3">День {dayNumber}</h4>
              <div className="space-y-2">
                {(['breakfast', 'lunch', 'dinner'] as const).map(type => {
                  const meal = data.meals[type]
                  const key = `${dayNumber}-${type}`
                  const isExpanded = expandedMeals.has(key)
                  const mealGrams = meal.ingredients.reduce((s, i) => s + i.grams, 0)
                  const mealCalories = meal.ingredients.reduce((s, i) => s + i.calories, 0)

                  return (
                    <div key={key} className="rounded-lg bg-mountain-surface/50 border border-mountain-border/50">
                      <button
                        onClick={() => toggleMeal(key)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-mountain-surface transition-colors rounded-lg"
                      >
                        <span className="text-mountain-muted">{mealIcon(type)}</span>
                        <span className="text-xs text-mountain-muted w-14">{mealLabel(type)}</span>
                        <span className="text-sm text-mountain-text flex-1">{meal.name}</span>
                        <span className="text-xs text-mountain-muted">{mealGrams}г · {mealCalories} ккал</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-mountain-muted" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-mountain-muted" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-3">
                          <div>
                            <p className="text-xs font-medium text-mountain-muted mb-1.5">Ингредиенты (на 1 чел.):</p>
                            <ul className="space-y-1">
                              {meal.ingredients.map((ing, i) => (
                                <li key={i} className="flex items-center justify-between text-sm">
                                  <span className="text-mountain-text">{ing.name}</span>
                                  <span className="text-mountain-muted text-xs">{ing.grams}г · {ing.calories} ккал</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {meal.recipe && (
                            <div>
                              <p className="text-xs font-medium text-mountain-muted mb-1.5">Рецепт:</p>
                              <p className="text-sm text-mountain-text/80 leading-relaxed">{meal.recipe}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Shopping tab */}
      {activeTab === 'shopping' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={exportToExcel} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Экспорт в Excel
            </Button>
          </div>

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mountain-border bg-mountain-surface/50">
                  <th className="text-left px-4 py-2.5 text-mountain-muted font-medium">Продукт</th>
                  <th className="text-right px-4 py-2.5 text-mountain-muted font-medium">Вес (г)</th>
                  <th className="text-right px-4 py-2.5 text-mountain-muted font-medium hidden sm:table-cell">Вес (кг)</th>
                  <th className="text-right px-4 py-2.5 text-mountain-muted font-medium">Калории</th>
                </tr>
              </thead>
              <tbody>
                {shoppingList.map((item, i) => (
                  <tr key={i} className="border-b border-mountain-border/30">
                    <td className="px-4 py-2 text-mountain-text">{item.name}</td>
                    <td className="px-4 py-2 text-right text-mountain-text">{item.grams}</td>
                    <td className="px-4 py-2 text-right text-mountain-text hidden sm:table-cell">
                      {(item.grams / 1000).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-mountain-text">{item.calories}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-mountain-surface/50 font-semibold">
                  <td className="px-4 py-2.5 text-mountain-text">Итого</td>
                  <td className="px-4 py-2.5 text-right text-mountain-text">
                    {shoppingList.reduce((s, i) => s + i.grams, 0)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-mountain-text hidden sm:table-cell">
                    {(shoppingList.reduce((s, i) => s + i.grams, 0) / 1000).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-mountain-text">
                    {shoppingList.reduce((s, i) => s + i.calories, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>
      )}
    </div>
  )
}
