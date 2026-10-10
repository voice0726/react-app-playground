import { describe, expect, it } from 'vitest'

import { customerSchema } from './customer.schema'

const validCustomer = {
  name: 'Acme Corporation',
  email: 'billing@acme.example',
  phone: '03-1234-0001',
  status: 'active',
}

describe('customerSchema', () => {
  it('accepts valid customer data', () => {
    const result = customerSchema.safeParse(validCustomer)

    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      name: '',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('名前を入力してください')
  })

  it('rejects an invalid email', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      email: 'not-an-email',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('有効なメールアドレスを入力してください')
  })

  it('rejects an invalid status', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      status: 'pending',
    })

    expect(result.success).toBe(false)
  })
})
