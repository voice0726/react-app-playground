import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Group, Select, Stack, TextInput } from '@mantine/core'
import { Controller, useForm } from 'react-hook-form'

import {
  customerSchema,
  type CustomerFormValues,
} from '@/features/customers/schemas/customer.schema'

type CustomerFormProps = {
  initialValues?: CustomerFormValues
  isSubmitting?: boolean
  submitError?: string | null
  onSubmit: (values: CustomerFormValues) => void | Promise<void>
}

const defaultValues: CustomerFormValues = {
  name: '',
  email: '',
  phone: '',
  status: 'active',
}

export function CustomerForm({ initialValues, isSubmitting = false, onSubmit, submitError }: CustomerFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CustomerFormValues>({
    defaultValues: initialValues ?? defaultValues,
    resolver: zodResolver(customerSchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack>
        {submitError ? <Alert color="red" role="alert">{submitError}</Alert> : null}
        <TextInput label="名前" error={errors.name?.message} {...register('name')} />
        <TextInput label="メールアドレス" type="email" error={errors.email?.message} {...register('email')} />
        <TextInput label="電話番号" error={errors.phone?.message} {...register('phone')} />
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              label="ステータス"
              data={[
                { value: 'active', label: '有効' },
                { value: 'inactive', label: '無効' },
              ]}
              error={errors.status?.message}
              value={field.value}
              onChange={(value) => {
                if (value === 'active' || value === 'inactive') {
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
