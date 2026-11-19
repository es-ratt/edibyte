import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SAFETY, useAppStore } from '@/app/store'
import { useDraft } from '@/features/capture/draft'
import { EMPTY_PROFILE, type Profile } from '@/features/profile/model'
import { listEvents, listMeals } from '@/lib/db'
import { translate, type TKey } from '@/lib/i18n'
import Capture from './Capture'
import Confirm from './Confirm'
import Result from './Result'

// jsdom has no canvas/createImageBitmap: the resize step is unit-tested separately (image.test.ts).
vi.mock('@/lib/image', async (orig) => ({ ...(await orig<typeof import('@/lib/image')>()), prepareMealPhoto: async (f: Blob) => f }))

const en = (k: TKey, v?: Record<string, string | number>) => translate('en', k, v)
const year = new Date().getFullYear()
const teen: Profile = { ...EMPTY_PROFILE, birthYear: year - 15, birthMonth: 1, avoid: ['egg'] }

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/capture" element={<Capture />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/result" element={<Result />} />
        <Route path="/coach" element={<p>coach</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await useAppStore.getState().deleteAll()
  useAppStore.setState({ lang: 'en', welcomed: true, profile: teen, safety: DEFAULT_SAFETY })
  useDraft.getState().reset()
})

describe('type -> confirm -> result (demo adapter, same engine as the API)', () => {
  it('checks a balanced plate and saves only ids, grams and confidence', async () => {
    const user = userEvent.setup()
    renderAt('/capture')
    await user.type(screen.getByLabelText(en('cap.typeLabel')), 'bhat dal shak')
    await user.click(screen.getByRole('button', { name: en('cap.typeGo') }))

    expect(await screen.findByRole('heading', { name: en('route.confirm') })).toBeTruthy()
    expect(screen.getAllByText(en('conf.sure'))).toHaveLength(3)
    await user.click(screen.getByRole('radio', { name: en('meal.lunch') }))
    await user.click(screen.getByRole('button', { name: en('conf.check') }))

    expect(await screen.findByRole('heading', { name: en('res.fits') })).toBeTruthy()
    // Teen mode: no calorie headline.
    expect(screen.queryByRole('heading', { name: en('res.energy') })).toBeNull()
    // Honest gaps and pending targets.
    expect(screen.getAllByText(en('res.noData')).length).toBeGreaterThan(0)
    expect(screen.getAllByText(en('res.targetPending')).length).toBeGreaterThan(0)
    // Allergy notice is always shown.
    expect(screen.getByText(en('res.allergyBody'))).toBeTruthy()

    await user.click(screen.getByRole('button', { name: en('res.addToDay') }))
    expect(await screen.findByText(en('res.added'))).toBeTruthy()
    const meals = await listMeals('2000-01-01', '2100-01-01')
    expect(meals).toHaveLength(1)
    expect(meals[0].items.map((i) => i.foodId).sort()).toEqual(['bhat', 'dal', 'shak'])
    expect(JSON.stringify(meals[0])).not.toContain('bhat dal shak') // never the typed text
  })

  it('suggests add-ons without foods on the avoid list', async () => {
    const user = userEvent.setup()
    renderAt('/capture')
    await user.type(screen.getByLabelText(en('cap.typeLabel')), 'bhat')
    await user.click(screen.getByRole('button', { name: en('cap.typeGo') }))
    await screen.findByRole('heading', { name: en('route.confirm') })
    await user.click(screen.getByRole('radio', { name: en('meal.lunch') }))
    await user.click(screen.getByRole('button', { name: en('conf.check') }))

    expect(await screen.findByRole('heading', { name: en('res.mostly') })).toBeTruthy()
    const ideas = within(screen.getByRole('heading', { name: en('res.addOns') }).closest('section')!)
    expect(ideas.getByText(/Lentil dal/)).toBeTruthy()
    expect(ideas.queryByText(/egg/i)).toBeNull() // egg is on this user's avoid list
  })

  it('asks about sugar only when the meal has a drink', async () => {
    const user = userEvent.setup()
    renderAt('/capture')
    await user.type(screen.getByLabelText(en('cap.typeLabel')), 'cha')
    await user.click(screen.getByRole('button', { name: en('cap.typeGo') }))
    expect(await screen.findByText(en('conf.sugar'))).toBeTruthy()
  })

  it('says so when no food is recognised', async () => {
    const user = userEvent.setup()
    renderAt('/capture')
    await user.type(screen.getByLabelText(en('cap.typeLabel')), 'qwerty')
    await user.click(screen.getByRole('button', { name: en('cap.typeGo') }))
    expect(await screen.findByText(en('cap.noFood'))).toBeTruthy()
  })
})

