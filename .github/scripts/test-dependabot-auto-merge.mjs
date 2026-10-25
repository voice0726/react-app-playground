import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const workflows = new URL('../workflows/', import.meta.url);
const ci = fs.readFileSync(new URL('ci.yml', workflows), 'utf8');
const scripts = [];
let total = 0;

function runMerge(script, scenario, runs, mergeSha = 'merge-sha', mainSha = 'main-sha') {
  const pr = {
    merged_at: scenario === 'unmerged' ? null : '2026-10-20T13:00:00Z',
    merge_commit_sha: mergeSha,
    merged_by: { login: scenario === 'manual' ? 'human' : 'github-actions[bot]' },
  };
  const mock = `gh() {
    printf '%s\\n' "$*" >&2
    case "$1 $2" in
      'pr checks') [ "$SCENARIO" != checks-fail ] ;;
      'pr merge') [ "$SCENARIO" != stale-head ] ;;
      'api repos/example/project/pulls/1') printf '%s' "$MOCK_PR" ;;
      'api --method') if [ -f "$REQUESTED_FILE" ] && [ "$SCENARIO" != invisible ]; then printf '%s' "$CREATED_RUN"; else printf '%s' "$MOCK_RUNS"; fi ;;
      'api repos/example/project/git/ref/heads/main') printf '%s' "$MAIN_SHA" ;;
      'workflow run') [ "$SCENARIO" != dispatch-fail ] && touch "$REQUESTED_FILE" ;;
      *) return 1 ;;
    esac
  }\nsleep() { :; }\n`;
  const requested = fs.mkdtempSync(path.join(os.tmpdir(), 'pr55-request-'));
  const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', mock + script], {
    encoding: 'utf8',
    env: {
      ...process.env, SCENARIO: scenario, MOCK_PR: JSON.stringify(pr),
      MOCK_RUNS: runs, MAIN_SHA: mainSha, GITHUB_REPOSITORY: 'example/project',
      PR_URL: 'https://github.com/example/project/pull/1', PR_HEAD_SHA: 'expected-sha', PR_NUMBER: '1',
      GITHUB_OUTPUT: '/dev/null', REQUESTED_FILE: path.join(requested, 'requested'),
      CREATED_RUN: JSON.stringify({workflow_runs:[{event:'workflow_dispatch',head_sha:mainSha,display_title:`Deploy ${mainSha}`,status:'queued'}]}),
    },
  });
  fs.rmSync(requested, {recursive: true});
  return result;
}

