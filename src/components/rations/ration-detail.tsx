'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ShoppingCart, ChefHat, Sun, Coffee, Moon, Weight, Flame, Users, Calendar, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Ingredient {
  name: string
  grams: number
  calories: number
}

interface Meal {
  name: string
  ingredients: Ingredient[]
  recipe: string
}

interface DayMenu {
  day: number
  meals: {
    breakfast: Meal
    lunch: Meal
    dinner: Meal
  }
}

interface Template {
  id: string
  name: string
  description: string
  gramsPerPersonPerDay: number
  caloriesPerDay: number
  days: DayMenu[]
}

interface RationDetailProps {
  template: Template
  people: number
  days: number
  onBack: () => void
}

const MEAL_ICONS = {
  breakfast: { icon: Coffee, label: 'Завтрак', color: 'text-amber-400' },
  lunch: { icon: Sun, label: 'Обед', color: 'text-orange-400' },
  dinner: { icon: Moon, label: 'Ужин', color: 'text-blue-400' },
}

export function RationDetail({ template, people, days, onBack }: RationDetailProps) {
  const [tab, setTab] = useState<'menu' | 'shopping' | 'recipe'>('menu')
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)

  const totalWeightKg = (template.gramsPerPersonPerDay * people * days / 1000).toFixed(1)
  const totalCalories = template.caloriesPerDay * days

  // Generate day schedule (repeat template days if needed)
  const schedule: DayMenu[] = Array.from({ length: days }, (_, i) => {
    const templateDay = template.days[i % template.days.length]
    return { ...templateDay, day: i + 1 }
  })

  // Aggregate shopping list
  const shoppingMap = new Map<string, { grams: number; calories: number }>()
  schedule.forEach(day => {
    const meals = [day.meals.breakfast, day.meals.lunch, day.meals.dinner]
    meals.forEach(meal => {
      meal.ingredients.forEach(ing => {
        const existing = shoppingMap.get(ing.name) || { grams: 0, calories: 0 }
        shoppingMap.set(ing.name, {
          grams: existing.grams + ing.grams * people,
          calories: existing.calories + ing.calories * people,
        })
      })
    })
  })
  const shoppingList = Array.from(shoppingMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.grams - a.grams)

  function exportShopping() {
    const rows = shoppingList.map(item => ({
      'Продукт': item.name,
      'Вес (г)': item.grams,
      'Вес (кг)': (item.grams / 1000).toFixed(2),
    }))
    rows.push({
      'Продукт': 'ИТОГО',
      'Вес (г)': shoppingList.reduce((s, i) => s + i.grams, 0),
      'Вес (кг)': (shoppingList.reduce((s, i) => s + i.grams, 0) / 1000).toFixed(2),
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 10 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Список покупок')
    XLSX.writeFile(wb, `раскладка_${template.id}_${people}чел_${days}дн.xlsx`)
  }

  function toggleMeal(key: string) {
    setExpandedMeal(expandedMeal === key ? null : key)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-mountain-muted hover:text-mountain-text transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold">{template.name}</h2>
          <p className="text-sm text-mountain-muted">{template.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <Users size={16} className="mx-auto text-mountain-muted mb-1" />
          <p className="text-lg font-bold font-mono">{people}</p>
          <p className="text-xs text-mountain-muted">человек</p>
        </Card>
        <Card className="p-3 text-center">
          <Calendar size={16} className="mx-auto text-mountain-muted mb-1" />
          <p className="text-lg font-bold font-mono">{days}</p>
          <p className="text-xs text-mountain-muted">дней</p>
        </Card>
        <Card className="p-3 text-center">
          <Weight size={16} className="mx-auto text-mountain-muted mb-1" />
          <p className="text-lg font-bold font-mono">{totalWeightKg}</p>
          <p className="text-xs text-mountain-muted">кг общий вес</p>
        </Card>
        <Card className="p-3 text-center">
          <Flame size={16} className="mx-auto text-mountain-muted mb-1" />
          <p className="text-lg font-bold font-mono">{template.gramsPerPersonPerDay}</p>
          <p className="text-xs text-mountain-muted">г/чел/день</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-mountain-border">
        <button
          onClick={() => setTab('menu')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'menu' ? 'border-mountain-primary text-mountain-primary' : 'border-transparent text-mountain-muted hover:text-mountain-text'
          }`}
        >
          <Calendar size={16} />
          Меню по дням
        </button>
        <button
          onClick={() => setTab('shopping')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'shopping' ? 'border-mountain-primary text-mountain-primary' : 'border-transparent text-mountain-muted hover:text-mountain-text'
          }`}
        >
          <ShoppingCart size={16} />
          Список покупок
        </button>
      </div>

      {/* Menu tab */}
      {tab === 'menu' && (
        <div className="space-y-6">
          {schedule.map(dayMenu => (
            <div key={dayMenu.day} className="space-y-2">
              <h3 className="text-sm font-bold text-mountain-text">День {dayMenu.day}</h3>
              <div className="space-y-2">
                {(Object.entries(dayMenu.meals) as [keyof typeof MEAL_ICONS, Meal][]).map(([mealType, meal]) => {
                  const mealKey = `${dayMenu.day}-${mealType}`
                  const { icon: MealIcon, label, color } = MEAL_ICONS[mealType]
                  const isExpanded = expandedMeal === mealKey
                  const mealGrams = meal.ingredients.reduce((s, i) => s + i.grams, 0)
                  const mealCals = meal.ingredients.reduce((s, i) => s + i.calories, 0)

                  return (
                    <Card
                      key={mealKey}
                      className={`p-3 cursor-pointer transition-all ${isExpanded ? 'ring-1 ring-mountain-primary/30' : ''}`}
                      onClick={() => toggleMeal(mealKey)}
                    >
                      <div className="flex items-center gap-3">
                        <MealIcon size={18} className={color} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-mountain-muted">{label}</span>
                            <span className="text-sm font-medium text-mountain-text">{meal.name}</span>
                          </div>
                          <div className="flex gap-3 mt-0.5 text-xs text-mountain-muted">
                            <span>{mealGrams} г/чел</span>
                            <span>{mealCals} ккал</span>
                          </div>
                        </div>
                        <ChefHat size={14} className={`text-mountain-muted transition-transform ${isExpanded ? 'text-mountain-primary' : ''}`} />
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-mountain-border space-y-3" onClick={e => e.stopPropagation()}>
                          {/* Ingredients */}
                          <div>
                            <p className="text-xs font-medium text-mountain-muted mb-1.5">Ингредиенты (на 1 чел.):</p>
                            <div className="space-y-1">
                              {meal.ingredients.map((ing, i) => (
                                <div key={i} className="flex justify-between text-xs">
                                  <span className="text-mountain-text">{ing.name}</span>
                                  <span className="text-mountain-muted font-mono">{ing.grams} г</span>
                                </div>
                              ))}
                            </div>
                            {people > 1 && (
                              <p className="text-xs text-mountain-primary mt-1.5">
                                На {people} чел.: {mealGrams * people} г
                              </p>
                            )}
                          </div>

                          {/* Recipe */}
                          <div>
                            <p className="text-xs font-medium text-mountain-muted mb-1.5 flex items-center gap-1">
                              <ChefHat size={12} /> Рецепт:
                            </p>
                            <p className="text-xs text-mountain-text whitespace-pre-wrap leading-relaxed">{meal.recipe}</p>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shopping tab */}
      {tab === 'shopping' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-mountain-muted">
              На {people} чел. × {days} дн.
            </p>
            <button
              onClick={exportShopping}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border transition-colors"
            >
              <Download size={14} />
              Скачать Excel
            </button>
          </div>

          <Card className="divide-y divide-mountain-border/50">
            {shoppingList.map((item, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-2.5">
                <span className="text-sm text-mountain-text">{item.name}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-mono text-mountain-muted">{item.grams} г</span>
                  <span className="font-mono text-mountain-text font-medium w-16 text-right">
                    {(item.grams / 1000).toFixed(2)} кг
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center px-4 py-3 bg-mountain-primary/5">
              <span className="text-sm font-bold text-mountain-text">ИТОГО</span>
              <span className="font-mono font-bold text-mountain-primary">
                {(shoppingList.reduce((s, i) => s + i.grams, 0) / 1000).toFixed(2)} кг
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
