import { expect, test } from '@playwright/test'
import { createUserContext } from './helpers/auth'

test('isolates all four resources and preserves status transition errors', async ({ browser }) => {
  const a = await createUserContext(browser, 'a')
  const b = await createUserContext(browser, 'b')
  const customerResponse = await a.request.post('/api/customers', { data: { name: `E2E A ${Date.now()}`, email: `e2e-${Date.now()}@example.com`, phone: '1', status: 'active' }, headers: { Origin: 'http://localhost:5173' } })
  expect(customerResponse.status()).toBe(201)
  const customer = await customerResponse.json() as { id: string }
  const customerListA = await a.request.get('/api/customers')
  expect(customerListA.status()).toBe(200)
  expect((await customerListA.json() as Array<{ id: string }>).some((item) => item.id === customer.id)).toBe(true)
  expect((await b.request.get('/api/customers')).status()).toBe(200)
  expect(await (await b.request.get(`/api/customers/${customer.id}`)).status()).toBe(404)
  const dealResponse = await a.request.post('/api/deals', { data: { title: 'E2E deal', customerId: customer.id, amount: 1, status: 'open' }, headers: { Origin: 'http://localhost:5173' } })
  expect(dealResponse.status()).toBe(201)
  const deal = await dealResponse.json() as { id: string; customerId: string }
  expect(deal.customerId).toBe(customer.id)
  expect((await a.request.get(`/api/deals/${deal.id}`)).status()).toBe(200)
  expect((await b.request.get(`/api/deals/${deal.id}`)).status()).toBe(404)
  expect((await b.request.post('/api/deals', { data: { title: 'cross-user', customerId: customer.id, amount: 1, status: 'open' }, headers: { Origin: 'http://localhost:5173' } })).status()).toBe(404)
  const invoiceResponse = await a.request.post('/api/invoices', { data: { number: `E2E-${Date.now()}`, customerId: customer.id, amount: 1, issueDate: '2026-01-01', dueDate: '2026-01-02', status: 'draft' }, headers: { Origin: 'http://localhost:5173' } })
  expect(invoiceResponse.status()).toBe(201)
  const invoice = await invoiceResponse.json() as { id: string }
  expect((await a.request.get(`/api/invoices/${invoice.id}`)).status()).toBe(200)
  expect((await b.request.get(`/api/invoices/${invoice.id}`)).status()).toBe(404)
  expect((await a.request.patch(`/api/invoices/${invoice.id}`, { data: { status: 'paid' }, headers: { Origin: 'http://localhost:5173' } })).status()).toBe(409)
  expect((await a.request.patch(`/api/invoices/${invoice.id}`, { data: { status: 'sent' }, headers: { Origin: 'http://localhost:5173' } })).status()).toBe(200)
  expect((await a.request.patch(`/api/invoices/${invoice.id}`, { data: { status: 'paid' }, headers: { Origin: 'http://localhost:5173' } })).status()).toBe(200)
  const taskResponse = await a.request.post('/api/tasks', { data: { title: 'E2E task', description: 'isolation', status: 'TODO' }, headers: { Origin: 'http://localhost:5173' } })
  expect(taskResponse.status()).toBe(201)
  const task = await taskResponse.json() as { id: string }
  const taskListA = await a.request.get('/api/tasks')
  expect(taskListA.status()).toBe(200)
  expect((await taskListA.json() as Array<{ id: string }>).some((item) => item.id === task.id)).toBe(true)
  expect((await b.request.get('/api/tasks')).status()).toBe(200)
  expect((await b.request.patch(`/api/tasks/${task.id}`, { data: { status: 'DONE' }, headers: { Origin: 'http://localhost:5173' } })).status()).toBe(404)
  expect((await a.request.patch(`/api/tasks/${task.id}`, { data: { status: 'DONE' }, headers: { Origin: 'http://localhost:5173' } })).status()).toBe(200)
  await a.close(); await b.close()
})

test('GET logout is method rejected and POST logout validates origin', async ({ browser }) => {
  const context = await createUserContext(browser, 'a')
  expect((await context.request.get('/auth/logout?redirect=%2Flogin')).status()).toBe(405)
  const response = await context.request.post('/auth/logout?redirect=%2Flogin', { headers: { Origin: 'http://localhost:5173' } })
  expect([204, 302, 303]).toContain(response.status())
  await context.close()
})

test('keeps retry screen for auth outage and app shell for backend outage', async ({ browser }) => {
  const authContext = await createUserContext(browser, 'a')
  const authPage = await authContext.newPage()
  await authPage.route('**/auth/me', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' }))
  await authPage.goto('/dashboard')
  await expect(authPage.getByText('Authentication service unavailable.')).toBeVisible()
  expect(authPage.url()).toMatch(/\/dashboard$/)
  await authContext.close()

  const backendContext = await createUserContext(browser, 'a')
  const backendPage = await backendContext.newPage()
  await backendPage.route('**/api/customers', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' }))
  await backendPage.goto('/customers')
  await expect(backendPage.getByText('Failed to load customers.')).toBeVisible()
  expect(backendPage.url()).toMatch(/\/customers$/)
  await backendContext.close()
})
