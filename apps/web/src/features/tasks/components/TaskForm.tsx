import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Group, Select, Stack, Textarea, TextInput } from '@mantine/core'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { taskSchema, type TaskFormValues } from '@/features/tasks/schemas/task.schema'

type TaskFormProps = {
  initialValues?: TaskFormValues
  isSubmitting?: boolean
  onSubmit: (values: TaskFormValues) => void | Promise<void>
}

const defaultValues: TaskFormValues = {
  title: '',
  description: '',
  status: 'TODO',
}

const statusOptions = [
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
] as const

export function TaskForm({ initialValues, isSubmitting = false, onSubmit }: TaskFormProps) {
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
        <TextInput label="Title" error={errors.title?.message} {...register('title')} />
        <Textarea label="Description" minRows={3} error={errors.description?.message} {...register('description')} />
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
                if (value === 'TODO' || value === 'IN_PROGRESS' || value === 'DONE') {
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
