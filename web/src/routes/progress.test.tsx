import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SAFETY, useAppStore } from '@/app/store'
import { EMPTY_PROFILE } from '@/features/profile/model'
import { addMeal } from '@/lib/db'
import { translate, type TKey } from '@/lib/i18n'
import Progress from './Progress'

const en = (k: TKey, v?: Record<string, string | number>) => translate('en', k, v)
const renderPage = () =>
  render(
    <MemoryRouter>
      <Progress />
    </MemoryRouter>,
  )

beforeEach(async () => {
  await useAppStore.getState().deleteAll()
  useAppStore.setState({ lang: 'en', welcomed: true, profile: { ...EMPTY_PROFILE, birthYear: new Date().getFullYear() - 15, birthMonth: 1, mealsPerDay: 3 }, safety: DEFAULT_SAFETY })
})

describe('progress', () => {
  it('starts empty, offers clearly labelled sample data and a rule-chosen suggestion', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText(en('prog.empty'))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: en('prog.showSample') }))
    expect(screen.getByText(en('prog.sampleBanner'))).toBeTruthy()
    expect(await screen.findByText(en('prog.notReviewed'))).toBeTruthy()
    expect(screen.getByText(en('prog.whyTip'))).toBeTruthy()
  })

  it('counts real logged meals with "based on X of about Y"', async () => {
    const now = new Date()
    await addMeal({ eatenAt: now.toISOString(), mealType: 'lunch', items: [], plate: { veg_fruit: true, protein_food: true }, groups: [] })
    await addMeal({ eatenAt: now.toISOString(), mealType: 'snack', items: [], plate: {}, groups: ['sugary_drink', 'fried'] })
    renderPage()
    expect(await screen.findByText(en('prog.basedOn', { x: 2, y: 21 }))).toBeTruthy()
    expect(screen.getAllByText(en('hab.times', { n: 1 })).length).toBeGreaterThanOrEqual(2) // sugary + fried
    expect(await screen.findByText(en('prog.needMore'))).toBeTruthy() // fewer than 3 meals: no tip yet
  })

  it('switches views with the arrow keys', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('tab', { name: en('prog.week') })
    screen.getByRole('tab', { name: en('prog.week') }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: en('prog.month') }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText(en('prog.monthAvg'))).toBeTruthy()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText(en('prog.journey'))).toBeTruthy()
  })

  it('shows words instead of counts when numbers are hidden', async () => {
    useAppStore.setState({ safety: { ...DEFAULT_SAFETY, hideNumbers: true } })
    await addMeal({ eatenAt: new Date().toISOString(), mealType: 'lunch', items: [], plate: { veg_fruit: true }, groups: [] })
    renderPage()
    await screen.findByText(en('prog.habits'))
    expect((await screen.findAllByText(en('hab.most'))).length).toBeGreaterThan(0)
    expect(screen.queryByText(en('hab.ofMeals', { k: 1, n: 1 }))).toBeNull()
    expect((await screen.findAllByText(en('hab.most'))).length).toBeGreaterThan(0)
  })

  it('is hidden while tracking is paused', () => {
    useAppStore.setState({ safety: { ...DEFAULT_SAFETY, pauseTracking: true } })
    renderPage()
    expect(screen.getByText(en('home.paused'))).toBeTruthy()
    expect(screen.queryByRole('tablist')).toBeNull()
  })
})
