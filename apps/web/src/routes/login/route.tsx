import { Button, Container, Paper, Stack, Text, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { loginURL } from '@/lib/auth'
export const Route = createFileRoute('/login')({ component: LoginRoute })
function LoginRoute() { return <Container size={420} py={80}><Paper withBorder p="xl" radius="sm"><Stack gap="lg"><Stack gap={4}><Title order={1} size="h2">サインイン</Title><Text c="dimmed" size="sm">おかえりなさい。</Text></Stack><Button component="a" href={loginURL('/dashboard')}>サインイン</Button></Stack></Paper></Container> }
