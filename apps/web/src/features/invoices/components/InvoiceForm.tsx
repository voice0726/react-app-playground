import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Group, NumberInput, Select, Stack, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { Controller, useForm } from 'react-hook-form'

import { toInvoiceDateString } from '@/features/invoices/date'
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
  { value: 'draft', label: '下書き' },
  { value: 'sent', label: '送付済み' },
  { value: 'paid', label: '支払済み' },
  { value: 'cancelled', label: 'キャンセル' },
] as const

function toDateInputValue(value: string): string | null {
  return value.length > 0 ? value : null
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
        <TextInput label="請求書番号" error={errors.number?.message} {...register('number')} />
        <TextInput label="顧客 ID" error={errors.customerId?.message} {...register('customerId')} />
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <NumberInput
              label="金額"
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
              label="発行日"
              value={toDateInputValue(field.value)}
              valueFormat="YYYY-MM-DD"
              clearable
              allowDeselect
              error={errors.issueDate?.message}
              onBlur={field.onBlur}
              onChange={(value) => field.onChange(toInvoiceDateString(value))}
            />
          )}
        />
        <Controller
          control={control}
          name="dueDate"
          render={({ field }) => (
            <DateInput
              label="支払期日"
              value={toDateInputValue(field.value)}
              valueFormat="YYYY-MM-DD"
              clearable
              allowDeselect
              error={errors.dueDate?.message}
              onBlur={field.onBlur}
              onChange={(value) => field.onChange(toInvoiceDateString(value))}
            />
          )}
        />
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              label="ステータス"
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
            保存
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
