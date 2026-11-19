import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SAFETY, useAppStore } from '@/app/store'
import { EMPTY_PROFILE } from '@/features/profile/model'
import { getPlan, listEvents } from '@/lib/db'
import { translate, type TKey } from '@/lib/i18n'
import { dayPlanId, weekPlanId, type DayPlan, type WeekPlan } from '@/lib/plans/model'
import Plans from './Plans'

const en = (k: TKey, v?: Record<string, string | number>) => translate('en', k, v)
const renderPage = () =>
  render(
    <MemoryRouter>
      <Plans />
    </MemoryRouter>,
  )

beforeEach(async () => {
  await useAppStore.getState().deleteAll()
  useAppStore.setState({ lang: 'en', welcomed: true, profile: { ...EMPTY_PROFILE, birthYear: new Date().getFullYear() - 15, birthMonth: 1 }, safety: DEFAULT_SAFETY })
})

async function addFood(user: ReturnType<typeof userEvent.setup>, slot: TKey, query: string, pick: RegExp) {
  await user.click(screen.getByRole('button', { name: en('plan.addTo', { slot: en(slot) }) }))
  await user.type(screen.getByLabelText(en('conf.search')), query)
  await user.click(await screen.findByRole('button', { name: pick }))
}

describe('day plan', () => {
  it('saves a plan and checks it before eating with the same engine', async () => {
    const user = userEvent.setup()
    renderPage()
    await addFood(user, 'meal.lunch', 'bhat', /^Cooked white rice/)
    await addFood(user, 'meal.lunch', 'shak', /^Leafy greens/)
    // Anchored: "Remove: Cooked white rice" must not match the search result.
    await addFood(user, 'meal.dinner', 'bhat', /^Cooked white rice/)
    const saved = await getPlan<DayPlan>(dayPlanId(new Date()))
    expect(saved?.slots.lunch.map((i) => i.food.id)).toEqual(['bhat', 'shak'])

    await user.click(screen.getByRole('button', { name: en('plan.check') }))
    expect(await screen.findByText(en('plan.dayResult'))).toBeTruthy()
    expect(screen.getByText(en('plan.vegSlots', { n: 1 }))).toBeTruthy()
    const dinner = within(screen.getByRole('heading', { name: en('meal.dinner') }).closest('section')!)
    expect(dinner.getByText(en('why.add_veg'))).toBeTruthy()
    expect((await listEvents()).map((e) => e.name)).toContain('plan_created')
  })

  it('asks for a food before checking an empty plan', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: en('plan.check') }))
    expect(await screen.findByText(en('plan.needFood'))).toBeTruthy()
  })
})

describe('week plan', () => {
  it('caps goals at three and keeps treat days', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('tab', { name: en('plan.week') }))
    for (const g of ['goal.veg_two_meals', 'goal.breakfast_daily', 'goal.less_fried', 'goal.no_sugary_drink'] as TKey[]) {
      await user.click(screen.getByRole('checkbox', { name: en(g) }))
    }
    expect(screen.getByText(en('plan.maxGoals'))).toBeTruthy()
    expect((screen.getByRole('checkbox', { name: en('goal.no_sugary_drink') }) as HTMLInputElement).checked).toBe(false)

    const friday = screen.getAllByRole('combobox')[4]
    await user.selectOptions(friday, 'friday_biryani')
    const saved = await getPlan<WeekPlan>(weekPlanId(new Date()))
    expect(saved?.goals).toHaveLength(3)
    expect(saved?.treatDays).toEqual([{ day: 4, label: 'friday_biryani' }])
    expect(screen.getByText(en('plan.progress'))).toBeTruthy()
  })
})

describe('month plan', () => {
  it('shows a review once a focus is chosen', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('tab', { name: en('plan.month') }))
    expect(screen.getByText(en('plan.pickTheme'))).toBeTruthy()
    await user.click(screen.getByRole('radio', { name: en('theme.more_veg') }))
    await user.click(screen.getAllByRole('radio', { name: en('checkin.good') })[0])
    expect(screen.getByText(en('plan.reviewCheckins', { g: 1, o: 0, h: 0 }))).toBeTruthy()
  })
})
