import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Group, NumberInput, Select, Stack, TextInput } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'

import { dealSchema, type DealFormValues } from '@/features/deals/schemas/deal.schema'
import type { Customer } from '@/types/customer.types'

type DealFormProps = {
  initialValues?: DealFormValues
  isSubmitting?: boolean
  onSubmit: (values: DealFormValues) => void | Promise<void>
}

const defaultValues: DealFormValues = {
  title: '',
  customerId: '',
  amount: 0,
  status: 'open',
}

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
] as const

const dealCustomerKeys = {
  list: () => ['deals', 'customer-options'] as const,
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }

  return (await response.json()) as T
}

function useCustomerOptions() {
  return useQuery({
    queryKey: dealCustomerKeys.list(),
    queryFn: () => fetchJson<Customer[]>('/api/customers'),
  })
}

export function DealForm({ initialValues, isSubmitting = false, onSubmit }: DealFormProps) {
  const customersQuery = useCustomerOptions()
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<DealFormValues>({
    defaultValues: initialValues ?? defaultValues,
    resolver: zodResolver(dealSchema),
  })
  const customerOptions =
    customersQuery.data?.map((customer) => ({
      value: customer.id,
      label: customer.name,
    })) ?? []

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack>
        {customersQuery.isError ? (
          <Alert color="red" variant="light">
            Failed to load customers.
          </Alert>
        ) : null}
        <TextInput label="Title" error={errors.title?.message} {...register('title')} />
        <Controller
          control={control}
          name="customerId"
          render={({ field }) => (
            <Select
              label="Customer"
              data={customerOptions}
              disabled={customersQuery.isLoading}
              error={errors.customerId?.message}
              value={field.value}
              onChange={(value) => field.onChange(value ?? '')}
            />
          )}
        />
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <NumberInput
              label="Amount"
              min={0}
              thousandSeparator=","
              prefix="¥"
              error={errors.amount?.message}
              value={field.value}
              onBlur={field.onBlur}
              onChange={(value) => {
                field.onChange(typeof value === 'number' ? value : Number.NaN)
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              label="Status"
              data={statusOptions}
              error={errors.status?.message}
              value={field.value}
              onChange={(value) => {
                if (value === 'open' || value === 'won' || value === 'lost') {
                  field.onChange(value)
                }
              }}
            />
          )}
        />
        <Group justify="flex-end">
          <Button type="submit" loading={isSubmitting}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
