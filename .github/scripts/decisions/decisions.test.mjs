import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import * as depsRisk from './deps-risk.mjs';
import * as pullfrogVerdict from './pullfrog-verdict.mjs';
import { run } from './run.mjs';

const LOCK_PATCH = `@@ -121,8 +121,8 @@ importers:
       jsdom:
-        specifier: 30.1.3
+        specifier: 31.0.0
@@ -146,14 +146,6 @@ packages:
-  '@asamuzakjp/css-color@7.1.9':
-    resolution: {integrity: sha512-x}
-  jsdom@30.1.3:
+  jsdom@31.0.0:
-  'jsdom@30.1.3(@noble/hashes@2.2.0)':
+  'jsdom@31.0.0(@noble/hashes@2.2.0)':`;

function eventFile(event) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'decisions-'));
  const file = path.join(dir, 'event.json');
  fs.writeFileSync(file, JSON.stringify(event));
  return file;
}

function mockFetch(handlers) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method: init.method ?? 'GET', body, headers: init.headers, signal: init.signal });
    const handler = handlers.find(([pattern]) => url.includes(pattern));
    if (!handler) throw new Error(`unexpected fetch ${url}`);
    const [status, payload] = handler[1](body);
    return { ok: status < 300, status, text: async () => (payload === undefined ? '' : JSON.stringify(payload)) };
  };
  return { fetchImpl, calls };
}

const predicate = (name, probability) => ({ type: 'predicate', name, probability });
const baseEnv = { GITHUB_TOKEN: 'gh-token', GITHUB_REPOSITORY: 'owner/repo' };
const pullRequest = { number: 7, head: { sha: 'head-sha' }, title: 'chore(deps): bump jsdom', body: 'Release notes', user: { login: 'dependabot[bot]' } };

test('pnpm lockfile の差分からパッケージの版の変化を抜き出す', () => {
  assert.deepEqual(depsRisk.summarizeLockPatch(LOCK_PATCH), [
    '@asamuzakjp/css-color: 7.1.9 -> (削除)',
    'jsdom: 30.1.3 -> 31.0.0',
  ]);
});

test('依存更新 PR の判定は作成者とタイトルで決まる', () => {
  assert.equal(depsRisk.isDependencyPr({ user: { login: 'dependabot[bot]' }, title: 'anything' }), true);
  assert.equal(depsRisk.isDependencyPr({ user: { login: 'devin-ai-integration[bot]' }, title: 'chore(deps): jsdom を上げる' }), true);
  assert.equal(depsRisk.isDependencyPr({ user: { login: 'devin-ai-integration[bot]' }, title: 'fix: 日付ピッカー' }), false);
  assert.equal(depsRisk.isDependencyPr({ user: { login: 'voice0726' }, title: 'chore(deps): x' }), false);
});

test('secret が無いときは API を呼ばず neutral の check を付ける', async () => {
  const { fetchImpl, calls } = mockFetch([['/check-runs', () => [201, {}]]]);
  const env = { ...baseEnv, GITHUB_EVENT_PATH: eventFile({ pull_request: pullRequest, review: { body: 'x' } }) };
  const result = await run({ mode: 'pullfrog-verdict', env, fetchImpl, log: () => {} });
  assert.equal(result.conclusion, 'neutral');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].body.output.title, 'secret 未設定');
  assert.equal(calls[0].body.head_sha, 'head-sha');
  assert.equal(calls[0].body.name, 'decision/pullfrog-verdict');
});

test('Pullfrog のレビューを判定し、確率と現行の文字列判定を summary に書く', async () => {
  const review = { body: '> [!IMPORTANT]\n> null で落ちます', html_url: 'https://example.test/review' };
  const { fetchImpl, calls } = mockFetch([
    ['/v1/decisions', (body) => [200, { model: body.model, answers: [predicate('blocks_merge', 0.91), predicate('correctness', 0.8), predicate('security', 0.05), predicate('compatibility', 0.1)] }]],
    ['/check-runs', () => [201, {}]],
  ]);
  const env = { ...baseEnv, OPENAI_API_KEY: 'sk-test', GITHUB_EVENT_PATH: eventFile({ pull_request: pullRequest, review }) };
  const result = await run({ mode: 'pullfrog-verdict', env, fetchImpl, log: () => {} });

  const [decision, check] = calls;
  assert.equal(decision.body.model, 'gpt-6-luna');
  assert.equal(decision.headers.Authorization, 'Bearer sk-test');
  assert.deepEqual(decision.body.questions.map((q) => q.name), ['blocks_merge', 'correctness', 'security', 'compatibility']);
  assert.equal(decision.body.input[0].role, 'developer');
  assert.match(decision.body.input[1].content[1].text, /null で落ちます/);
  assert.equal(result.conclusion, 'success');
  assert.equal(check.body.conclusion, 'success');
  assert.equal(check.body.output.title, '止めるべき指摘の確率 0.91');
  assert.match(check.body.output.summary, /マージを止めるべき指摘がある \| 0\.91/);
  assert.match(check.body.output.summary, /あり（\[!IMPORTANT\]）/);
});

