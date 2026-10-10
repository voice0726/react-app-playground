import 'dayjs/locale/ja'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Group, Stack, TextInput, Textarea } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { format } from 'date-fns'
import { Controller, useForm } from 'react-hook-form'

import { projectSchema, type ProjectFormValues } from '@/features/projects/schemas/project.schema'

type ProjectFormProps = {
  isSubmitting?: boolean
  onSubmit: (values: ProjectFormValues) => void | Promise<void>
}

const defaultValues: ProjectFormValues = {
  name: '',
  description: '',
  owner: '',
  startDate: '',
  dueDate: '',
  status: '',
}

function toDateInputValue(value: string): string | null {
  return value === '' ? null : value
}

function toDateString(value: string | Date | null): string {
  if (value === null || value === '') {
    return ''
  }

  return format(new Date(value), 'yyyy-MM-dd')
}

export function ProjectForm({ isSubmitting = false, onSubmit }: ProjectFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ProjectFormValues>({
    defaultValues,
    resolver: zodResolver(projectSchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack>
        <TextInput label="名前" error={errors.name?.message} {...register('name')} />
        <Textarea label="説明" error={errors.description?.message} {...register('description')} />
        <TextInput label="担当者" error={errors.owner?.message} {...register('owner')} />
        <Controller
          control={control}
          name="startDate"
          render={({ field }) => (
            <DateInput
              label="開始日"
              locale="ja"
              value={toDateInputValue(field.value)}
              valueFormat="YYYY/MM/DD"
              error={errors.startDate?.message}
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
              label="期日"
              locale="ja"
              value={toDateInputValue(field.value)}
              valueFormat="YYYY/MM/DD"
              clearable
              error={errors.dueDate?.message}
              onBlur={field.onBlur}
              onChange={(value) => field.onChange(toDateString(value))}
            />
          )}
        />
        <TextInput label="ステータス" error={errors.status?.message} {...register('status')} />
        <Group justify="flex-end">
          <Button type="submit" loading={isSubmitting}>
            プロジェクトを作成
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
