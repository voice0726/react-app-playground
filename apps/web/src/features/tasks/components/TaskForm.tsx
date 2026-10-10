import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Group, Select, Stack, Textarea, TextInput } from '@mantine/core'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { taskSchema, type TaskFormValues } from '@/features/tasks/schemas/task.schema'

type TaskFormProps = {
  initialValues?: TaskFormValues
  isSubmitting?: boolean
  error?: string
  onSubmit: (values: TaskFormValues) => void | Promise<void>
}

const defaultValues: TaskFormValues = {
  title: '',
  description: '',
  status: 'TODO',
}

const statusOptions = [
  { value: 'TODO', label: '未着手' },
  { value: 'IN_PROGRESS', label: '進行中' },
  { value: 'DONE', label: '完了' },
] as const

export function TaskForm({ initialValues, isSubmitting = false, error, onSubmit }: TaskFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<TaskFormValues>({
    defaultValues: initialValues ?? defaultValues,
    resolver: zodResolver(taskSchema),
  })

  useEffect(() => {
    reset(initialValues ?? defaultValues)
  }, [initialValues, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack>
        {error === undefined ? null : <Alert color="red" role="alert">{error}</Alert>}
        <TextInput label="タイトル" error={errors.title?.message} {...register('title')} />
        <Textarea label="説明" minRows={3} error={errors.description?.message} {...register('description')} />
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
                if (value === 'TODO' || value === 'IN_PROGRESS' || value === 'DONE') {
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
