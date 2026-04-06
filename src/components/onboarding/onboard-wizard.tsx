'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LevelSelect } from './level-select'
import { JourneyMap } from './journey-map'
import type { User } from '@supabase/supabase-js'

type Level = 'beginner' | 'intermediate' | 'advanced'

interface Props {
  initialProgress?: { id: string; overallProgress: number }[]
  initialLevel?: Level
}

export function OnboardWizard({ initialProgress, initialLevel }: Props) {
  const router = useRouter()
  const isViewMode = !!initialLevel
  const [step, setStep] = useState<1 | 2>(isViewMode ? 2 : 1)
  const [level, setLevel] = useState<Level | null>(initialLevel ?? null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
      }
    })
  }, [])

  function handleLevelSelect(selected: Level) {
    setLevel(selected)
    setTimeout(() => setStep(2), 300)
  }

  async function handleComplete() {
    if (user) {
      const supabase = createClient()
      await supabase
        .from('profiles')
        .update({ onboarded: true })
        .eq('id', user.id)
    }
    router.push('/')
  }

  function handleBack() {
    setStep(1)
  }

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="level-select"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <LevelSelect onSelect={handleLevelSelect} />
          </motion.div>
        )}

        {step === 2 && level && (
          <motion.div
            key="journey-map"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {!isViewMode && (
              <button
                onClick={handleBack}
                className="mb-6 flex items-center gap-1 text-sm text-mountain-muted hover:text-mountain-text transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </button>
            )}

            <JourneyMap
              level={level}
              onComplete={handleComplete}
              viewMode={isViewMode}
              progress={initialProgress}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
