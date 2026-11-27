import { answersByName, formatProbability, truncate, untrustedInput } from './lib.mjs';

export const CHECK_NAME = 'decision/pullfrog-verdict';
const REVIEW_LIMIT = 100000;
// 現行の自動マージ判定が見ている GitHub の警告記法
const ALERT_MARKERS = ['[!IMPORTANT]', '[!WARNING]', '[!CAUTION]'];

export const QUESTIONS = [
  {
    type: 'predicate',
    name: 'blocks_merge',
    instructions:
      'Does this code review report at least one finding that should block merging the pull request ' +
      'until it is fixed? Count bugs, regressions, security problems, broken builds or tests, and ' +
      'required follow-up changes. Do not count praise, summaries of the change, optional suggestions, ' +
      'style nits, or statements that no issues were found.',
  },
  {
    type: 'predicate',
    name: 'correctness',
    instructions: 'Does the review report a bug, regression, or behavior that would break the application or its tests?',
  },
  {
    type: 'predicate',
    name: 'security',
    instructions: 'Does the review report a security or privacy problem introduced by the change?',
  },
  {
    type: 'predicate',
    name: 'compatibility',
    instructions:
      'Does the review report a breaking dependency change, an incompatible API change, or a runtime ' +
      'version requirement that the project does not meet?',
  },
];

const LABELS = {
  blocks_merge: 'マージを止めるべき指摘がある',
  correctness: '不具合・回帰の指摘',
  security: 'セキュリティの指摘',
  compatibility: '互換性・破壊的変更の指摘',
};

export function buildRequest(reviewBody) {
  return {
    questions: QUESTIONS,
    input: untrustedInput('Evaluate this automated code review of a pull request.', [
      { title: 'review', text: truncate(reviewBody, REVIEW_LIMIT) },
    ]),
  };
}

export function legacyMarkers(reviewBody) {
  return ALERT_MARKERS.filter((marker) => (reviewBody ?? '').includes(marker));
}

export function summarize({ answers, reviewBody, reviewUrl }) {
  const byName = answersByName(QUESTIONS, answers);
  const blocks = byName.blocks_merge;
  const markers = legacyMarkers(reviewBody);
  const title =
    blocks?.type === 'predicate' ? `止めるべき指摘の確率 ${blocks.probability.toFixed(2)}` : '判定できませんでした（回答拒否）';
  const rows = QUESTIONS.map(({ name }) => `| ${LABELS[name]} | ${formatProbability(byName[name])} |`);
  const summary = [
    '比較用の判定です。マージの可否には使っていません。',
    '',
    '| 観点 | 確率 |',
    '| --- | --- |',
    ...rows,
    '',
    `現行の文字列判定（${ALERT_MARKERS.join(' / ')}）: ${markers.length ? `あり（${markers.join(', ')}）` : 'なし'}`,
    '',
    `対象レビュー: ${reviewUrl}`,
  ].join('\n');
  return { title, summary };
}
