# Web

通常の開発は `VITE_USE_MSW=false pnpm --filter @playground/web dev` で起動します。
開くURLは `http://react.localtest.me:5174` です。
`/api` はbackend、`/auth` はauth-gatewayへVite proxy経由で接続します。

## Cloudflare Workers

Worker名は `react-app-playground` です。`wrangler.jsonc` にカスタムドメイン `react-app-playground.aknr.dev` を指定しています。
旧 `tanstack-playground` のWorkerと設定は変更しません。

| リクエスト | 配信・転送先 |
| --- | --- |
| `/api/*` | `https://react-app-playground-backend-tqhoqdmw4a-uc.a.run.app`。パスとクエリを維持 |
| `/auth/*` | `https://auth.aknr.dev`。パスとクエリを維持し、`X-App-Id` を `react-app-playground` に上書き |
| その他 | `dist` の静的アセット。画面のURLはSPA fallbackで `index.html` を配信 |

中継はHTTPメソッド・本文・Cookie・Originを維持します。
上流のリダイレクトを追跡せず、LocationとSet-Cookieをブラウザへ返します。
SPAの設定は [Cloudflareの公式仕様](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/) に従います。
APIと認証のリクエストはWorkerを先に実行します。

```sh
pnpm install --frozen-lockfile
pnpm --filter @playground/web typecheck
pnpm --filter @playground/web lint
pnpm --filter @playground/web test
pnpm --filter @playground/web dev:worker
```

`dev:worker` はViteでビルドしてからローカルのWranglerを起動します。
表示URLは通常 `http://localhost:8787` です。
中継先は本番サービスなので、認証操作には本番のCookie・origin設定が適用されます。
ローカル配信の成功だけでは本番のOIDCログイン成功を確認できません。

デプロイ前にZITADELのReact用OIDCクライアントへ次のredirect URIを登録します。

```text
https://react-app-playground.aknr.dev/auth/callback
```

gatewayのReact設定のoriginとバックエンドの `PUBLIC_ORIGIN` は `https://react-app-playground.aknr.dev` に合わせます。
Cloudflareへログイン済みの環境で、次のコマンドを実行します。
[Custom Domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) の設定はデプロイ時に適用されます。

```sh
pnpm --filter @playground/web run deploy
```

本番へのデプロイ、Cloudflareの設定適用、ZITADELの登録はこの実装では実行していません。

## 実サービスのE2E

backendとauth-gatewayを起動し、2ユーザー分の認証済みstorage stateを用意します。
Cookieのホストは `react.localtest.me` に揃えます。
業務データを作成するため、専用の検証用DBとテストユーザーを使います。
案件・請求書には削除APIがないため、検証後は専用DBを破棄します。
storage stateには認証情報が含まれます。リポジトリへ追加しません。

```sh
E2E_USER_A_STORAGE_STATE=/secure/path/user-a.json \
E2E_USER_B_STORAGE_STATE=/secure/path/user-b.json \
pnpm --filter @playground/web test:e2e
```

接続先を変える場合は `VITE_BACKEND_URL` と `VITE_AUTH_GATEWAY_URL` を指定します。
frontendのoriginは固定です。gatewayのoriginとbackendの `PUBLIC_ORIGIN` も一致させます。
E2Eは専用のViteを起動します。既存の5174番ポートのサーバーは先に停止してください。

`tests/backend-integration.config.ts` を共通設定として使用します。
storage stateの欠落、期限切れ、同一ユーザーの指定は実行前にエラーになります。
4機能の画面操作、2ユーザー分離、ログイン開始、401、ログアウトを検証します。
障害時の表示と再試行はブラウザの通信を差し替えて検証します。

ログアウトのテストは最後に実行します。
成功時はuser Aのセッションを終了するため、再実行前にstorage stateを更新します。
