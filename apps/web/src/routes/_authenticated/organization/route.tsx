import { Alert, Button, Group, Loader, Modal, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useState } from 'react'
import { z } from 'zod'

import { ApiError, requestJson } from '@/lib/apiClient'
import { organizationRoles, useOrganization } from '@/lib/organization'
import type { OrganizationRole } from '@/lib/organization'
import { useSessionStore } from '@/lib/stores/session.store'

type Member = { userId: string; role: OrganizationRole }
type MemberChange = { userId: string; role: OrganizationRole | null }
const memberSchema = z.object({
  userId: z.string().trim().min(1, 'ユーザーIDを入力してください').max(200, '200文字以内で入力してください'),
  role: z.enum(['admin', 'editor', 'viewer']),
})

export const Route = createFileRoute('/_authenticated/organization')({ component: OrganizationRoute })

function OrganizationRoute() {
  const { organization, canAdmin } = useOrganization()
  const currentUserId = useSessionStore((state) => state.user?.id)
  const client = useQueryClient()
  const memberKey = ['organizations', organization.id, 'members']
  const url = `/api/organizations/${organization.id}/members`
  const members = useQuery({ queryKey: memberKey, queryFn: ({ signal }) => requestJson<Member[]>(url, { signal }), enabled: canAdmin })
  const [change, setChange] = useState<MemberChange | null>(null)
  const form = useForm<z.infer<typeof memberSchema>>({ resolver: zodResolver(memberSchema), defaultValues: { userId: '', role: 'viewer' } })
  const refresh = async () => { await client.invalidateQueries({ queryKey: ['organizations'] }) }
  const add = useMutation({
    mutationFn: (values: z.infer<typeof memberSchema>) => requestJson<Member>(url, { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: async () => { form.reset(); await refresh() },
  })
  const update = useMutation({
    mutationFn: ({ userId, role }: MemberChange) => requestJson(`${url}/${encodeURIComponent(userId)}`, {
      method: role === null ? 'DELETE' : 'PATCH',
      ...(role === null ? {} : { body: JSON.stringify({ role }) }),
    }),
    onSuccess: async () => { setChange(null); await refresh() },
  })
  const pending = add.isPending || update.isPending
  const error = add.error ?? update.error

  return (
    <Stack>
      <Title order={2}>組織のメンバーと権限</Title>
      <Text>{organization.name}</Text>
      <Text size="sm">あなたのユーザーID: {currentUserId}</Text>
      <Text size="sm">管理者は組織管理と業務データの編集、編集者は業務データの編集、閲覧者は参照ができます。</Text>
      {!canAdmin ? <Alert>メンバーの管理は管理者のみ操作できます。</Alert> : <>
        <Text size="sm">追加するユーザーからユーザーIDを受け取り、権限を指定してください。</Text>
        <form onSubmit={form.handleSubmit((values) => add.mutate(values))}>
          <Group align="start">
            <TextInput label="追加するユーザーID" {...form.register('userId')} error={form.formState.errors.userId?.message} disabled={pending} />
            <Controller name="role" control={form.control} render={({ field }) => <Select label="追加する権限" data={organizationRoles} value={field.value} onChange={field.onChange} disabled={pending} error={form.formState.errors.role?.message} allowDeselect={false} />} />
            <Button type="submit" mt={24} loading={add.isPending} disabled={pending}>メンバーを追加</Button>
          </Group>
        </form>
        {error ? <Alert color="red">{error instanceof ApiError && error.status === 409 ? '既に所属しているか、最後の管理者を変更しようとしています。最新の状態を確認してください。' : 'メンバーの変更に失敗しました。権限と入力を確認してください。'}</Alert> : null}
        {members.isPending ? <Loader /> : null}
        {members.isError ? <Alert color="red">メンバーを取得できませんでした。<Button onClick={() => { void members.refetch() }}>再読み込み</Button></Alert> : null}
        {members.data ? <Table.ScrollContainer minWidth={600}><Table withTableBorder>
          <Table.Thead><Table.Tr><Table.Th>ユーザーID</Table.Th><Table.Th>権限</Table.Th><Table.Th>操作</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{members.data.map((member) => <Table.Tr key={member.userId}>
            <Table.Td>{member.userId}{member.userId === currentUserId ? '（自分）' : ''}</Table.Td>
            <Table.Td><Select aria-label={`${member.userId} の権限`} data={organizationRoles} value={member.role} allowDeselect={false} disabled={pending} onChange={(role) => {
              if (role === 'admin' || role === 'editor' || role === 'viewer') { update.reset(); setChange({ userId: member.userId, role }) }
            }} /></Table.Td>
            <Table.Td><Button color="red" variant="light" disabled={pending} onClick={() => { update.reset(); setChange({ userId: member.userId, role: null }) }}>削除</Button></Table.Td>
          </Table.Tr>)}</Table.Tbody>
        </Table></Table.ScrollContainer> : null}
      </>}
      <MemberChangeDialog
        change={change}
        pending={pending}
        error={update.error}
        onClose={() => { if (!pending) setChange(null) }}
        onConfirm={() => { if (change) update.mutate(change) }}
      />
    </Stack>
  )
}

function MemberChangeDialog({ change, pending, error, onClose, onConfirm }: {
  change: MemberChange | null
  pending: boolean
  error: Error | null
  onClose: () => void
  onConfirm: () => void
}) {
  if (!change) return null
  const description = change.role === null
    ? 'この組織から削除します'
    : `${organizationRoles.find((role) => role.value === change.role)?.label}に変更します`
  const errorMessage = error instanceof ApiError && error.status === 409
    ? '最後の管理者は削除・降格できません。別の管理者を追加してから操作してください。'
    : '変更できませんでした。権限と最新の所属状態を確認してください。'
  return <Modal opened onClose={onClose} title="メンバーの変更確認">
    <Stack>
      <Text>{change.userId} を{description}。</Text>
      <Text size="sm">最後の管理者は削除・降格できません。</Text>
      {error ? <Alert color="red">{errorMessage}</Alert> : null}
      <Button color={change.role === null ? 'red' : 'blue'} loading={pending} onClick={onConfirm}>変更を確定する</Button>
    </Stack>
  </Modal>
}
