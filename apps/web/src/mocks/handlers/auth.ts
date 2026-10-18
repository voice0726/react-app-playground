import { HttpResponse, http } from 'msw'

export const authHandlers = [
  http.get('*/auth/me', () => HttpResponse.json({
    // チケットモックと同じユーザーで本人操作を検証する。
    user_id: '1',
    name: 'E2E User',
    email: 'e2e@example.com',
  })),
  http.post('*/auth/logout', () => new HttpResponse(null, { status: 204 })),
]
