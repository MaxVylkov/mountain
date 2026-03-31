'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown, ChevronRight, MapPin, Anchor, Backpack, Dumbbell,
  MessageSquare, BookOpen, Globe, Users, UtensilsCrossed, Map,
  HelpCircle, Compass,
} from 'lucide-react'

type Level = 'beginner' | 'intermediate' | 'advanced' | null

interface GuideItem {
  icon: React.ElementType
  title: string
  href: string
  desc: string
}

interface FaqItem {
  q: string
  a: string
}

const beginnerGuide: GuideItem[] = [
  {
    icon: BookOpen,
    title: 'Граф знаний',
    href: '/knowledge',
    desc: 'Начни отсюда. Интерактивная карта понятий: снаряжение, страховка, тактика движения. Читай узлы — переходи дальше по связям.',
  },
  {
    icon: Anchor,
    title: 'Узлы',
    href: '/knots',
    desc: 'Изучи восьмёрку, булинь, схватывающий, стремя и УИАА — это минимальный набор для первых выходов. Пошаговые схемы с проверкой.',
  },
  {
    icon: Backpack,
    title: 'Кладовка',
    href: '/gear',
    desc: 'Создай список личного снаряжения. В разделе "С чего начать" есть готовый стартовый набор — можно добавить одним нажатием.',
  },
  {
    icon: Dumbbell,
    title: 'Тренировки',
    href: '/training',
    desc: 'Сохрани 2–3 базовых тренировки: кардиобаза, ноги и кор. Начни за 3–4 месяца до первого выхода.',
  },
  {
    icon: MessageSquare,
    title: 'Форум',
    href: '/forum',
    desc: 'Задавай любые вопросы в разделе "Новичкам". Там же найдёшь отчёты с маршрутов и советы по снаряжению.',
  },
  {
    icon: Globe,
    title: 'Ресурсы',
    href: '/resources',
    desc: 'Сайт ФАР — список клубов и ближайшие сборы. Статьи Спорт-Марафона — введение в альпинизм, основы безопасности.',
  },
]

const expertGuide: GuideItem[] = [
  {
    icon: Map,
    title: 'Маршруты',
    href: '/mountains',
    desc: 'Ищи по горе, категории (1А–6А), региону. Детальные описания с рельефом, станциями и фотоматериалами.',
  },
  {
    icon: Users,
    title: 'Отделения',
    href: '/teams',
    desc: 'Создай команду — добавь участников по ссылке, прикрепи маршрут, распредели снаряжение по сборам, укажи даты.',
  },
  {
    icon: Backpack,
    title: 'Кладовка',
    href: '/gear',
    desc: 'Веди учёт личного снаряжения. Создавай сборы под конкретные маршруты и распределяй вещи по рюкзакам.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Раскладка',
    href: '/rations',
    desc: 'Планируй питание группы по дням: калории, вес, КБЖУ. Используй шаблоны или создавай своё меню.',
  },
  {
    icon: MessageSquare,
    title: 'Форум',
    href: '/forum',
    desc: 'Делись отчётами с маршрутов, прикрепляй маршрут к обсуждению. Ищи партнёров по связке или команду.',
  },
  {
    icon: MapPin,
    title: 'Поездки',
    href: '/trips',
    desc: 'Планируй логистику выхода: сроки, участники, маршрут. Всё в одном месте.',
  },
]

