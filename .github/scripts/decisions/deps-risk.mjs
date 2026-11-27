import { answersByName, formatProbability, truncate, untrustedInput } from './lib.mjs';

export const CHECK_NAME = 'decision/deps-risk';
export const DEPENDENCY_AUTHORS = ['dependabot[bot]', 'devin-ai-integration[bot]'];
const BODY_LIMIT = 100000;
const MANIFEST_PATCH_LIMIT = 20000;
const LOCK_PACKAGES_LIMIT = 200;

const MANIFEST = /(^|\/)(package\.json|go\.mod|pom\.xml|build\.gradle(\.kts)?|Cargo\.toml|pyproject\.toml)$|^\.github\/workflows\/[^/]+\.ya?ml$/;
const LOCKFILE = /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|go\.sum|Cargo\.lock|uv\.lock|poetry\.lock|gradle\.lockfile)$/;
// pnpm-lock.yaml の packages 節のキー（例: `  '@scope/name@1.2.3':` / `  name@1.2.3:`）
const PNPM_PACKAGE_KEY = /^([+-]) {2}'?((?:@[^@\s'/]+\/)?[^@\s'/]+)@([^\s'():]+)[^:]*'?:\s*$/;

const LEVELS = [
  { label: 'None', description: 'Only patch-level fixes or metadata changes. No documented behavior change.' },
  { label: 'Low', description: 'New features or fixes that keep existing APIs and defaults unchanged.' },
  {
    label: 'Moderate',
    description:
      'Deprecations, changed defaults, new peer dependency ranges, or behavior changes that could affect some usages.',
  },
  {
    label: 'High',
    description: 'Documented breaking changes or a major version bump of a dependency the project uses directly.',
  },
  {
    label: 'Severe',
    description:
      'Removed APIs, required migrations, or dropped support for a runtime or platform version, likely to break the build or app.',
  },
];

export const QUESTIONS = [
  {
    type: 'score',
    name: 'breaking_risk',
    instructions:
      'Rate the risk that merging this dependency update breaks the build, tests, or runtime behavior of the project. ' +
      'Use the release notes and changelog in the pull request description and the manifest and lockfile changes.',
    levels: LEVELS,
  },
  {
    type: 'predicate',
    name: 'major_bump',
    instructions: 'Does the update change the major version of at least one directly declared dependency (or 0.x minor)?',
  },
  {
    type: 'predicate',
    name: 'breaking_notes',
    instructions:
      'Do the release notes or changelog of the updated versions describe a breaking change, a removed API, or a required migration?',
  },
  {
    type: 'predicate',
    name: 'runtime_requirement',
    instructions:
      'Does the update raise the required version of a runtime, engine, or platform (for example Node.js, a browser, or a peer dependency)?',
  },
];

const LABELS = {
  breaking_risk: '破壊的変更のリスク（0〜4）',
  major_bump: 'メジャー更新を含む',
  breaking_notes: 'リリースノートに破壊的変更がある',
  runtime_requirement: '実行環境・peer の要求が上がる',
};

export function isDependencyPr(pullRequest) {
  const author = pullRequest.user?.login;
  if (author === 'dependabot[bot]') return true;
  if (author === 'devin-ai-integration[bot]') return /^(chore|build)\(deps(-dev)?\)/.test(pullRequest.title ?? '');
  return false;
}

export function summarizeLockPatch(patch) {
  const changes = new Map();
  for (const line of patch.split('\n')) {
    const match = PNPM_PACKAGE_KEY.exec(line);
    if (!match) continue;
    const [, sign, name, version] = match;
    const entry = changes.get(name) ?? { added: new Set(), removed: new Set() };
    (sign === '+' ? entry.added : entry.removed).add(version);
    changes.set(name, entry);
  }
  const lines = [...changes.entries()]
    .filter(([, { added, removed }]) => [...added].join() !== [...removed].join())
    .map(([name, { added, removed }]) => `${name}: ${[...removed].join(', ') || '(なし)'} -> ${[...added].join(', ') || '(削除)'}`);
  if (lines.length > LOCK_PACKAGES_LIMIT) {
    return [...lines.slice(0, LOCK_PACKAGES_LIMIT), `... ほか ${lines.length - LOCK_PACKAGES_LIMIT} 件`];
  }
  return lines;
}

export function summarizeFiles(files) {
  const parts = [];
  for (const file of files) {
    const header = `${file.filename} (+${file.additions} -${file.deletions})`;
    if (MANIFEST.test(file.filename)) {
      parts.push(`## ${header}\n${file.patch ? truncate(file.patch, MANIFEST_PATCH_LIMIT) : '(差分が大きく GitHub が patch を返していません)'}`);
    } else if (LOCKFILE.test(file.filename)) {
      const packages = file.patch ? summarizeLockPatch(file.patch) : [];
      const detail = file.patch
        ? packages.length ? packages.join('\n') : '(パッケージ版の変化を抽出できませんでした)'
        : '(差分が大きく GitHub が patch を返していません)';
      parts.push(`## ${header}\n${detail}`);
    } else {
      parts.push(`## ${header}\n(依存定義以外のファイル)`);
    }
  }
  return parts.join('\n\n');
}

export function buildRequest({ pullRequest, files }) {
  return {
    questions: QUESTIONS,
    input: untrustedInput('Evaluate this dependency update pull request.', [
      { title: 'title', text: pullRequest.title ?? '' },
      { title: 'description', text: truncate(pullRequest.body, BODY_LIMIT) },
      { title: 'changed files', text: summarizeFiles(files) },
    ]),
  };
}

export function summarize({ answers, files }) {
  const byName = answersByName(QUESTIONS, answers);
  const risk = byName.breaking_risk;
  let title = '判定できませんでした（回答拒否）';
  let distribution = [];
  if (risk?.type === 'score') {
    const top = risk.probabilities.reduce((best, item) => (item.probability > best.probability ? item : best));
    title = `リスク ${risk.score.toFixed(2)} / ${LEVELS.length - 1}（最有力: ${top.label}）`;
    distribution = ['', '| 水準 | 確率 |', '| --- | --- |', ...risk.probabilities.map((p) => `| ${p.value}: ${p.label} | ${p.probability.toFixed(2)} |`)];
  }
  const summary = [
    '比較用の判定です。マージの可否には使っていません。',
    '',
    '| 観点 | 値 |',
    '| --- | --- |',
    ...QUESTIONS.map(({ name }) => `| ${LABELS[name]} | ${formatProbability(byName[name])} |`),
    ...distribution,
    '',
    `入力に使った変更ファイル: ${files.map((file) => file.filename).join(', ') || '(なし)'}`,
  ].join('\n');
  return { title, summary };
}
