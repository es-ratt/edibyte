import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { EMPTY_DRAFT, useApp } from './useApp'

export const DEMO_MEAL = 'আমি দুপুরে এক প্লেট ভাত, এক বাটি ডাল, একটা ডিম আর আলু ভর্তা খেয়েছি'

/** Demo flow: pick the "Student on a budget" demo profile and prefill a Bangla meal. */
export function useTryDemo() {
  const { applyDemo, setDraft } = useApp()
  const navigate = useNavigate()
  return useCallback(async () => {
    await applyDemo('student_budget')
    setDraft({ ...EMPTY_DRAFT, text: DEMO_MEAL, mealType: 'lunch' })
    navigate('/log?demo=1')
  }, [applyDemo, setDraft, navigate])
}
