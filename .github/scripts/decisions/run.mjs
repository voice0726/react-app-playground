// 使い方: node run.mjs <pullfrog-verdict|deps-risk>
// 比較用の段階なので、どの経路でも check は success か neutral にし、プロセスは 0 で終える。
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createDecision, githubClient } from './lib.mjs';
import * as depsRisk from './deps-risk.mjs';
import * as pullfrogVerdict from './pullfrog-verdict.mjs';

const MODES = {
  'pullfrog-verdict': {
    checkName: pullfrogVerdict.CHECK_NAME,
    async prepare({ event }) {
      const reviewBody = event.review?.body ?? '';
      if (!reviewBody.trim()) return { skip: 'レビュー本文が空のため判定していません。' };
      return {
        request: pullfrogVerdict.buildRequest(reviewBody),
        summarize: (answers) => pullfrogVerdict.summarize({ answers, reviewBody, reviewUrl: event.review.html_url }),
      };
    },
  },
  'deps-risk': {
    checkName: depsRisk.CHECK_NAME,
    async prepare({ event, github }) {
      if (!depsRisk.isDependencyPr(event.pull_request)) return { skip: '依存更新の PR ではないため判定していません。' };
      const files = await github.listPullFiles(event.pull_request.number);
      return {
        request: depsRisk.buildRequest({ pullRequest: event.pull_request, files }),
        summarize: (answers) => depsRisk.summarize({ answers, files }),
      };
    },
  },
};

export async function run({ mode, env, fetchImpl = fetch, log = console.log }) {
  const config = MODES[mode];
  if (!config) throw new Error(`未知のモードです: ${mode}`);
  const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  const github = githubClient({ token: env.GITHUB_TOKEN, repository: env.GITHUB_REPOSITORY, fetchImpl });
  const headSha = event.pull_request.head.sha;

  let result;
  if (!env.OPENAI_API_KEY) {
    result = { conclusion: 'neutral', title: 'secret 未設定', summary: 'OPENAI_API_KEY が設定されていないため判定していません。' };
  } else {
    try {
      const prepared = await config.prepare({ event, github });
      if (prepared.skip) {
        result = { conclusion: 'neutral', title: '判定対象外', summary: prepared.skip };
      } else {
        const decision = await createDecision({ apiKey: env.OPENAI_API_KEY, fetchImpl, ...prepared.request });
        result = { conclusion: 'success', ...prepared.summarize(decision.answers) };
      }
    } catch (error) {
      result = { conclusion: 'neutral', title: '判定に失敗しました', summary: `判定中にエラーが起きました。\n\n${error.message}` };
    }
  }

  log(`${config.checkName}: ${result.conclusion} / ${result.title}`);
  try {
    await github.createCheckRun({ name: config.checkName, headSha, ...result });
  } catch (error) {
    // fork の PR などで書き込み権限が無いとき。判定結果はログに残す
    log(`::warning::check run を作成できませんでした: ${error.message}`);
    log(result.summary);
  }
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run({ mode: process.argv[2], env: process.env });
}
