import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Group, Select, Stack, TextInput } from '@mantine/core'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type {
  TicketsSearchFormInput,
  TicketsSearchFormOutput,
} from '@/features/tickets/schemas/search'
import { ticketsSearchFormValuesSchema } from '@/features/tickets/schemas/search'

type TicketsSearchFormProps = {
  initialValues: TicketsSearchFormInput
  onSubmit: (values: TicketsSearchFormOutput) => void
}

export function TicketsSearchForm({ initialValues, onSubmit }: TicketsSearchFormProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TicketsSearchFormInput, unknown, TicketsSearchFormOutput>({
    defaultValues: initialValues,
    resolver: zodResolver(ticketsSearchFormValuesSchema),
  })

  useEffect(() => {
    reset(initialValues)
  }, [initialValues, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="md">
        <TextInput label="タイトル" {...register('q')} error={errors.q?.message} />
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              data={[
                { label: '全て', value: 'all' },
                { label: 'Open', value: 'open' },
                { label: 'Closed', value: 'closed' },
              ]}
              error={errors.status?.message}
              label="ステータス"
              {...field}
            />
          )}
        />
        <Group grow>
          <Controller
            control={control}
            name="sortBy"
            render={({ field }) => (
              <Select
                data={[
                  { label: 'ID', value: 'id' },
                  { label: '作成日', value: 'created_at' },
                  { label: '更新日', value: 'updated_at' },
                ]}
                error={errors.sortBy?.message}
                label="ソート項目"
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="sortOrder"
            render={({ field }) => (
              <Select
                data={[
                  { label: '昇順', value: 'asc' },
                  { label: '降順', value: 'dsc' },
                ]}
                error={errors.sortOrder?.message}
                label="順序"
                {...field}
              />
            )}
          />
        </Group>
        <Button type="submit">検索する</Button>
      </Stack>
    </form>
  )
}
