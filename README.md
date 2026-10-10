# react-app-playground

## アプリ別のgatewayセッション

開発時は `http://react.localtest.me:5174` を開きます。`VITE_AUTH_GATEWAY_URL` の既定値は `http://localhost:8800` です。Viteは `/auth/*` のパスとクエリを維持してgatewayへ転送します。クライアントの `X-App-Id` は固定値 `react-app-playground` で上書きします。

ZITADELのReact用OIDCクライアントに `http://react.localtest.me:5174/auth/callback` を登録し、gatewayのReact設定のoriginも一致させます。Cookieはホスト専用なので `localhost:5173` とはログイン状態を共有しません。本番のCloudflare Workerもパスを維持し、同じ固定ヘッダを付けます。[デプロイ手順](apps/web/README.md#cloudflare-workers)を参照してください。

gatewayの移行後は再ログインが必要です。ReactのログアウトはReactのセッションだけを終了し、ZITADELのログイン状態は維持します。

Reactバックエンドの開発ポートは `18080` とし、ZITADELの `8080` と分けます。`VITE_BACKEND_URL` とバックエンドの `SERVER_ADDR` を対応させてください。
