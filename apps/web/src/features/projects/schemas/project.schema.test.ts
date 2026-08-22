import { describe, expect, it } from 'vitest'

import { projectSchema } from './project.schema'

const validProject = {
  name: 'Website renewal',
  description: 'Optional project description',
  owner: 'Aki',
  startDate: '2026-04-01',
  dueDate: '2026-04-30',
  status: 'planned',
}

describe('projectSchema', () => {
  it('accepts valid project data', () => {
    expect(projectSchema.safeParse(validProject).success).toBe(true)
  })

  it('requires name, owner, start date, and status', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      name: '',
      owner: '',
      startDate: '',
      status: '',
    })

    expect(result.success).toBe(false)
  })

  it('allows an empty due date', () => {
    expect(projectSchema.safeParse({ ...validProject, dueDate: '' }).success).toBe(true)
  })

  it('rejects a due date before the start date', () => {
    const result = projectSchema.safeParse({ ...validProject, dueDate: '2026-03-31' })

    expect(result.success).toBe(false)
  })
})
