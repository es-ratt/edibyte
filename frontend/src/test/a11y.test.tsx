// Accessibility: axe-core on every screen, rendered inside the real layout (top bar, banners, nav).
// jsdom cannot compute colours, so colour contrast is checked separately (measured token ratios in
// styles/index.css) and in the browser; every other WCAG A/AA rule axe knows is enforced here.
import { render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { DEFAULT_SAFETY, useAppStore } from '@/app/store'
import { useDraft } from '@/features/capture/draft'
import { EMPTY_PROFILE } from '@/features/profile/model'
import { selectApi } from '@/lib/api'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], updateServiceWorker: async () => {} }),
}))

const SCREENS = ['/welcome', '/onboarding', '/', '/capture', '/confirm', '/result', '/coach', '/progress', '/plans', '/settings', '/data-sources']

async function violations(): Promise<string[]> {
  const res = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  return res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)
}

beforeAll(async () => {
  const result = await selectApi({}).checkMeal({
    items: [{ food_id: 'bhat', quantity: null, unit: 'serving', source: 'manual', match_confidence: 1 }, { food_id: 'dim_bhaji', quantity: null, unit: 'serving', source: 'photo', match_confidence: 0.86 }],
    answers: { oil: 'unknown', fried: 'unknown', sugar_spoons: null },
    profile: { age: 15, sex: 'female', activity: 'medium', goal: 'balanced', diet: 'any' },
    meal_type: 'lunch',
  })
  useDraft.setState({ result })
})

beforeEach(() => {
  useAppStore.setState({ hydrated: true, lang: 'en', welcomed: true, profile: { ...EMPTY_PROFILE, birthYear: new Date().getFullYear() - 15, birthMonth: 1 }, safety: DEFAULT_SAFETY })
  useDraft.setState({
    rows: [
      { key: 'a', food: { id: 'bhat', name_bn: 'ভাত', name_en: 'Cooked white rice', name_bl: 'Bhat', category: 'grain', serving_desc_bn: '১ প্লেট', serving_desc_en: '1 plate', serving_grams: 250, piece_grams: null, verified: false }, quantity: 1, unit: 'plate', source: 'photo', matchConfidence: 0.86, rawName: 'bhat' },
    ],
    unmatched: [{ key: 'u', rawName: 'begun bhorta', quantity: null, unit: null, suggestions: [] }],
  })
})

describe('accessibility (axe, WCAG 2.1 A/AA)', () => {
  it.each(SCREENS)('%s has no violations', async (path) => {
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
    await screen.findByRole('heading', { level: 1 })
    // Let async content (lists, suggestions) settle before scanning.
    await new Promise((r) => setTimeout(r, 700))
    expect(await violations()).toEqual([])
  })
})
