import { useOrganization } from '@/lib/organization'
import { Alert, Paper, Stack, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { ProjectForm } from '@/features/projects/components/ProjectForm'
import type { ProjectFormValues } from '@/features/projects/schemas/project.schema'

export const Route = createFileRoute('/_authenticated/projects/new')({
  component: NewProjectRoute,
})

function NewProjectRoute() {
  const { canEdit } = useOrganization()
  const [apiMessage, setApiMessage] = useState<string | null>(null)

  const handleSubmit = async (_values: ProjectFormValues) => {
    setApiMessage('プロジェクト API の実装が完了するまで、プロジェクトは作成できません。')
  }

  return (
    <Stack gap="lg" maw={640}>
      <Title order={2}>新規プロジェクト</Title>
      {apiMessage !== null ? (
        <Alert color="yellow" variant="light">
          {apiMessage}
        </Alert>
      ) : null}
      <Paper withBorder p="lg" radius="sm">
        {canEdit ? <ProjectForm onSubmit={handleSubmit} /> : <Alert>閲覧者はプロジェクトを作成できません。</Alert>}
      </Paper>
    </Stack>
  )
}
