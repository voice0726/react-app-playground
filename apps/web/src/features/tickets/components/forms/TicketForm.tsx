import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Group, Select, Stack, TextInput } from '@mantine/core'
import type { ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  type TicketFormInput,
  type TicketFormOutput,
  ticketFormValuesSchema,
} from '@/features/tickets/schemas/form'

type TicketFormProps = {
  // This form reads initial values on mount. Callers should remount it when switching records.
  initialValues: TicketFormInput
  submitLabel: string
  isSubmitting: boolean
  errorMessage?: string
  cancelButton?: ReactNode
  onSubmit: (values: TicketFormOutput) => void
}

const statusOptions = [
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
]

export function TicketForm({
  initialValues,
  submitLabel,
  isSubmitting,
  errorMessage,
  cancelButton,
  onSubmit,
}: TicketFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketFormInput, unknown, TicketFormOutput>({
    defaultValues: initialValues,
    resolver: zodResolver(ticketFormValuesSchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="md">
        {errorMessage ? (
          <Alert color="red" title="保存に失敗しました" variant="light">
            {errorMessage}
          </Alert>
        ) : null}

        <TextInput label="タイトル" {...register('title')} error={errors.title?.message} />

        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              allowDeselect={false}
              data={statusOptions}
              error={errors.status?.message}
              label="ステータス"
              {...field}
            />
          )}
        />

        <TextInput
          label="担当者"
          placeholder="未設定の場合は空欄"
          {...register('assignee')}
          error={errors.assignee?.message}
        />

        <Group justify="flex-end">
          {cancelButton}
          <Button loading={isSubmitting} type="submit">
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
