import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './ui'

describe('Card', () => {
  it('uses exactly one background class per tone (regression: white text on white card)', () => {
    render(
      <Card tone="olive">
        <p>x</p>
      </Card>,
    )
    const cls = screen.getByText('x').parentElement!.className
    expect(cls).toContain('bg-olive-700')
    expect(cls).not.toContain('bg-surface')
  })
})
