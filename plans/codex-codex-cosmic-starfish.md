# BtBアプリケーション Playground 実装計画

## Context

指定スタックを全て使ったPlayground的な中規模BtBアプリケーションをゼロから構築する。
実装はCodexが担当し、ClaudeはこのPlanを起点にCodexへ指示を出す。

---

## 採用する Feature（4つ）

| Feature | 説明 | 関連 |
|---------|------|------|
| customers（顧客管理） | 顧客のCRUD・一覧テーブル | 独立 |
| deals（案件管理） | 案件CRUD・顧客と紐付く | customers の型を使用 |
| invoices（請求書管理） | 請求書CRUD・ステータス遷移 | 独立 |
| tasks（タスク管理） | Kanbanボード・dnd-kitでカード移動 | 独立 |

---

## ディレクトリ構成

```
react-app-playground/              ← Turborepo root
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                   ← workspace root
├── .lefthook.yml
├── knip.config.ts
├── apps/
│   └── web/                       ← メインReactアプリ
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── playwright.config.ts
│       ├── .dependency-cruiser.cjs
│       ├── .oxlintrc.json
│       └── src/
│           ├── main.tsx
│           ├── components/        ← 複数featureで使う共通コンポーネント
│           ├── features/
│           │   ├── auth/
│           │   ├── customers/
│           │   │   ├── api/
│           │   │   ├── components/
│           │   │   ├── schemas/
│           │   │   └── types/
│           │   ├── deals/         ← customers の型を src/types/ 経由で参照
│           │   ├── invoices/
│           │   └── tasks/
│           │       └── stores/    ← Kanban用 Zustand store
│           ├── routes/            ← TanStack Router ファイルベース
│           │   ├── __root.tsx
│           │   ├── index.tsx      ← /dashboard へリダイレクト
│           │   ├── login/
│           │   │   └── route.tsx
│           │   └── _authenticated/
│           │       ├── route.tsx  ← AppShell + 認証ガード
│           │       ├── dashboard/route.tsx
│           │       ├── customers/
│           │       │   ├── route.tsx
│           │       │   └── $customerId/route.tsx
│           │       ├── deals/
│           │       │   ├── route.tsx
│           │       │   └── $dealId/route.tsx
│           │       ├── invoices/
│           │       │   ├── route.tsx
│           │       │   └── $invoiceId/route.tsx
│           │       └── tasks/route.tsx
│           ├── types/             ← feature間で共有する型
│           │   └── customer.types.ts
│           ├── lib/
│           │   ├── auth.ts        ← better-auth クライアント初期化
│           │   ├── queryClient.ts
│           │   └── stores/
│           │       └── session.store.ts
│           ├── mocks/
│           │   ├── browser.ts     ← dev用 MSW worker
│           │   ├── server.ts      ← test用 MSW server
│           │   ├── handlers/
│           │   │   ├── index.ts
│           │   │   ├── auth.ts
│           │   │   ├── customers.ts
│           │   │   ├── deals.ts
│           │   │   ├── invoices.ts
│           │   │   └── tasks.ts
│           │   └── data/
│           │       └── seed.ts    ← 固定テストデータ
│           └── test-setup.ts
├── tests/                         ← Playwright E2Eテスト
│   ├── auth.spec.ts
│   ├── customers.spec.ts
│   ├── deals.spec.ts
│   └── tasks.spec.ts
└── packages/
    └── lint-config/               ← oxlint設定の共有（軽量）
        ├── package.json
        └── oxlint.json
```

---

## ルーティング方針

- **ファイルベース**（TanStack Router + `@tanstack/router-plugin/vite`）
- **ディレクトリ + `route.tsx`** でルートを定義（`customers.tsx` のようなファイル名のみは禁止）
- `_authenticated/` レイアウトルート配下が認証必須ページ
- `_authenticated/route.tsx` の `beforeLoad` でZustandセッション確認 → 未認証なら `/login` に `throw redirect()`

---

## 認証（better-auth + MSW）

- クライアントSDKのみ使用（サーバー側なし）
- MSWが `/api/auth/*` を全てモック

```
POST /api/auth/sign-in/email  → デモアカウント: demo@example.com / password
GET  /api/auth/get-session    → メモリ上のセッションを返す
POST /api/auth/sign-out       → セッションをクリア
```

- セッション状態は `lib/stores/session.store.ts`（Zustand）で管理
- アプリ起動時（`main.tsx`）に `GET /api/auth/get-session` でセッション復元

---

## 状態管理の責務分担

| 状態 | 担当 |
|------|------|
| サーバーデータ・キャッシュ | TanStack Query |
| 一覧のソート・フィルタ状態 | TanStack Router searchParams（URL永続化） |
| Kanban ドラッグ中の楽観的状態 | Zustand（`features/tasks/stores/`） |
| 認証セッション | Zustand（`lib/stores/session.store.ts`） |
| フォーム状態 | react-hook-form（ローカル） |

---

## 各 Feature の実装ポイント

### customers
- TanStack Table でソート・フィルタリング（クライアントサイド）
- react-hook-form + `@hookform/resolvers/zod` でZodスキーマと連携したフォームバリデーション
- ステータス: `active` / `inactive`