const beginnerFaq: FaqItem[] = [
  {
    q: 'С чего начать путь в альпинизм?',
    a: 'Найди секцию или клуб в своём городе — это самый надёжный путь. Там тебя научат базовым навыкам и выведут на первые сборы. Реестр клубов есть на сайте ФАР (alpfederation.ru). Параллельно изучи граф знаний на этой платформе — он даёт общую картину.',
  },
  {
    q: 'Нужен ли тренер или можно учиться самостоятельно?',
    a: 'Тренер обязателен для первого этапа. Страховка, передвижение по льду и скалам, работа с верёвкой — всё это требует живой практики под наблюдением. Самоучки в альпинизме — это серьёзный риск. Теорию можно учить самому, практику — только с инструктором.',
  },
  {
    q: 'Какой физической формой нужно обладать для первых сборов?',
    a: 'Базовый уровень: бегать 5 км без остановки, подтягиваться 5–8 раз, ходить с рюкзаком 10–15 кг по несколько часов. За 3–4 месяца до сборов начни кардиотренировки и укрепляй ноги и кор. Специфическая горная выносливость приходит в процессе.',
  },
  {
    q: 'Сколько стоит начальный комплект снаряжения?',
    a: 'Минимальный личный набор (система, каска, ботинки, ледоруб, кошки, спусковое устройство, жумар) — от 30 000 до 80 000 руб. в зависимости от брендов. На первых сборах часть снаряжения обычно выдаёт клуб — уточни заранее, что нужно покупать, а что будет предоставлено.',
  },
  {
    q: 'Нужно ли покупать всё сразу?',
    a: 'Нет. Начни с самого необходимого: хорошие горные ботинки, страховочная система, каска. Остальное можно брать у клуба или докупать постепенно. Не торопись с покупкой — после первых выездов ты лучше поймёшь, что именно нужно.',
  },
  {
    q: 'Что такое НП1 и как на него попасть?',
    a: 'НП1 — "Начальная подготовка, первый год". Это первый уровень обучения по системе ФАР: две недели в горах, изучение базовых техник, первые восхождения по маршрутам 1А–1Б. По итогам получаешь значок "Альпинист России". Попасть можно через клуб или записавшись напрямую на сборы ФАР.',
  },
  {
    q: 'Что взять на первые сборы?',
    a: 'Список зависит от района и времени года, но базово: треккинговые ботинки и горные ботинки, термобельё, флис, штормовая куртка и штаны, спальник, коврик, рюкзак 60–80 л, налобный фонарь, солнцезащитные очки (категория 4), аптечка. Уточняй список у инструктора — он знает специфику района.',
  },
  {
    q: 'Чем отличается альпинизм от горного туризма?',
    a: 'Горный туризм — передвижение по горам по тропам и перевалам, упор на выносливость и ориентирование. Альпинизм — восхождения на вершины с техническими элементами: скалы, лёд, страховка, верёвочная работа. Многие начинают с горного туризма и переходят в альпинизм.',
  },
  {
    q: 'Опасен ли альпинизм для начинающих?',
    a: 'Риски есть, но на учебных сборах они минимальны — группы работают на безопасных маршрутах под постоянным наблюдением инструктора. Большинство несчастных случаев происходит при самодеятельных выходах без опыта. Занятия в секции — самый безопасный способ начать.',
  },
  {
    q: 'Сколько времени нужно до первого восхождения?',
    a: '3–6 месяцев физической подготовки + 2 недели на учебных сборах НП1. Это минимум. За это время ты освоишь базовые техники и сделаешь первые восхождения на 1А–1Б. Не торопись — фундамент важнее скорости.',
  },
  {
    q: 'Что такое категория сложности 1А?',
    a: '1А — простейший класс альпийских маршрутов. Обычно некрутые снежные и осыпные склоны, несложный рельеф. Именно с таких маршрутов начинают новички на сборах НП1. Далее идут 1Б, 2А, 2Б вплоть до 6А — технически сложные стены.',
  },
  {
    q: 'Как выбрать горные ботинки?',
    a: 'Для начала подойдут ботинки класса B2 (полужёсткие) или B3 (жёсткие, для кошек). Важно: примеряй с треккинговым носком, стопа не должна гулять, пальцы не должны упираться. Бренды с хорошим соотношением цена/качество: Scarpa, La Sportiva, Salewa. Не покупай ботинки онлайн без примерки.',
  },
  {
    q: 'Как застраховаться для занятий альпинизмом?',
    a: 'Обычная туристическая страховка не покрывает альпинизм. Нужна страховка с опцией "активный спорт" или "горные виды спорта". Уточняй наличие покрытия поисково-спасательных работ и эвакуации вертолётом — это критично в горах. Популярные варианты: ERV, Polis812, Ingosstrakh Sport.',
  },
  {
    q: 'Можно ли начать в любом возрасте?',
    a: 'В альпинизм берут с 16–18 лет (в некоторых секциях с 14 лет с согласия родителей). Верхнего ограничения нет — люди начинают и в 40, и в 50. Главное — хорошая физическая форма и постепенное наращивание нагрузок.',
  },
  {
    q: 'На что обратить особое внимание на первых сборах?',
    a: 'Безопасность прежде всего: всегда слушай инструктора, не уходи от группы, проверяй снаряжение перед выходом. Акклиматизация — не торопись набирать высоту. Следи за погодой и самочувствием. Узлы — отработай до автоматизма ещё дома. И главное: не стесняйся задавать вопросы.',
  },
]