const requestScripts = [];
const requestGroups = [];
for (const file of ['ci.yml', 'dependabot-auto-merge.yml']) {
  const text = fs.readFileSync(new URL(file, workflows), 'utf8');
  const script = text.match(/        run: \|\n(          gh pr checks[\s\S]*?)\n        env:/)[1].replace(/^          /gm, '');
  const request = text.match(/        run: \|\n(          pr=\$\(gh api[\s\S]*?)\n        env:/)[1].replace(/^          /gm, '');
  requestScripts.push(request);
  requestGroups.push(text.split('\n  request-deploy:')[1].match(/group: (.*)/)[1]);
  const combined = script + '\n' + request;
  scripts.push(combined);
  const expression = text.match(/if: >-\n([\s\S]*?)\n        run: \|/)[1].trim()
    .replaceAll('.update-type', "['update-type']").replaceAll('.dependency-type', "['dependency-type']");
  const eligible = new Function('steps', `return (${expression})`);
  for (const update of ['', 'unknown', 'version-update:semver-major', 'version-update:semver-minor', 'version-update:semver-patch']) {
    for (const risky of ['', 'true']) {
      for (const dep of ['direct:development', 'direct:production']) {
        assert.equal(eligible({ metadata: { outputs: { 'update-type': update, 'dependency-type': dep } }, notes: { outputs: { risky } } }),
          ['version-update:semver-minor', 'version-update:semver-patch'].includes(update) && risky !== 'true'
          && (file === 'ci.yml' ? dep !== 'direct:development' : dep === 'direct:development'));
        total++;
      }
    }
  }
  for (const scenario of ['new', 'manual', 'checks-fail', 'stale-head', 'unmerged', 'queued', 'running', 'success', 'failed', 'cancelled', 'other-sha', 'vrt', 'push', 'second-page', 'dispatch-fail', 'invisible']) {
    const requested = ['new', 'failed', 'cancelled', 'other-sha', 'vrt', 'dispatch-fail', 'invisible'].includes(scenario);
    const entry = { event: 'workflow_dispatch', head_sha: 'main-sha', display_title: 'Deploy main-sha', status: 'completed', conclusion: 'success' };
    const runs = ['queued', 'running', 'success', 'failed', 'cancelled', 'other-sha', 'vrt', 'push', 'second-page'].includes(scenario) ? [entry] : [];
    if (scenario === 'queued') entry.status = 'queued';
    if (scenario === 'running') entry.status = 'in_progress';
    if (scenario === 'failed') entry.conclusion = 'failure';
    if (scenario === 'cancelled') entry.conclusion = 'cancelled';
    if (scenario === 'other-sha') entry.head_sha = 'unrelated-sha';
    if (scenario === 'vrt') entry.display_title = 'CI workflow_dispatch refs/heads/main';
    if (scenario === 'push') entry.event = 'push';
    const response = (scenario === 'second-page' ? '{"workflow_runs":[]}\n' : '') + JSON.stringify({ workflow_runs: runs });
    const result = runMerge(combined, scenario, response);
    assert.equal(result.stderr.includes('workflow run'), requested, `${file}: ${scenario} dispatch`);
    assert.equal(result.status === 0, !['checks-fail', 'stale-head', 'unmerged', 'dispatch-fail', 'invisible'].includes(scenario), `${file}: ${scenario}: ${result.stderr}`);
    if (requested) {
      assert.match(result.stderr, /head_sha=main-sha/);
      assert.match(result.stderr, /--ref main -f task=deploy/);
      assert.doesNotMatch(result.stderr, /merge_commit=/);
    }
    if (scenario !== 'checks-fail') assert.match(result.stderr, /--match-head-commit expected-sha/);
    total++;
  }
  for (const status of ['queued', 'in_progress', 'completed']) {
    const runs = { workflow_runs: [{ event: 'workflow_dispatch', head_sha: 'main-B', display_title: 'Deploy merge-A', status, conclusion: 'success' }] };
    const result = runMerge(combined, 'consecutive-merges', JSON.stringify(runs), 'merge-B', 'main-B');
    assert.equal(result.status, 0);
    assert.doesNotMatch(result.stderr, /workflow run/, `${file}: consecutive merges with ${status} request`);
    assert.match(result.stderr, /head_sha=main-B/);
    total++;
  }
}
assert.equal(scripts[0], scripts[1]);
assert.equal(requestGroups[0], requestGroups[1]);
assert.notEqual(ci.match(/group: dependabot-merge-runtime-.*/)[0], fs.readFileSync(new URL('dependabot-auto-merge.yml',workflows),'utf8').match(/group: dependabot-merge-dev-.*/)[0]);
assert.doesNotMatch(ci, /merge_commit/);

const notesScripts = ['ci.yml', 'dependabot-auto-merge.yml'].map(file => fs.readFileSync(new URL(file, workflows), 'utf8')
  .match(/name: リリースノートの破壊的変更を検出する\n        run: \|\n([\s\S]*?)\n        env:/)[1].replace(/^          /gm, ''));
assert.equal(notesScripts[0], notesScripts[1]);
const body = (notes, commits = '') => `<details>\n<summary>Release notes</summary>\n${notes}\n</details>\n`
  + `<details>\n<summary>Commits</summary>\n${commits}\n</details>\n<details>\n<summary>Dependabot commands and options</summary>\n</details>`;
const notesTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr55-notes-'));
try {
  for (const [name, prBody, risky] of [
    ['breaking in notes', body('<h3>💥 BREAKING CHANGES</h3>'), true],
    ['deprecation in notes', body('Deprecate support for Node.js v20'), true],
    ['dropped support in notes', body('Dropped support for TypeScript 5.1'), true],
    ['removed in bug fix', body('a field the API left out was compared as removed'), false],
    ['migrated in notes', body('The server was also migrated to the official SDK'), false],
    ['keywords only in commits', body('Bug fixes', 'chore: migrate tests\nfeat!: [BREAKING] drop old API'), false],
    ['breaking in later dependency notes', body('Bug fixes', 'chore: migrate tests') + body('<h3>💥 BREAKING CHANGES</h3>'), true],
    ['keywords only in later dependency commits', body('Bug fixes') + body('Bug fixes', 'feat!: [BREAKING] drop old API'), false],
    ['empty body', '', false],
  ]) {
    const output = path.join(notesTemp, name);
    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', notesScripts[0]], {
      encoding: 'utf8', env: { ...process.env, PR_BODY: prBody, GITHUB_OUTPUT: output },
    });
    assert.equal(result.status, 0, `${name}: ${result.stderr}`);
    assert.equal(fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : '', risky ? 'risky=true\n' : '', name);
    total++;
  }
} finally {
  fs.rmSync(notesTemp, { recursive: true });
}
assert.match(ci, /format\('Deploy \{0\}', github.sha\)/);