test('Dependabot の PR を判定し、ルーブリックの点数と分布を summary に書く', async () => {
  const files = [
    { filename: 'apps/web/package.json', additions: 1, deletions: 1, patch: '-    "jsdom": "30.1.3",\n+    "jsdom": "31.0.0",' },
    { filename: 'pnpm-lock.yaml', additions: 3, deletions: 4, patch: LOCK_PATCH },
  ];
  const score = {
    type: 'score', name: 'breaking_risk', score: 2.6, confidence: 0.5,
    probabilities: [0, 0.05, 0.3, 0.65, 0].map((probability, value) => ({ value, label: ['None', 'Low', 'Moderate', 'High', 'Severe'][value], probability })),
  };
  const { fetchImpl, calls } = mockFetch([
    ['/pulls/7/files', () => [200, files]],
    ['/v1/decisions', () => [200, { answers: [score, predicate('major_bump', 0.97), predicate('breaking_notes', 0.7), predicate('runtime_requirement', 0.4)] }]],
    ['/check-runs', () => [201, {}]],
  ]);
  const env = { ...baseEnv, OPENAI_API_KEY: 'sk-test', GITHUB_EVENT_PATH: eventFile({ pull_request: pullRequest }) };
  await run({ mode: 'deps-risk', env, fetchImpl, log: () => {} });

  const decision = calls.find((call) => call.url.includes('/v1/decisions'));
  const changed = decision.body.input[1].content.find((part) => part.text.startsWith('<<<changed files>>>')).text;
  assert.match(changed, /jsdom: 30\.1\.3 -> 31\.0\.0/);
  assert.match(changed, /"jsdom": "31\.0\.0"/);
  assert.equal(decision.body.questions[0].levels.length, 5);
  const check = calls.find((call) => call.url.includes('/check-runs'));
  assert.equal(check.body.name, 'decision/deps-risk');
  assert.equal(check.body.output.title, 'リスク 2.60 / 4（最有力: High）');
  assert.match(check.body.output.summary, /\| 3: High \| 0\.65 \|/);
});

test('Decisions API が失敗しても neutral の check を付けて終える', async () => {
  const { fetchImpl, calls } = mockFetch([
    ['/v1/decisions', () => [500, { error: { message: 'boom' } }]],
    ['/check-runs', () => [201, {}]],
  ]);
  const env = { ...baseEnv, OPENAI_API_KEY: 'sk-test', GITHUB_EVENT_PATH: eventFile({ pull_request: pullRequest, review: { body: 'ok' } }) };
  const result = await run({ mode: 'pullfrog-verdict', env, fetchImpl, log: () => {} });
  assert.equal(result.conclusion, 'neutral');
  assert.match(calls.at(-1).body.output.summary, /500/);
});

test('check run を作れなくても例外を投げない', async () => {
  const logs = [];
  const { fetchImpl } = mockFetch([['/check-runs', () => [403, { message: 'Resource not accessible' }]]]);
  const env = { ...baseEnv, GITHUB_EVENT_PATH: eventFile({ pull_request: pullRequest, review: { body: 'x' } }) };
  await run({ mode: 'pullfrog-verdict', env, fetchImpl, log: (line) => logs.push(line) });
  assert.ok(logs.some((line) => line.includes('::warning::')));
});

test('依存更新でない PR は API を呼ばず neutral にする', async () => {
  const { fetchImpl, calls } = mockFetch([['/check-runs', () => [201, {}]]]);
  const env = { ...baseEnv, OPENAI_API_KEY: 'sk-test', GITHUB_EVENT_PATH: eventFile({ pull_request: { ...pullRequest, user: { login: 'voice0726' } } }) };
  const result = await run({ mode: 'deps-risk', env, fetchImpl, log: () => {} });
  assert.equal(result.title, '判定対象外');
  assert.equal(calls.length, 1);
});

test('全質問が回答拒否なら neutral にし、どのリクエストにも期限を付ける', async () => {
  const refusals = pullfrogVerdict.QUESTIONS.map(({ name }) => ({ type: 'refusal', name }));
  const { fetchImpl, calls } = mockFetch([
    ['/v1/decisions', () => [200, { answers: refusals }]],
    ['/check-runs', () => [201, {}]],
  ]);
  const env = { ...baseEnv, OPENAI_API_KEY: 'sk-test', GITHUB_EVENT_PATH: eventFile({ pull_request: pullRequest, review: { body: 'x', html_url: 'u' } }) };
  const result = await run({ mode: 'pullfrog-verdict', env, fetchImpl, log: () => {} });
  assert.equal(result.conclusion, 'neutral');
  assert.equal(calls.at(-1).body.conclusion, 'neutral');
  assert.ok(calls.every((call) => call.signal instanceof AbortSignal));
});

test('回答拒否のときは title で分かるようにする', () => {
  const answers = pullfrogVerdict.QUESTIONS.map(({ name }) => ({ type: 'refusal', name }));
  assert.equal(pullfrogVerdict.summarize({ answers, reviewBody: '', reviewUrl: 'u' }).title, '判定できませんでした（回答拒否）');
});
