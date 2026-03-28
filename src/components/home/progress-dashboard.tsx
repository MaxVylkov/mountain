'use client'

import Link from 'next/link'
import type { StageProgress } from '@/lib/onboarding'

const stageAccentColors: Record<string, string> = {
  foothills: 'mountain-success',
  basecamp: 'mountain-primary',
  assault: 'mountain-accent',
  summit: 'mountain-danger',
}

interface ProgressDashboardProps {
  displayName: string
  stages: StageProgress[]
}

export default function ProgressDashboard({ displayName, stages }: ProgressDashboardProps) {
  const currentStage =
    stages.find((s) => s.overallProgress < 100) ?? stages[stages.length - 1]

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">Привет, {displayName}!</h1>
        <p className="text-mountain-muted">Ты на этапе: {currentStage.name}</p>
      </div>

      {/* Stage cards */}
      <div className="space-y-4">
        {stages.map((stage) => {
          const isCurrent = stage.id === currentStage.id
          const isCompleted = stage.overallProgress >= 100
          const accent = stageAccentColors[stage.id] ?? 'mountain-primary'

          // Find first incomplete module for "continue" link
          const firstIncompleteModule = stage.modules.find((m) => m.progress < 100)

          return (
            <div
              key={stage.id}
              className={`bg-mountain-surface border rounded-xl p-4 ${
                isCurrent
                  ? `border-mountain-primary ring-1 ring-mountain-primary/30`
                  : 'border-mountain-border'
              } ${isCompleted && !isCurrent ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    {isCompleted && (
                      <svg
                        className={`w-5 h-5 text-${accent}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                    {stage.name}
                  </h3>
                  <p className="text-sm text-mountain-muted mt-0.5">{stage.description}</p>
                </div>
                <span className="text-xs text-mountain-muted whitespace-nowrap ml-4">
                  {stage.overallProgress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-mountain-border mt-3">
                <div
                  className={`h-2 rounded-full bg-${accent} transition-all duration-500`}
                  style={{ width: `${stage.overallProgress}%` }}
                />
              </div>

              {/* Module pills */}
              <div className="flex flex-wrap gap-2 mt-3">
                {stage.modules.map((mod) => (
                  <Link
                    key={mod.href}
                    href={mod.href}
                    className="text-xs px-3 py-1 rounded-full bg-mountain-primary/10 text-mountain-primary hover:bg-mountain-primary/20 transition-colors"
                  >
                    {mod.name} {mod.progress > 0 && mod.progress < 100 && `${mod.progress}%`}
                  </Link>
                ))}
              </div>

              {/* Continue button for current stage */}
              {isCurrent && firstIncompleteModule && (
                <Link
                  href={firstIncompleteModule.href}
                  className={`inline-block mt-3 text-sm font-medium text-${accent} hover:underline`}
                >
                  Продолжить &rarr;
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom link */}
      <Link
        href="/onboard?view=true"
        className="inline-block text-mountain-primary hover:underline text-sm font-medium"
      >
        Мой путь к вершине &rarr;
      </Link>
    </div>
  )
}
