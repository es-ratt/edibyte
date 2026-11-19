import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SAFETY, useAppStore } from '@/app/store'
import { EMPTY_PROFILE, type Profile } from '@/features/profile/model'
import { getProfile, getSetting } from '@/lib/db'
import { translate } from '@/lib/i18n'
import Onboarding from './Onboarding'
import Settings from './Settings'

const en = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate('en', k, v)
const thisYear = new Date().getFullYear()

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/" element={<p>home</p>} />
        <Route path="/welcome" element={<p>welcome</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await useAppStore.getState().deleteAll()
  useAppStore.setState({ lang: 'en', welcomed: true, profile: null, safety: DEFAULT_SAFETY })
})

describe('onboarding', () => {
  it('blocks under-13s with a kind message', async () => {
    const user = userEvent.setup()
    renderAt('/onboarding')
    await user.selectOptions(screen.getByLabelText(en('ob.birthYear')), String(thisYear - 13))
    await user.selectOptions(screen.getByLabelText(en('ob.birthMonth')), '12')
    // Born in December of (this year - 13): still 12 until December.
    if (new Date().getMonth() < 11) {
      expect(screen.getByText(en('ob.tooYoung'))).toBeTruthy()
      expect((screen.getByRole('button', { name: en('ob.next') }) as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('turns teen mode on for a 15-year-old, offers no weight-loss goal and saves locally', async () => {
    const user = userEvent.setup()
    renderAt('/onboarding')
    await user.selectOptions(screen.getByLabelText(en('ob.birthYear')), String(thisYear - 16))
    await user.selectOptions(screen.getByLabelText(en('ob.birthMonth')), '1')
    expect(screen.getByText(en('ob.teenBanner'))).toBeTruthy()

    await user.click(screen.getByRole('button', { name: en('ob.next') }))
    await user.click(screen.getByRole('radio', { name: new RegExp(en('act.high')) }))
    await user.click(screen.getByRole('button', { name: en('ob.next') }))

    const goals = within(screen.getByRole('group', { name: en('ob.goal') })).getAllByRole('radio')
    expect(goals).toHaveLength(4)
    expect(screen.queryByText(/lose|weight loss/i)).toBeNull()
    expect(screen.getByText(en('ob.weightConcern'))).toBeTruthy()
    await user.click(screen.getByRole('radio', { name: en('goal.energy') }))
    await user.click(screen.getByRole('checkbox', { name: en('avoid.peanut') }))
    await user.click(screen.getByRole('button', { name: en('ob.next') }))
    await user.click(screen.getByRole('button', { name: en('ob.save') }))

    expect(await screen.findByText('home')).toBeTruthy()
    const stored = await getProfile()
    expect(stored).toMatchObject({ goal: 'energy', activity: 'high', avoid: ['peanut'], weightKg: null })
  })

  it('rejects an out-of-range height but allows skipping it', async () => {
    const user = userEvent.setup()
    renderAt('/onboarding')
    await user.selectOptions(screen.getByLabelText(en('ob.birthYear')), String(thisYear - 20))
    await user.selectOptions(screen.getByLabelText(en('ob.birthMonth')), '1')
    await user.click(screen.getByRole('button', { name: en('ob.next') }))
    await user.type(screen.getByLabelText(new RegExp(en('ob.height').replace(/[()]/g, '.'))), '20')
    expect(screen.getByRole('alert').textContent).toBe(en('ob.invalidNumber', { min: 120, max: 220 }))
    await user.clear(screen.getByLabelText(new RegExp(en('ob.height').replace(/[()]/g, '.'))))
    await user.click(screen.getByRole('button', { name: en('ob.next') }))
    expect(screen.getByText(en('ob.goal'))).toBeTruthy()
  })
})

const teenProfile: Profile = { ...EMPTY_PROFILE, birthYear: thisYear - 15, birthMonth: 1, weightKg: 48, heightCm: 155 }

describe('settings and safety', () => {
  it('locks teen mode on for minors and never shows the weight', async () => {
    useAppStore.setState({ profile: teenProfile })
    renderAt('/settings')
    const teenSwitch = screen.getByRole('switch', { name: new RegExp(en('set.teenMode')) }) as HTMLInputElement
    expect(teenSwitch.checked).toBe(true)
    expect(teenSwitch.disabled).toBe(true)
    expect(screen.queryByText(/48/)).toBeNull()
  })

  it('shows sourced WHO guidance and marks the rest pending review', async () => {
    useAppStore.setState({ profile: teenProfile })
    renderAt('/settings')
    // Free sugars and saturated fat: both 10% of daily energy (WHO).
    expect(await screen.findAllByText(en('ref.limitPctEnergy', { v: 10 }))).toHaveLength(2)
    expect(screen.getByText(en('ref.limitPctEnergy', { v: 1 }))).toBeTruthy()
    expect(screen.getByText(en('set.pending'))).toBeTruthy()
    expect(screen.queryByText(en('nut.total_fat'))).toBeNull()
  })

  it('keeps notifications off by default and remembers switches', async () => {
    const user = userEvent.setup()
    useAppStore.setState({ profile: teenProfile })
    renderAt('/settings')
    expect((screen.getByRole('switch', { name: new RegExp(en('set.notifications')) }) as HTMLInputElement).checked).toBe(false)
    await user.click(screen.getByRole('switch', { name: new RegExp(en('set.pause')) }))
    expect(useAppStore.getState().safety.pauseTracking).toBe(true)
    expect(await getSetting('safety', {})).toMatchObject({ pauseTracking: true })
  })

  it('deletes all data after confirmation and returns to welcome', async () => {
    const user = userEvent.setup()
    await useAppStore.getState().setProfile(teenProfile)
    renderAt('/settings')
    await user.click(screen.getByRole('button', { name: en('set.delete') }))
    await user.click(screen.getByRole('button', { name: en('set.deleteConfirm') }))
    expect(await screen.findByText('welcome')).toBeTruthy()
    expect(await getProfile()).toBeNull()
    expect(useAppStore.getState().profile).toBeNull()
  })

  it('shows the wellbeing placeholder, not questions', () => {
    useAppStore.setState({ profile: teenProfile })
    renderAt('/settings')
    expect(screen.getByText(en('wb.notSetUp'))).toBeTruthy()
  })
})
