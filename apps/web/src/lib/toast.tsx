import { notifications } from '@mantine/notifications'

type ShowToastInput = {
  title: string
  message?: string
  color?: 'teal' | 'red'
}

export const showToast = (input: ShowToastInput) => {
  notifications.show({
    title: input.title,
    message: input.message,
    color: input.color ?? 'teal',
    withCloseButton: true,
    autoClose: 4_000,
  })
}
