import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Group, NumberInput, Select, Stack, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { format } from 'date-fns'
import { Controller, useForm } from 'react-hook-form'

import { invoiceSchema, type InvoiceFormValues } from '@/features/invoices/schemas/invoice.schema'

type InvoiceFormProps = {
  initialValues?: InvoiceFormValues
  isSubmitting?: boolean
  onSubmit: (values: InvoiceFormValues) => void | Promise<void>
}

const defaultValues: InvoiceFormValues = {
  number: '',
  customerId: '',
  amount: 0,
  issueDate: '',
  dueDate: '',
  status: 'draft',
}

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

function toDateInputValue(value: string): string | null {
  return value.length > 0 ? value : null
}

function toDateString(value: string | Date | null): string {
  if (value === null || value === '') {
    return ''
  }

  return format(new Date(value), 'yyyy-MM-dd')
}

export function InvoiceForm({ initialValues, isSubmitting = false, onSubmit }: InvoiceFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<InvoiceFormValues>({
    defaultValues: initialValues ?? defaultValues,
    resolver: zodResolver(invoiceSchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack>
        <TextInput label="Invoice number" error={errors.number?.message} {...register('number')} />
        <TextInput label="Customer ID" error={errors.customerId?.message} {...register('customerId')} />
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
          name="issueDate"
          render={({ field }) => (
            <DateInput
              label="Issue date"
              value={toDateInputValue(field.value)}
              valueFormat="YYYY-MM-DD"
              error={errors.issueDate?.message}
              onBlur={field.onBlur}
              onChange={(value) => field.onChange(toDateString(value))}
            />
          )}
        />
        <Controller
          control={control}
          name="dueDate"
          render={({ field }) => (
            <DateInput
              label="Due date"
              value={toDateInputValue(field.value)}
              valueFormat="YYYY-MM-DD"
              error={errors.dueDate?.message}
              onBlur={field.onBlur}
              onChange={(value) => field.onChange(toDateString(value))}
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
                if (
                  value === 'draft' ||
                  value === 'sent' ||
                  value === 'paid' ||
                  value === 'cancelled'
                ) {
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
