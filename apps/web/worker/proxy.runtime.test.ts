import { once } from 'node:events'
import { createServer } from 'node:http'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer as createViteServer, type ViteDevServer } from 'vite'

const webRoot = process.cwd()
let upstream: ReturnType<typeof createServer>
let upstreamURL: string
let vite: ViteDevServer
let worker: ChildProcess
let workerURL: string
let callbackAssetPath: string

function listen(server: ReturnType<typeof createServer>): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('TCP port を取得できませんでした')
      resolve(address.port)
    })
  })
}

async function waitForWorker(process: ChildProcess): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let output = ''
    const onOutput = (chunk: Buffer) => {
      output += chunk.toString()
      if (output.includes('Ready on')) resolve()
    }
    process.stdout?.on('data', onOutput)
    process.stderr?.on('data', onOutput)
    process.once('error', reject)
    process.once('exit', (code) => reject(new Error(`wrangler dev が終了しました: ${code}\n${output}`)))
  })
}

beforeAll(async () => {
  upstream = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json')
    response.setHeader('Set-Cookie', ['login_state=state; Path=/; HttpOnly', 'session=value; Path=/; HttpOnly'])
    response.end(JSON.stringify({ appId: request.headers['x-app-id'], path: request.url }))
  })
  const upstreamPort = await listen(upstream)
  upstreamURL = `http://127.0.0.1:${upstreamPort}`

  const workerPortServer = createServer()
  const workerPort = await listen(workerPortServer)
  await new Promise<void>((resolve, reject) => workerPortServer.close((error) => error ? reject(error) : resolve()))
  workerURL = `http://127.0.0.1:${workerPort}`

  callbackAssetPath = join(webRoot, 'dist', 'auth', 'callback')
  await mkdir(join(webRoot, 'dist', 'auth'), { recursive: true })
  await writeFile(callbackAssetPath, 'static callback asset')

  worker = spawn('pnpm', ['exec', 'wrangler', 'dev', '--local', '--ip', '127.0.0.1', '--port', String(workerPort), '--var', `AUTH_ORIGIN:${upstreamURL}`], {
    cwd: webRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await waitForWorker(worker)

  process.env.VITE_AUTH_GATEWAY_URL = upstreamURL
  vite = await createViteServer({ configFile: join(webRoot, 'vite.config.ts'), mode: 'test', server: { port: 0 } })
  await vite.listen()
})

afterAll(async () => {
  await vite?.close()
  delete process.env.VITE_AUTH_GATEWAY_URL
  worker?.kill('SIGINT')
  if (worker) await once(worker, 'exit')
  await rm(callbackAssetPath, { force: true })
  await rm(join(webRoot, 'dist', 'auth'), { force: true, recursive: true })
  await new Promise<void>((resolve, reject) => upstream?.close((error) => error ? reject(error) : resolve()))
})

describe('実行時の中継設定', () => {
  it('auth callbackは静的アセットより先にWorkerを通り、複数Cookieを維持する', async () => {
    const response = await fetch(`${workerURL}/auth/callback?code=test&state=state`, { headers: { 'X-App-Id': 'forged-app' } })

    expect(await response.json()).toEqual({ appId: 'react-app-playground', path: '/auth/callback?code=test&state=state' })
    expect(response.headers.getSetCookie()).toEqual([
      'login_state=state; Path=/; HttpOnly',
      'session=value; Path=/; HttpOnly',
    ])
  })

  it('Vite proxyは偽装されたX-App-Idを固定値で置換する', async () => {
    const address = vite.httpServer?.address()
    if (!address || typeof address === 'string') throw new Error('ViteのTCP portを取得できませんでした')
    const response = await fetch(`http://127.0.0.1:${address.port}/auth/callback?code=test`, { headers: { 'X-App-Id': 'forged-app' } })

    expect(await response.json()).toEqual({ appId: 'react-app-playground', path: '/auth/callback?code=test' })
  })
})
