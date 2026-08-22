import { Alert, Paper, Stack, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { ProjectForm } from '@/features/projects/components/ProjectForm'
import type { ProjectFormValues } from '@/features/projects/schemas/project.schema'

export const Route = createFileRoute('/_authenticated/projects/new')({
  component: NewProjectRoute,
})

function NewProjectRoute() {
  const [apiMessage, setApiMessage] = useState<string | null>(null)

  const handleSubmit = async (_values: ProjectFormValues) => {
    setApiMessage('Project creation is unavailable until the projects API is implemented.')
  }

  return (
    <Stack gap="lg" maw={640}>
      <Title order={2}>New project</Title>
      {apiMessage !== null ? (
        <Alert color="yellow" variant="light">
          {apiMessage}
        </Alert>
      ) : null}
      <Paper withBorder p="lg" radius="sm">
        <ProjectForm onSubmit={handleSubmit} />
      </Paper>
    </Stack>
  )
}