const expertFaq: FaqItem[] = [
  {
    q: 'Как организовать команду через платформу?',
    a: 'Создай отделение в разделе "Отделения", добавь маршрут и даты. Пригласи участников по ссылке или через поиск по email. Назначь снаряжение и раскладку прямо в командном разделе.',
  },
  {
    q: 'Как использовать раскладку для планирования питания?',
    a: 'Выбери шаблон или создай своё меню в разделе "Раскладка". Укажи количество участников и дней — система посчитает общий вес и калории. Можно экспортировать список закупок.',
  },
]

function getGuide(level: Level): GuideItem[] | null {
  if (level === 'beginner') return beginnerGuide
  if (level === 'intermediate' || level === 'advanced') return expertGuide
  return null
}

function getFaq(level: Level): FaqItem[] {
  if (level === 'beginner') return beginnerFaq
  return expertFaq
}

function getTitle(level: Level): string {
  if (level === 'beginner') return 'Что доступно новичку'
  return 'Инструменты платформы'
}

function getHint(level: Level): string {
  if (level === 'beginner')
    return 'Начни с Графа знаний — он даст общую картину. Потом узлы и снаряжение.'
  if (level === 'intermediate')
    return 'Создай отделение и попробуй распределить снаряжение через Кладовку.'
  return 'Маршруты, Отделения и Раскладка — главные инструменты перед выходом.'
}

interface Props {
  level: Level
}

export function OnboardingGuide({ level }: Props) {
  const [open, setOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const guide = getGuide(level)
  const faq = getFaq(level)
  if (!guide) return null

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`
          inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
          ${open
            ? 'border-mountain-accent/60 bg-mountain-accent/10 text-mountain-accent'
            : 'border-mountain-border bg-mountain-surface text-mountain-text hover:border-mountain-accent/50 hover:text-mountain-accent'
          }
        `}
      >
        <Compass size={15} className={open ? 'text-mountain-accent' : 'text-mountain-muted'} />
        С чего начать?
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ml-0.5 ${open ? 'rotate-180 text-mountain-accent' : 'text-mountain-muted'}`}
        />
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-mountain-border bg-mountain-surface overflow-hidden">

          {/* Platform sections */}
          <div className="px-5 py-3 border-b border-mountain-border bg-mountain-bg/40">
            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-mountain-accent">
              {getTitle(level)}
            </p>
          </div>

          <div className="divide-y divide-mountain-border">
            {guide.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-start gap-4 px-5 py-3.5 hover:bg-mountain-border/30 transition-colors group/item"
              >
                <item.icon
                  size={15}
                  className="mt-0.5 text-mountain-accent shrink-0 group-hover/item:text-mountain-primary transition-colors"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-mountain-text group-hover/item:text-white transition-colors">
                      {item.title}
                    </p>
                    <ChevronRight size={12} className="text-mountain-border group-hover/item:text-mountain-accent transition-colors shrink-0" />
                  </div>
                  <p className="text-xs text-mountain-muted mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="px-5 py-2.5 border-t border-mountain-border bg-mountain-bg/40">
            <p className="text-xs text-mountain-muted">
              {getHint(level)}
            </p>
          </div>

          {/* FAQ */}
          <div className="border-t border-mountain-border">
            <div className="px-5 py-3 bg-mountain-bg/40 border-b border-mountain-border flex items-center gap-2">
              <HelpCircle size={13} className="text-mountain-accent shrink-0" />
              <p className="text-xs font-semibold tracking-[0.14em] uppercase text-mountain-accent">
                Вопрос / Ответ
              </p>
            </div>
            <div className="divide-y divide-mountain-border">
              {faq.map((item, idx) => (
                <div key={idx}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-start justify-between gap-3 px-5 py-3.5 text-left hover:bg-mountain-border/30 transition-colors"
                  >
                    <span className="text-sm text-mountain-text leading-snug">{item.q}</span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 mt-0.5 text-mountain-muted transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-4 text-sm text-mountain-muted leading-relaxed border-t border-mountain-border/50 bg-mountain-bg/30">
                      <div className="pt-3">{item.a}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
