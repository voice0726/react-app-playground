import { HttpResponse, http } from 'msw'

export const authHandlers = [
  http.get('*/auth/me', () => HttpResponse.json({
    user_id: 'e2e-standalone-user',
    name: 'E2E User',
    email: 'e2e@example.com',
  })),
  http.post('*/auth/logout', () => new HttpResponse(null, { status: 204 })),
]
