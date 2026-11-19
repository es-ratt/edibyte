import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SAFETY, useAppStore } from '@/app/store'
import { useDraft } from '@/features/capture/draft'
import { EMPTY_PROFILE } from '@/features/profile/model'
import { selectApi } from '@/lib/api'
import { translate, type TKey } from '@/lib/i18n'
import Coach from './Coach'

const en = (k: TKey, v?: Record<string, string | number>) => translate('en', k, v)
const year = new Date().getFullYear()
const renderPage = () =>
  render(
    <MemoryRouter>
      <Coach />
    </MemoryRouter>,
  )

beforeEach(async () => {
  await useAppStore.getState().deleteAll()
  useAppStore.setState({ lang: 'en', welcomed: true, profile: { ...EMPTY_PROFILE, birthYear: year - 15, birthMonth: 1 }, safety: DEFAULT_SAFETY })
  useDraft.getState().reset()
})

describe('coach (demo adapter)', () => {
  it('answers from the food table with sources and no calories for a teen', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: en('coach.s5') }))
    expect(await screen.findByText(/Boiled egg \(50 g\): about 6\.5 g protein/)).toBeTruthy()
    expect(screen.queryByText(/kcal/)).toBeNull()
    expect(screen.getByText(en('coach.sources'))).toBeTruthy()
  })

  it('cites WHO for sugar', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: en('coach.s3') }))
    expect(await screen.findByText(new RegExp(en('ref.limitPctEnergy', { v: 10 })))).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /Sources: Free sugars/ }).length).toBe(1)
  })

  it('gives a safe answer card for allergies and teen weight loss', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText(en('coach.placeholder')), 'is fuchka ok for my peanut allergy')
    await user.click(screen.getByRole('button', { name: en('coach.ask') }))
    expect(await screen.findByText(en('coach.g.allergy'))).toBeTruthy()
    await user.type(screen.getByLabelText(en('coach.placeholder')), 'how to lose weight')
    await user.click(screen.getByRole('button', { name: en('coach.ask') }))
    expect(await screen.findByText(en('coach.g.teen_weight'))).toBeTruthy()
    expect(screen.getAllByText(en('coach.safe'))).toHaveLength(2)
  })

  it('uses the confirmed meal as context and lets the user remove it', async () => {
    const user = userEvent.setup()
    const result = await selectApi({}).checkMeal({ items: [{ food_id: 'dal', quantity: null, unit: 'serving', source: 'manual', match_confidence: 1 }], answers: { oil: 'unknown', fried: 'unknown', sugar_spoons: null }, profile: null, meal_type: 'lunch' })
    useDraft.setState({ result })
    renderPage()
    expect(screen.getByText(/About your meal: Lentil dal/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: en('coach.s2') }))
    expect(await screen.findByText(/Lentil dal \(masur\) \(150 g\)/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: en('coach.clearMeal') }))
    expect(screen.queryByText(/About your meal/)).toBeNull()
  })

  it('says it has no data instead of guessing', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText(en('coach.placeholder')), 'calories in pizza')
    await user.click(screen.getByRole('button', { name: en('coach.ask') }))
    expect(await screen.findByText(en('coach.noData'))).toBeTruthy()
  })

  it('hides the mic when the browser has no speech recognition', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: en('coach.mic') })).toBeNull()
  })
})

describe('coach meal context rule', () => {
  it('a general WHO question does not list the meal foods', async () => {
    const user = userEvent.setup()
    const result = await selectApi({}).checkMeal({ items: [{ food_id: 'dal', quantity: null, unit: 'serving', source: 'manual', match_confidence: 1 }], answers: { oil: 'unknown', fried: 'unknown', sugar_spoons: null }, profile: null, meal_type: 'lunch' })
    useDraft.setState({ result })
    renderPage()
    await user.click(screen.getByRole('button', { name: en('coach.s3') }))
    expect(await screen.findByText(new RegExp(en('ref.limitPctEnergy', { v: 10 })))).toBeTruthy()
    expect(screen.queryByText(/Lentil dal \(masur\) \(150 g\)/)).toBeNull()
  })
})