describe('avoid list', () => {
  it('never suggests a swap to an avoided food (regression: boiled egg for an egg-avoider)', async () => {
    const user = userEvent.setup()
    renderAt('/capture')
    await user.type(screen.getByLabelText(en('cap.typeLabel')), 'dim bhaji')
    await user.click(screen.getByRole('button', { name: en('cap.typeGo') }))
    await screen.findByRole('heading', { name: en('route.confirm') })
    await user.click(screen.getByRole('button', { name: en('conf.check') }))
    await screen.findByRole('heading', { name: en('res.allergyTitle') })
    expect(screen.queryByRole('heading', { name: en('res.swaps') })).toBeNull()
    expect(screen.getByText(new RegExp(en('res.avoidHit', { foods: '' })))).toBeTruthy()
  })
})

describe('photo -> confirm', () => {
  it('highlights an unsure match and records "wrong food" as a food id only', async () => {
    const user = userEvent.setup()
    renderAt('/capture')
    await user.upload(screen.getByLabelText(en('cap.gallery')), new File(['x'], 'meal.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByRole('heading', { name: en('route.confirm') }, { timeout: 4000 })).toBeTruthy()
    expect(screen.getByText(en('conf.notSure'))).toBeTruthy()

    await user.click(screen.getAllByRole('button', { name: en('conf.wrong') })[2])
    expect(screen.getByText(en('conf.wrongThanks'))).toBeTruthy()
    const events = await listEvents()
    expect(events.filter((e) => e.name === 'item_wrong')).toEqual([expect.objectContaining({ name: 'item_wrong', foodId: 'dim_bhaji' })])
    expect(events.map((e) => e.name)).toContain('photo_used')
  })
})

describe('safety', () => {
  it('capture is hidden while tracking is paused', () => {
    useAppStore.setState({ safety: { ...DEFAULT_SAFETY, pauseTracking: true } })
    renderAt('/capture')
    expect(screen.getByText(en('home.paused'))).toBeTruthy()
    expect(screen.queryByText(en('cap.takePhoto'))).toBeNull()
  })
})

describe('confirm with an unmatched phrase (live parser returns these)', () => {
  it('shows it with suggestions and blocks the check until it is resolved', async () => {
    const user = userEvent.setup()
    const dal = { id: 'dal', name_bn: 'ডাল', name_en: 'Lentil dal (masur)', name_bl: 'Dal', category: 'lentil', serving_desc_bn: '', serving_desc_en: '1 bowl', serving_grams: 150, piece_grams: null, verified: false }
    useDraft.getState().start([], false, [{ key: 'u1', rawName: 'begun bhorta', quantity: 200, unit: 'g', suggestions: [dal] }])
    renderAt('/confirm')
    expect(screen.getByText(en('conf.unmatched', { name: 'begun bhorta' }))).toBeTruthy()
    expect((screen.getByRole('button', { name: en('conf.check') }) as HTMLButtonElement).disabled).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Lentil dal (masur)' }))
    expect(screen.queryByText(en('conf.unmatched', { name: 'begun bhorta' }))).toBeNull()
    expect((screen.getByRole('button', { name: en('conf.check') }) as HTMLButtonElement).disabled).toBe(false)
  })
})