### deals（customers と関連）
- 案件作成フォームで顧客をSelectで選択（`useCustomers` クエリ）
- 詳細画面で関連顧客情報を表示
- 共有型は `src/types/customer.types.ts` に置き、dependency-cruiser の例外対象にする

### invoices
- date-fns で発行日・支払期限を処理
- ts-pattern で請求書ステータス遷移を型安全に実装
  - `draft → sent → paid` の一方向遷移
  - `cancelled` はどのステータスからも遷移可能

### tasks（Kanban）
- dnd-kit の `DndContext` + `SortableContext` でカード移動
- カラム固定: `TODO` / `IN_PROGRESS` / `DONE`
- ドロップ完了で `useMutation` 呼び出し + Zustandで楽観的更新

---

## dependency-cruiser 設定方針

feature間の直接インポートを禁止：

```js
// .dependency-cruiser.cjs
forbidden: [
  {
    name: 'no-cross-feature-import',
    severity: 'error',
    from: { path: '^src/features/([^/]+)/' },
    to: {
      path: '^src/features/',
      pathNot: ['^src/features/\\1/'],  // 自 feature はOK
    },
  },
]
// src/types/ からのインポートは上記ルール対象外（pathNot で除外）
```

---

## テスト戦略

### Vitest（Unit / Integration）

**優先対象：**
- Zodスキーマのバリデーションロジック（各 `schemas/*.schema.ts`）
- invoicesのts-pattern状態遷移ロジック
- Zustand kanban.store の状態変更ロジック
- ログインフォームの正常系・エラー系

**MSW分岐：**
- dev: `src/mocks/browser.ts`（Service Worker）
- test: `src/mocks/server.ts`（`setupServer`）

### Playwright（E2E）

最小限の Happy Path をカバー：

| テスト | 対象フロー |
|--------|-----------|
| `auth.spec.ts` | ログイン・ログアウト・未認証リダイレクト |
| `customers.spec.ts` | 作成→一覧表示→詳細閲覧 |
| `deals.spec.ts` | 案件作成（顧客紐付け）→詳細確認 |
| `tasks.spec.ts` | タスク作成→Kanbanドラッグ移動 |

---

## Codexへの実装フェーズ指示順序

### Phase 1: インフラ・共通基盤

- ルート `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- `packages/lint-config/`（oxlint設定）
- `apps/web/package.json`, `tsconfig.json`, `vite.config.ts`
- `.lefthook.yml`（pre-commit: lint + typecheck）
- `apps/web/.dependency-cruiser.cjs`
- `knip.config.ts`

**tsconfig.json の重要設定：**
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "jsx": "react-jsx",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### Phase 2: MSWモック + 認証基盤

- `src/mocks/data/seed.ts`（固定データ: 顧客10件・案件15件・請求書8件・タスク10件）
- `src/mocks/handlers/`（auth + 各feature）
- `src/mocks/browser.ts` + `src/mocks/server.ts`
- `src/lib/auth.ts`（better-auth クライアント）
- `src/lib/stores/session.store.ts`（Zustand）
- `src/lib/queryClient.ts`
- `src/main.tsx`

### Phase 3: ルーティング + レイアウト

- `src/routes/__root.tsx`（MantineProvider・QueryClientProvider）
- `src/routes/index.tsx`（リダイレクト）
- `src/routes/login/route.tsx`
- `src/routes/_authenticated/route.tsx`（AppShell + 認証ガード）
- `src/components/AppNav.tsx`
- `src/routes/_authenticated/dashboard/route.tsx`

### Phase 4a: customers feature（Phase 3 完了後）

- schemas, types, api（queries/mutations）, components, routes

### Phase 4b: invoices feature（Phase 3 完了後、4a と並行可）

- schemas, types（ts-patternのStatus型）, api, components, routes

### Phase 4c: tasks feature（Phase 3 完了後、4a と並行可）

- schemas, stores（kanban.store.ts）, api, components（KanbanBoard/Column/Card）, routes

### Phase 4d: deals feature（Phase 4a 完了後）

- `src/types/customer.types.ts` を4aから移行
- schemas, types, api, components（顧客Select含む）, routes

### Phase 5: テスト実装

- Vitestユニット/インテグレーションテスト
- Playwright セットアップ + E2Eテスト

### Phase 6: 品質チェック（最終確認）

- `pnpm knip` で未使用コード確認
- `pnpm --filter @playground/web check-deps` で依存ルール確認
- `pnpm typecheck` で型チェック通過
- `pnpm test` + `pnpm test:e2e` 全通過

---

## 検証方法

1. `pnpm dev` でアプリ起動 → `http://localhost:5173` でログイン画面表示
2. `demo@example.com` / `password` でログイン → ダッシュボードへ遷移
3. 未認証状態で `/customers` アクセス → `/login` にリダイレクトされること
4. 各 feature の CRUD 操作が MSW 経由で動作すること
5. Kanban でカードを別カラムにドラッグできること
6. 請求書のステータスボタンが Draft→Sent→Paid の順に遷移すること
7. 案件詳細に関連顧客情報が表示されること
8. `pnpm test` で Vitest テストが全通過
9. `pnpm test:e2e` で Playwright テストが全通過
