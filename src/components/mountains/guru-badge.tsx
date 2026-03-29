'use client'

export function GuruBadge({ score }: { score: number }) {
  if (score <= 0) return null

  let className: string
  let label: string

  if (score >= 50) {
    className = 'text-xs px-1.5 py-0.5 rounded-full bg-yellow-500/30 text-yellow-300 font-bold'
    label = `🏆 ${score}`
  } else if (score >= 10) {
    className = 'text-xs px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 font-medium'
    label = `⛰ ${score}`
  } else {
    className = 'text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400'
    label = `🏔 ${score}`
  }

  return (
    <span className={className} title={`Гуру: ${score} принятых описаний и лайков`}>
      {label}
    </span>
  )
}