const group = ci.match(/\nconcurrency:\n  group: >-\n([\s\S]*?)\n  cancel-in-progress:/)[1].trim();
function groupKey(event, task) {
  return group.replace(/\$\{\{([\s\S]*?)\}\}/g, (_, expression) => new Function('github', 'inputs', `return (${expression})`)(
    { workflow: 'CI and Deploy', event_name: event, ref: 'refs/heads/main' }, { task }));
}
assert.equal(groupKey('push'), groupKey('workflow_dispatch', 'deploy')); total++;
assert.notEqual(groupKey('push'), groupKey('workflow_dispatch', 'update-vrt')); total++;
assert.notEqual(groupKey('pull_request'), groupKey('workflow_dispatch', 'deploy')); total++;

const guard = ci.match(/        run: \|\n(          main_sha=[\s\S]*?)\n        env:/)[1].replace(/^          /gm, '');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr55-deploy-'));
try {
  for (const sha of ['current-sha', 'old-sha']) {
    const output = path.join(temp, sha);
    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', `gh() { echo current-sha; }\n${guard}`], {
      encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: 'example/project', DEPLOY_SHA: sha, GITHUB_OUTPUT: output },
    });
    assert.equal(result.status, 0);
    assert.equal(fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : '', sha === 'current-sha' ? 'deploy=true\n' : '');
    total++;
  }
} finally {
  fs.rmSync(temp, { recursive: true });
}
assert.match(ci, /if: steps.current.outputs.deploy == 'true'/);
const overlap = fs.mkdtempSync(path.join(os.tmpdir(), 'pr55-overlap-'));
try {
  const stateFile = path.join(overlap, 'state.json');
  fs.writeFileSync(stateFile, JSON.stringify({ dispatches: 0, polls: 0 }));
  fs.writeFileSync(path.join(overlap, 'gh'), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
const file = process.env.REQUEST_STATE;
const state = JSON.parse(fs.readFileSync(file, 'utf8'));
if (args[0] === 'workflow') {
  state.dispatches++;
  fs.writeFileSync(file, JSON.stringify(state));
} else if (args.includes('repos/example/project/pulls/1')) {
  process.stdout.write(JSON.stringify({merged_at:'2026-10-20',merged_by:{login:'github-actions[bot]'}}));
} else if (args.includes('--method')) {
  if (state.dispatches) state.polls++;
  fs.writeFileSync(file, JSON.stringify(state));
  process.stdout.write(JSON.stringify({workflow_runs:state.polls >= 2 ? [{event:'workflow_dispatch',head_sha:'main-sha',display_title:'Deploy main-sha',status:'queued'}] : []}));
} else {
  process.stdout.write('main-sha');
}
`, { mode: 0o755 });
  const lanes = new Map();
  const results = await Promise.all(requestScripts.map((script, index) => {
    const group = requestGroups[index];
    const previous = lanes.get(group) || Promise.resolve();
    const next = previous.then(() => new Promise((resolve, reject) => {
      const child = spawn('bash', ['-e', '-o', 'pipefail', '-c', 'sleep() { :; }\n' + script], {
        env: { ...process.env, PATH: overlap + path.delimiter + process.env.PATH,
          REQUEST_STATE: stateFile, GITHUB_REPOSITORY: 'example/project', PR_NUMBER: '1' },
      });
      let stderr = '';
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', code => code === 0 ? resolve(code) : reject(new Error(stderr)));
    }));
    lanes.set(group, next);
    return next;
  }));
  assert.deepEqual(results, [0, 0]);
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  assert.equal(state.dispatches, 1);
  assert.ok(state.polls >= 2);
  total++;
} finally {
  fs.rmSync(overlap, { recursive: true });
}
console.log(`${total} cases passed`);
