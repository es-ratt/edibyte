import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ROUTE_PATHS } from './router'
import Welcome from '@/routes/Welcome'
import { translate } from '@/lib/i18n'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], updateServiceWorker: async () => {} }),
}))

const SPEC_ROUTES = [
  '/welcome', '/onboarding', '/', '/capture', '/confirm', '/result',
  '/coach', '/progress', '/plans', '/settings', '/data-sources',
]

describe('routes', () => {
  it('has every route from the spec', () => {
    expect([...ROUTE_PATHS].sort()).toEqual([...SPEC_ROUTES].sort())
  })
})

describe('welcome screen', () => {
  it('starts in Bangla and switches language', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(translate('bn', 'welcome.title'))
    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(translate('en', 'welcome.title'))
    expect(document.documentElement.lang).toBe('en')
  })
})
