'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ChevronRight, X, Backpack, Anchor, BookOpen, Dumbbell, HelpCircle,
} from 'lucide-react'

const GEAR_SECTIONS = [
  {
    title: 'Защита',
    items: ['Каска', 'Страховочная система (беседка)'],
  },
  {
    title: 'Передвижение',
    items: ['Ледоруб', 'Кошки', 'Жумар', 'Спусковое устройство (восьмёрка или Grigri)'],
  },
  {
    title: 'Верёвка и снаряжение',
    items: ['Основная верёвка 50–60 м', 'Вспомогательная верёвка (6–8 мм)', 'Карабины (6–8 шт)', 'Оттяжки (6–8 шт)'],
  },
  {
    title: 'Одежда и личное',
    items: ['Базовый слой (термобельё)', 'Флис / пуховик', 'Штормовая куртка и штаны', 'Перчатки (тонкие + тёплые)', 'Горные ботинки', 'Очки (категория 4)', 'Налобный фонарь + запасные батарейки'],
  },
]

const KNOTS = [
  { name: 'Восьмёрка', desc: 'Основной узел страховки' },
  { name: 'Булинь', desc: 'Для обвязки и закрепления' },
  { name: 'Схватывающий', desc: 'Прусик — самостраховка на спуске' },
  { name: 'Стремя', desc: 'Для организации станции' },
  { name: 'УИАА', desc: 'Динамическая страховка через карабин' },
]

const KG_SECTIONS = [
  { label: 'Снаряжение', href: '/knowledge' },
  { label: 'Страховка и самостраховка', href: '/knowledge' },
  { label: 'Основы передвижения', href: '/knowledge' },
]

const WORKOUTS = [
  { id: 'cardio-base', name: 'Кардиобаза', desc: 'Аэробная выносливость для длинных маршрутов' },
  { id: 'strength-legs', name: 'Ноги и кор', desc: 'Силовая подготовка под рюкзак' },
  { id: 'altitude', name: 'Высотная адаптация', desc: 'Что нужно знать до первого выхода' },
]


interface Props {
  userId: string
}

export function BeginnerDashboard({ userId }: Props) {
  const [dismissed, setDismissed] = useState(false)

  async function dismiss() {
    setDismissed(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ onboarded: true }).eq('id', userId)
  }

  if (dismissed) return null

  return (
    <div className="mb-10 rounded-xl border border-mountain-accent/30 bg-mountain-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-mountain-border">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-mountain-accent mb-0.5">
            С чего начать
          </p>
          <p className="text-mountain-muted text-sm">
            Базовый маршрут для новичка — разберись с этим в первую очередь
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Скрыть раздел навсегда"
          className="p-1.5 rounded-lg text-mountain-muted hover:text-mountain-text hover:bg-mountain-border/60 transition-colors shrink-0 ml-4"
        >
          <X size={16} />
        </button>
      </div>

      <div className="divide-y divide-mountain-border">

        {/* 1. Gear */}
        <section className="px-5 py-5">
          <div className="flex items-center gap-2 mb-4">
            <Backpack size={15} className="text-mountain-accent shrink-0" />
            <span className="text-sm font-semibold text-mountain-text">Базовое личное снаряжение</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {GEAR_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mountain-muted mb-1.5">
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-mountain-text">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mountain-border shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link
            href="/gear"
            className="inline-flex items-center gap-1.5 text-xs text-mountain-primary hover:text-mountain-primary/80 mt-4 transition-colors"
          >
            Добавить снаряжение в Кладовку
            <ChevronRight size={12} />
          </Link>
        </section>

        {/* 2. Knots */}
        <section className="px-5 py-5">
          <div className="flex items-center gap-2 mb-4">
            <Anchor size={15} className="text-mountain-accent shrink-0" />
            <span className="text-sm font-semibold text-mountain-text">Первые 5 узлов</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {KNOTS.map((knot) => (
              <div key={knot.name} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mountain-accent/60 shrink-0" />
                <div>
                  <span className="text-sm font-medium text-mountain-text">{knot.name}</span>
                  <span className="text-xs text-mountain-muted ml-2">{knot.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/knots"
            className="inline-flex items-center gap-1.5 text-xs text-mountain-primary hover:text-mountain-primary/80 mt-4 transition-colors"
          >
            Учить узлы пошагово
            <ChevronRight size={12} />
          </Link>
        </section>

        {/* 3. Knowledge graph */}
        <section className="px-5 py-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={15} className="text-mountain-accent shrink-0" />
            <span className="text-sm font-semibold text-mountain-text">Граф знаний — с чего начать</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {KG_SECTIONS.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-mountain-border text-sm text-mountain-text hover:border-mountain-primary/60 hover:text-white transition-colors"
              >
                {s.label}
                <ChevronRight size={12} className="text-mountain-muted" />
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Workouts */}
        <section className="px-5 py-5">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell size={15} className="text-mountain-accent shrink-0" />
            <span className="text-sm font-semibold text-mountain-text">Тренировки для начала</span>
          </div>
          <div className="space-y-2">
            {WORKOUTS.map((w) => (
              <div key={w.id} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mountain-accent/60 shrink-0" />
                <div>
                  <span className="text-sm font-medium text-mountain-text">{w.name}</span>
                  <span className="text-xs text-mountain-muted ml-2">{w.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/training"
            className="inline-flex items-center gap-1.5 text-xs text-mountain-primary hover:text-mountain-primary/80 mt-4 transition-colors"
          >
            Все тренировки
            <ChevronRight size={12} />
          </Link>
        </section>

        {/* 5. FAQ */}
        <section className="px-5 py-5">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={15} className="text-mountain-accent shrink-0" />
            <span className="text-sm font-semibold text-mountain-text">Частые вопросы новичка</span>
          </div>
          <p className="text-sm text-mountain-muted leading-relaxed mb-4">
            Собрали ответы на самые частые вопросы — снаряжение, первые сборы, физподготовка, разряды и не только.
          </p>
          <Link
            href="/forum/beginners"
            className="inline-flex items-center gap-1.5 text-xs text-mountain-primary hover:text-mountain-primary/80 transition-colors"
          >
            Читать на форуме в разделе «Новичкам»
            <ChevronRight size={12} />
          </Link>
        </section>

      </div>
    </div>
  )
}
