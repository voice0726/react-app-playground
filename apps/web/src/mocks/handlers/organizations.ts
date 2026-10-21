import { http, HttpResponse } from 'msw'

import type { Organization, OrganizationRole } from '@/lib/organization'
import { readJsonObject } from './utils'

export const MOCK_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001'
export const MOCK_EDITOR_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000002'
export const MOCK_VIEWER_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000003'
const userId = '1'
type Member = { userId: string; role: OrganizationRole }
type MockOrganization = { id: string; name: string; members: Member[] }
let organizations: MockOrganization[] = []

export function resetOrganizationState() {
  organizations = [
    { id: MOCK_ORGANIZATION_ID, name: 'デモ組織', members: [{ userId, role: 'admin' }] },
    { id: MOCK_EDITOR_ORGANIZATION_ID, name: '編集者の組織', members: [{ userId: '2', role: 'admin' }, { userId, role: 'editor' }] },
    { id: MOCK_VIEWER_ORGANIZATION_ID, name: '閲覧者の組織', members: [{ userId: '2', role: 'admin' }, { userId, role: 'viewer' }] },
  ]
}
resetOrganizationState()

const error = (status: number, message: string) => HttpResponse.json({ message }, { status })
const validRole = (role: unknown): role is OrganizationRole => role === 'admin' || role === 'editor' || role === 'viewer'
const membership = (id: string) => organizations.find((item) => item.id === id)?.members.find((member) => member.userId === userId)

function organizationGuard(request: Request): Response | undefined {
  const id = request.headers.get('X-Organization-ID')
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return error(400, 'Invalid organization ID.')
  const member = membership(id)
  if (!member) return error(404, 'Organization not found.')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && member.role === 'viewer') return error(403, 'Editor permission is required.')
  return undefined
}

const requireAdmin = (id: string) => {
  const member = membership(id)
  if (!member) return error(404, 'Organization not found.')
  return member.role === 'admin' ? undefined : error(403, 'Administrator permission is required.')
}
const response = (item: MockOrganization): Organization => ({ id: item.id, name: item.name, role: membership(item.id)?.role ?? 'viewer' })

export const organizationHandlers = [
  http.all('*/api/*', ({ request }) => {
    if (/^\/api\/(customers|deals|invoices|tasks|tickets|dashboard)(\/|$)/.test(new URL(request.url).pathname)) return organizationGuard(request)
    return undefined
  }),
  http.get('*/api/organizations', () => HttpResponse.json(organizations.filter((item) => membership(item.id)).map(response))),
  http.post('*/api/organizations', async ({ request }) => {
    const body = await readJsonObject(request)
    if (typeof body.name !== 'string' || !body.name.trim() || [...body.name].length > 200) return error(400, 'Invalid organization name.')
    const item: MockOrganization = { id: crypto.randomUUID(), name: body.name.trim(), members: [{ userId, role: 'admin' }] }
    organizations.push(item)
    return HttpResponse.json(response(item), { status: 201 })
  }),
  http.get('*/api/organizations/:id/members', ({ params }) => {
    const id = String(params.id)
    if (!membership(id)) return error(404, 'Organization not found.')
    return HttpResponse.json(organizations.find((item) => item.id === id)?.members)
  }),
  http.post('*/api/organizations/:id/members', async ({ params, request }) => {
    const id = String(params.id)
    const denied = requireAdmin(id)
    if (denied) return denied
    const body = await readJsonObject(request)
    if (typeof body.userId !== 'string' || !body.userId.trim() || [...body.userId].length > 200 || !validRole(body.role)) return error(400, 'Invalid member.')
    const item = organizations.find((entry) => entry.id === id)
    if (!item) return error(404, 'Organization not found.')
    if (item.members.some((member) => member.userId === body.userId)) return error(409, 'Member already exists.')
    const member: Member = { userId: body.userId.trim(), role: body.role }
    item.members.push(member)
    return HttpResponse.json(member, { status: 201 })
  }),
  http.all('*/api/organizations/:id/members/:userId', async ({ params, request }) => {
    const id = String(params.id)
    const denied = requireAdmin(id)
    if (denied) return denied
    if (request.method === 'DELETE') return changeMember(id, String(params.userId), null)
    if (request.method !== 'PATCH') return error(405, 'Method not allowed.')
    const body = await readJsonObject(request)
    if (!validRole(body.role)) return error(400, 'Invalid role.')
    return changeMember(id, String(params.userId), body.role)
  }),
]

function changeMember(id: string, memberUserId: string, role: OrganizationRole | null): Response {
  const item = organizations.find((entry) => entry.id === id)
  const member = item?.members.find((entry) => entry.userId === memberUserId)
  if (!item || !member) return error(404, 'Member not found.')
  const admins = item.members.filter((entry) => entry.role === 'admin').length
  if (member.role === 'admin' && role !== 'admin' && admins === 1) {
    return error(409, 'An organization must have at least one administrator.')
  }
  if (role !== null) {
    member.role = role
    return HttpResponse.json(member)
  }
  item.members = item.members.filter((entry) => entry !== member)
  return HttpResponse.json({ success: true })
}
