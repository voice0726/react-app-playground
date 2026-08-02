---

# Project: react-app-playground

BtBアプリケーション Playground。TurborepoモノレポでReact + TypeScriptを使った中規模アプリ。

## 実装計画

`plans/codex-codex-cosmic-starfish.md` を必ず参照すること。フェーズ・ディレクトリ構成・設計判断の全詳細が記載されている。

## 技術スタック・ルール

### パッケージマネージャ

- **pnpm** を使用する。`npm` や `yarn` は使わない
- コマンド例: `rtk pnpm install`, `pnpm --filter @playground/web dev`

### TypeScript

- TypeScript 7（ネイティブ実装）を使用する。型チェックは `tsc --noEmit`
- `strict: true`, `noUncheckedIndexedAccess: true` を有効にすること
- `verbatimModuleSyntax: true`
- `moduleResolution: "bundler"`

### フォーム

- **react-hook-form** + **@hookform/resolvers/zod** でZodスキーマと連携する
- Mantine の `useForm` は使わない

### Lint

- **oxlint** を使用（ESLintは使わない）
- `apps/web/.oxlintrc.json` に設定を置く

### テスト

- ユニット/インテグレーション: **Vitest** + **@testing-library/react** + **MSW**
- E2E: **Playwright**（`apps/web/tests/` 配下）

### ルーティング

- **TanStack Router** ファイルベース
- ルートは必ず `ディレクトリ/route.tsx` の形式（`customers.tsx` のようなファイル名のみは禁止）

### 状態管理

- サーバーデータ: TanStack Query
- フォーム: react-hook-form（ローカル）
- 認証セッション・Kanban状態: Zustand
- 一覧のソート・フィルタ: TanStack Router searchParams

### コーディング規約

- コメントは原則書かない（WHYが非自明な場合のみ1行）
- `any` 型は使わない
- `import type` を型インポートに使う（`verbatimModuleSyntax` 対応）
- パスエイリアス `@/*` → `src/*` を使う

### feature間依存ルール

- `src/features/A/` が `src/features/B/` を直接インポートしてはいけない
- feature間で共有する型は `src/types/` に置く
- `deals` feature が `customers` の型を使う場合は `src/types/customer.types.ts` 経由で参照する

## コミット規約

- コミットメッセージは日本語で書く
- フォーマット: `<種別>: <要約>`（例: `feat: Turborepoセットアップ`）
- pre-commitフック（lefthook）でlint + typecheckが走る
