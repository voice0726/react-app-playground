---

# Project: react-app-playground

BtBアプリケーション Playground。概要・構成・コマンドは `README.md` を参照する。

`plans/codex-codex-cosmic-starfish.md` は初期の設計メモで、feature の数など現状と合わない箇所がある。実装の根拠にはコードを優先する。

## 技術スタック・ルール

設定やコードから読み取れる内容（TypeScript 設定、パスエイリアス、依存関係、feature間の依存検査、pre-commit）は書かない。

- パッケージマネージャは pnpm のみ。`npm` / `yarn` は使わない
- フォームは react-hook-form + Zod。Mantine の `useForm` は使わない
- ルートは必ず `ディレクトリ/route.tsx` の形式にする
- 状態管理の使い分け
  - サーバーデータ: TanStack Query
  - 認証セッション・Kanban状態: Zustand
  - 一覧のソート・フィルタ: TanStack Router の searchParams
- feature 間で共有する型は `src/types/` に置き、他 feature を直接 import しない
- コメントは WHY が非自明な場合だけ1行書く
- `any` を使わない。型は `import type` で読み込む

## 繰り返し出た不具合

過去の修正（#22〜#25）と独立レビューの指摘から、新しい画面や変更でも再発しやすいもの。

- 一覧の検索条件を変えるとき、検索欄ごと再描画しない。入力欄は維持し、結果部分だけ読み込み表示にする。フォーカスが外れて1文字しか入力できなくなる
- 保存結果は、開いているフォームの対象と一致するときだけ反映する。画面を切り替えた後や新規フォームを開き直した後に、古い保存結果・保存エラーを引き継がない
- URL の sort 列は一覧ごとに許可リストで検証する。フロントが送る値とバックエンドが許可する値を一致させる。食い違うと 400 になる
- 削除など取り消せない操作は、確認ダイアログを挟む
- ドラッグ操作は、同じ操作をキーボードでもできるようにする。移動の保存中は次の移動を受け付けず、保存に失敗したら元の状態へ戻して画面に伝える

## テスト

- ユニット/インテグレーション: Vitest + @testing-library/react + MSW
- E2E: Playwright。設定とテストはルートの `tests/` にある（`apps/web/` 配下ではない）
- E2E のクリックは `dispatchEvent('click')` でなく `.click()` を使う。前者は可視・有効などの actionability チェックを迂回する
- 新しい worktree では `routeTree.gen.ts` が無く typecheck が落ちる。`pnpm --filter @playground/web build` で生成してから commit する

## 検証

- 変更後は `pnpm typecheck` / `pnpm lint` / `pnpm test` を通す。UI や API 契約に触れたら `pnpm test:e2e` も通す
- `pnpm knip` も通す。新しい worktree では先に `routeTree.gen.ts` を生成する
- `pnpm check-deps` は TypeScript 7 の未対応警告を出す。警告だけで失敗していなければ変更起因ではない

## コミット規約

- コミットメッセージと PR タイトルは日本語で書く
- フォーマット: `<種別>: <要約>`（Conventional Commits。例: `feat: 顧客一覧に検索を追加する`）
