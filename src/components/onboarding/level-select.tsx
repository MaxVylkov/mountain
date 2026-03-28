'use client'

import { useState } from 'react'
import { Mountain, MountainSnow } from 'lucide-react'
import { motion } from 'framer-motion'

type Level = 'beginner' | 'intermediate' | 'advanced'

interface LevelSelectProps {
  onSelect: (level: Level) => void
}

const levels = [
  {
    key: 'beginner' as Level,
    icon: Mountain,
    title: 'Новичок',
    description: 'Первый-второй сезон. Хочу узнать основы и собраться в первую поездку',
    subtitle: 'НП-1, НП-2',
  },
  {
    key: 'intermediate' as Level,
    icon: MountainSnow,
    title: 'Значкист',
    description: 'Хожу 1Б-2Б. Хочу расти, планировать восхождения и найти компанию',
    subtitle: '3-й разряд',
  },
  {
    key: 'advanced' as Level,
    icon: Mountain,
    title: 'Разрядник',
    description: '2-й разряд и выше. Нужна база маршрутов и инструменты планирования',
    subtitle: '2-й разряд+',
  },
] as const

export function LevelSelect({ onSelect }: LevelSelectProps) {
  const [selected, setSelected] = useState<Level | null>(null)

  function handleSelect(level: Level) {
    setSelected(level)
    onSelect(level)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-8 text-mountain-text">
        Какой у тебя опыт?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {levels.map((level, index) => {
          const isSelected = selected === level.key
          const Icon = level.icon

          return (
            <motion.div
              key={level.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              onClick={() => handleSelect(level.key)}
              className={`
                bg-mountain-surface border rounded-xl p-6 cursor-pointer transition-all
                ${isSelected
                  ? 'ring-2 ring-mountain-primary border-mountain-primary'
                  : 'border-mountain-border hover:border-mountain-primary/50'
                }
              `}
            >
              <div
                className={`
                  w-16 h-16 rounded-full flex items-center justify-center mb-4
                  ${isSelected ? 'bg-mountain-primary/20' : 'bg-mountain-primary/10'}
                `}
              >
                <Icon
                  size={40}
                  className={isSelected ? 'text-mountain-primary' : 'text-mountain-primary/70'}
                  strokeWidth={level.key === 'advanced' ? 2.5 : 1.5}
                />
              </div>

              <h3 className="text-xl font-bold text-mountain-text">{level.title}</h3>
              <p className="text-sm text-mountain-muted mt-2">{level.description}</p>
              <span className="text-xs px-2 py-1 rounded-full bg-mountain-surface border border-mountain-border text-mountain-muted mt-3 inline-block">
                {level.subtitle}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
