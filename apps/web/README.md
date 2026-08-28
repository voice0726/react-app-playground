# Web

通常の開発は `VITE_USE_MSW=false pnpm --filter @playground/web dev` で起動します。`/api` はbackend、`/auth` はauth-gatewayへVite proxy経由で接続します。

実サービスのbrowser integrationは、backendとauth-gatewayを起動したうえで、認証済みcookieを含むstorage stateのpathを設定して実行します。storage stateには認証情報を含め、リポジトリへ追加しません。

```sh
E2E_USER_A_STORAGE_STATE=/secure/path/user-a.json \
E2E_USER_B_STORAGE_STATE=/secure/path/user-b.json \
pnpm --filter @playground/web test:e2e
```

このscriptは `apps/web/playwright.config.ts` から `tests/*.backend.spec.ts` を実行し、2ユーザー分離、4リソース、logout、認証/backend障害を検証します。storage stateが未設定または存在しない場合はskipせず終了します。
