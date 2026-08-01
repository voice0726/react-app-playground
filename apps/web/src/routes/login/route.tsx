import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Container,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { authClient } from '@/lib/auth'
import { useSessionStore, type SessionUser } from '@/lib/stores/session.store'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

type SignInData = {
  user?: SessionUser
}

export const Route = createFileRoute('/login')({
  component: LoginRoute,
})

function hasSessionUser(value: unknown): value is SignInData {
  return (
    value !== null &&
    typeof value === 'object' &&
    'user' in value &&
    typeof (value as SignInData).user?.id === 'string' &&
    typeof (value as SignInData).user?.name === 'string' &&
    typeof (value as SignInData).user?.email === 'string'
  )
}

function LoginRoute() {
  const navigate = useNavigate()
  const setSession = useSessionStore((state) => state.setSession)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: 'demo@example.com',
      password: '',
    },
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)

    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    })

    if (error !== null) {
      setFormError('Invalid email or password')
      return
    }

    if (hasSessionUser(data) && data.user !== undefined) {
      setSession(data.user)
      await navigate({ to: '/dashboard' })
      return
    }

    setFormError('Invalid email or password')
  })

  return (
    <Container size={420} py={80}>
      <Paper withBorder p="xl" radius="sm">
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1} size="h2">
              Sign in
            </Title>
            <Text c="dimmed" size="sm">
              Welcome back.
            </Text>
          </Stack>

          {formError !== null ? (
            <Alert color="red" variant="light">
              {formError}
            </Alert>
          ) : null}

          <form onSubmit={onSubmit}>
            <Stack>
              <TextInput
                label="Email"
                placeholder="demo@example.com"
                type="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <PasswordInput
                label="Password"
                placeholder="Enter password"
                error={errors.password?.message}
                {...register('password')}
              />
              <Group justify="flex-end">
                <Button type="submit" loading={isSubmitting}>
                  Sign in
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  )
}
