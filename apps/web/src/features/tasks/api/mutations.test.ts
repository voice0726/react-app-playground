import { describe, expect, it } from 'vitest'

import { useUpdateTask } from './mutations'

describe('task mutation exports', () => {
  it('exports the task update hook contract', () => {
    expect(typeof useUpdateTask).toBe('function')
  })
})
