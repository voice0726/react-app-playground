import { Alert, Button, Loader, Modal, Select, Stack, Text, TextInput } from '@mantine/core'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { requestJson } from '@/lib/apiClient'
import { OrganizationContext, organizationRoles } from '@/lib/organization'
import type { Organization } from '@/lib/organization'
import { useSessionStore } from '@/lib/stores/session.store'
import { useKanbanStore } from '@/features/tasks/stores/kanban.store'

const schema = z.object({ name: z.string().trim().min(1, '組織名を入力してください').max(200, '200文字以内で入力してください') })

type WorkspaceSlots = {
  switcher: ReactNode
  roleLabel: string | null
  content: ReactNode
}

export function OrganizationWorkspace({ main, children }: { main: ReactNode; children: (slots: WorkspaceSlots) => ReactNode }) {
  const userId = useSessionStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const organizations = useQuery({
    queryKey: ['organizations', userId],
    queryFn: ({ signal }) => requestJson<Organization[]>('/api/organizations', { signal }),
  })
  const selectionKey = `playground:organization:${userId}`
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try { return sessionStorage.getItem(selectionKey) } catch { return null }
  })
  useEffect(() => {
    if (selectedId === null) return
    try { sessionStorage.setItem(selectionKey, selectedId) } catch { /* 保存不可でも選択した組織を維持する。 */ }
  }, [selectedId, selectionKey])
  const [opened, setOpened] = useState(false)
  const [switching, setSwitching] = useState(false)
  const mutationCount = useIsMutating()
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: '' } })
  const organization = organizations.data?.find((item) => item.id === selectedId)
  const activateOrganization = async (id: string) => {
    setSwitching(true)
    await queryClient.cancelQueries({ predicate: (query) => query.queryKey[0] !== 'organizations' || query.queryKey.length !== 2 })
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'organizations' || query.queryKey.length !== 2 })
    queryClient.getMutationCache().clear()
    useKanbanStore.setState({ tasks: [], activeTaskId: null })
    setSelectedId(id)
    try {
      await navigate({ to: '/dashboard', search: {} })
    } finally {
      setSwitching(false)
    }
  }
  const createOrganization = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => requestJson<Organization>('/api/organizations', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: async (created) => {
      queryClient.setQueryData<Organization[]>(['organizations', userId], (items) => [...(items ?? []), created])
      setOpened(false)
      form.reset()
      await activateOrganization(created.id)
    },
  })

  const initialId = organizations.data?.[0]?.id
  if (selectedId === null && initialId !== undefined) setSelectedId(initialId)

  if (organizations.isPending) {
    return children({ switcher: null, roleLabel: null, content: <Loader aria-label="組織を読み込み中" /> })
  }
  if (organizations.isError) {
    return children({
      switcher: null,
      roleLabel: null,
      content: <Alert color="red" title="組織を取得できませんでした"><Button onClick={() => { void organizations.refetch() }}>再読み込み</Button></Alert>,
    })
  }

  const switcher = (
    <Stack gap={4}>
      <Text size="sm" fw={500} aria-hidden>組織</Text>
      <Select aria-label="組織" value={organization?.id ?? null} allowDeselect={false}
        data={organizations.data.map((item) => ({ value: item.id, label: item.name }))}
        disabled={mutationCount > 0 || switching}
        onChange={(id) => { if (id && id !== organization?.id && queryClient.isMutating() === 0) void activateOrganization(id) }} />
      <Button variant="subtle" size="xs" justify="flex-start" px={0} leftSection={<span aria-hidden>+</span>} disabled={mutationCount > 0 || switching}
        onClick={() => { createOrganization.reset(); form.reset(); setOpened(true) }}>組織を作成</Button>
    </Stack>
  )
  const roleLabel = organization ? organizationRoles.find((role) => role.value === organization.role)?.label ?? null : null
  const content = (
    <WorkspaceContent organization={organization} switching={switching} hasOrganizations={organizations.data.length > 0}>
      {main}
    </WorkspaceContent>
  )

  return (
    <>
      {children({ switcher, roleLabel, content })}
      <Modal opened={opened} onClose={() => { if (!createOrganization.isPending) setOpened(false) }} title="組織を作成">
        <form onSubmit={form.handleSubmit((values) => createOrganization.mutate(values))}>
          <Stack>
            <TextInput label="組織名" {...form.register('name')} error={form.formState.errors.name?.message} />
            {createOrganization.isError ? <Alert color="red">組織を作成できませんでした。</Alert> : null}
            <Button type="submit" loading={createOrganization.isPending}>作成する</Button>
          </Stack>
        </form>
      </Modal>
    </>
  )
}

function WorkspaceContent({ organization, switching, hasOrganizations, children }: {
  organization: Organization | undefined
  switching: boolean
  hasOrganizations: boolean
  children: ReactNode
}) {
  if (switching) return <Loader aria-label="組織を切り替え中" />
  if (!organization) {
    return <Text>{hasOrganizations
      ? '選択した組織へのアクセスがありません。別の組織を選択してください。'
      : '所属する組織がありません。組織を作成するか、管理者にメンバー追加を依頼してください。'}</Text>
  }
  return <>
    {organization.role === 'viewer' ? <Alert color="blue">閲覧者として表示しています。データの変更はできません。</Alert> : null}
    <OrganizationContext.Provider key={`${organization.id}:${organization.role}`} value={organization}>
      {children}
    </OrganizationContext.Provider>
  </>
}
