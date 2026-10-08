import { Alert, Button, Group, Stack, Textarea } from '@mantine/core'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

type FormOnSubmit = NonNullable<ComponentPropsWithoutRef<'form'>['onSubmit']>

type TicketCommentFormProps = {
  label: string
  submitLabel: string
  isSubmitting: boolean
  bodyField: UseFormRegisterReturn<'body'>
  bodyError?: string
  placeholder?: string
  errorMessage?: string
  errorTitle?: string
  submitIcon?: ReactNode
  cancelButton?: ReactNode
  onSubmit: FormOnSubmit
}

export function TicketCommentForm({
  label,
  submitLabel,
  isSubmitting,
  bodyField,
  bodyError,
  placeholder,
  errorMessage,
  errorTitle,
  submitIcon,
  cancelButton,
  onSubmit,
}: TicketCommentFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <Stack gap="md">
        {errorMessage ? (
          <Alert color="red" title={errorTitle ?? '保存に失敗しました'} variant="light">
            {errorMessage}
          </Alert>
        ) : null}

        <Textarea
          autosize
          label={label}
          minRows={3}
          placeholder={placeholder}
          {...bodyField}
          error={bodyError}
        />

        <Group justify="flex-end">
          {cancelButton}
          <Button leftSection={submitIcon} loading={isSubmitting} type="submit">
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
