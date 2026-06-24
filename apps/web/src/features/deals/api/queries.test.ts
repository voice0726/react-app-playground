import { describe, expect, it } from 'vitest'

import { useDeal } from './queries'

describe('deal query exports', () => {
  it('exports the single-deal hook contract', () => {
    expect(typeof useDeal).toBe('function')
  })
})
