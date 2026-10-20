import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const workflows = new URL('../workflows/', import.meta.url);
const ci = fs.readFileSync(new URL('ci.yml', workflows), 'utf8');
const scripts = [];
let total = 0;

function runMerge(script, scenario, runs, mergeSha = 'merge-sha', mainSha = 'main-sha') {
  const pr = {
    mergedAt: scenario === 'unmerged' ? null : '2026-10-20T13:00:00Z',
    mergeCommit: { oid: mergeSha },
    mergedBy: { login: scenario === 'manual' ? 'human' : 'github-actions[bot]' },
  };
  const mock = `gh() {
    printf '%s\\n' "$*" >&2
    case "$1 $2" in
      'pr checks') [ "$SCENARIO" != checks-fail ] ;;
      'pr merge') [ "$SCENARIO" != stale-head ] ;;
      'pr view') printf '%s' "$MOCK_PR" ;;
      'api --method') printf '%s' "$MOCK_RUNS" ;;
      'api repos/example/project/git/ref/heads/main') printf '%s' "$MAIN_SHA" ;;
      'workflow run') [ "$SCENARIO" != dispatch-fail ] ;;
      *) return 1 ;;
    esac
  }\n`;
  return spawnSync('bash', ['-e', '-o', 'pipefail', '-c', mock + script], {
    encoding: 'utf8',
    env: {
      ...process.env, SCENARIO: scenario, MOCK_PR: JSON.stringify(pr),
      MOCK_RUNS: runs, MAIN_SHA: mainSha, GITHUB_REPOSITORY: 'example/project',
      PR_URL: 'https://github.com/example/project/pull/1', PR_HEAD_SHA: 'expected-sha',
    },
  });
}

for (const file of ['ci.yml', 'dependabot-auto-merge.yml']) {
  const text = fs.readFileSync(new URL(file, workflows), 'utf8');
  const script = text.match(/        run: \|\n(          gh pr checks[\s\S]*?)\n        env:/)[1].replace(/^          /gm, '');
  scripts.push(script);
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
  for (const scenario of ['new', 'manual', 'checks-fail', 'stale-head', 'unmerged', 'queued', 'running', 'success', 'failed', 'cancelled', 'other-sha', 'vrt', 'push', 'second-page', 'dispatch-fail']) {
    const requested = ['new', 'failed', 'cancelled', 'other-sha', 'vrt', 'dispatch-fail'].includes(scenario);
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
    const result = runMerge(script, scenario, response);
    assert.equal(result.stderr.includes('workflow run'), requested, `${file}: ${scenario} dispatch`);
    assert.equal(result.status === 0, !['checks-fail', 'stale-head', 'unmerged', 'dispatch-fail'].includes(scenario), `${file}: ${scenario}: ${result.stderr}`);
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
    const result = runMerge(script, 'consecutive-merges', JSON.stringify(runs), 'merge-B', 'main-B');
    assert.equal(result.status, 0);
    assert.doesNotMatch(result.stderr, /workflow run/, `${file}: consecutive merges with ${status} request`);
    assert.match(result.stderr, /head_sha=main-B/);
    total++;
  }
}
assert.equal(scripts[0], scripts[1]);
assert.doesNotMatch(ci, /merge_commit/);
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
console.log(`${total} cases passed`);
