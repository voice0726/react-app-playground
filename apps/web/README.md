# Web

通常の開発は `VITE_USE_MSW=false pnpm --filter @playground/web dev` で起動します。
開くURLは `http://react.localtest.me:5174` です。
`/api` はbackend、`/auth` はauth-gatewayへVite proxy経由で接続します。

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
