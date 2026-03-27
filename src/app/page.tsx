import Link from 'next/link'
import { Mountain, Backpack, BookOpen, Grip, Dumbbell, Navigation } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const modules = [
  {
    href: '/mountains',
    icon: Mountain,
    title: 'База маршрутов',
    description: 'Каталог маршрутов с описанием сложности и сезонности',
  },
  {
    href: '/gear',
    icon: Backpack,
    title: 'Кладовка',
    description: 'Учёт снаряжения, режим сборов с распределением по рюкзакам',
  },
  {
    href: '/knowledge',
    icon: BookOpen,
    title: 'Граф знаний',
    description: 'Интерактивная карта знаний альпиниста из учебника',
  },
  {
    href: '/knots',
    icon: Grip,
    title: 'Узлы',
    description: 'Изучай узлы пошагово — от простых к сложным, как в Duolingo',
  },
  {
    href: '/training',
    icon: Dumbbell,
    title: 'Тренировки',
    description: 'Упражнения и рекомендации для подготовки к восхождениям',
  },
  {
    href: '/trips',
    icon: Navigation,
    title: 'Поездки',
    description: 'Планируй восхождение, собирай снаряжение и выходи на маршрут',
  },
]

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="flex flex-col items-center text-center py-16 space-y-6">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          <span className="text-mountain-primary">Mount</span>aine
        </h1>
        <p className="max-w-2xl text-lg text-mountain-muted">
          Готовься к восхождениям, тренируйся и учись.
          Всё, что нужно альпинисту — в одном месте.
        </p>
        <div className="flex gap-4">
          <Link href="/trips/new">
            <Button>Собираюсь в горы</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline">Начать бесплатно</Button>
          </Link>
        </div>
      </section>

      {/* Modules */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card hover className="h-full space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mountain-primary/10">
                <Icon size={24} className="text-mountain-primary" />
              </div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-mountain-muted">{description}</p>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
