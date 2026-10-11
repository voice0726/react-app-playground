# react-app-playground

BtBアプリケーションのPlaygroundです。pnpm + Turborepoのモノレポで、React + TypeScriptの中規模アプリを実装しています。

## 構成

- `apps/web`: Webアプリ本体とCloudflare Worker
- `packages/lint-config`: 共有のlint設定
- `tests`: バックエンド結合E2Eの設定

画面は `customers`・`deals`・`invoices`・`projects`・`tasks`・`tickets` のfeatureと、ダッシュボードで構成します。

## 技術スタック

React 19 / Vite / TypeScript 7 / TanStack Router・Query / Mantine / react-hook-form + Zod / Zustand / dnd-kit。
テストはVitest・MSW・Playwright、lintはoxlintです。

## セットアップ

```sh
pnpm install
cp apps/web/.env.example apps/web/.env
pnpm --filter @playground/web dev
```

`.env.example` は実バックエンドへ接続する設定（`VITE_USE_MSW=false`）です。MSWのモックで動かすときは `VITE_USE_MSW=true` にします。接続手順は次節に従ってください。

フロント、auth-gateway、バックエンドをまとめて起動する手順は[ローカル統合環境](docs/local-development.md)を参照してください。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm build` | 全パッケージのビルド |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | oxlint |
| `pnpm test` | VitestとWorkerのテスト |
| `pnpm test:e2e` | バックエンド結合E2E |
| `pnpm check-deps` | feature間の依存ルール検査 |
| `pnpm knip` | 未使用コードの検出 |

## アプリ別のgatewayセッション

開発時は `http://react.localtest.me:5174` を開きます。`VITE_AUTH_GATEWAY_URL` の既定値は `http://localhost:8800` です。Viteは `/auth/*` のパスとクエリを維持してgatewayへ転送します。クライアントの `X-App-Id` は固定値 `react-app-playground` で上書きします。

ZITADELのReact用OIDCクライアントに `http://react.localtest.me:5174/auth/callback` を登録し、gatewayのReact設定のoriginも一致させます。Cookieはホスト専用なので `localhost:5173` とはログイン状態を共有しません。本番のCloudflare Workerもパスを維持し、同じ固定ヘッダを付けます。[デプロイ手順](apps/web/README.md#cloudflare-workers)を参照してください。

gatewayの移行後は再ログインが必要です。ReactのログアウトはReactのセッションだけを終了し、ZITADELのログイン状態は維持します。

Reactバックエンドの開発ポートは `18080` とし、ZITADELの `8080` と分けます。`VITE_BACKEND_URL` とバックエンドの `SERVER_ADDR` を対応させてください。
