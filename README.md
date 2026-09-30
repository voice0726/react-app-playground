# react-app-playground

## アプリ別のgatewayセッション

開発時は `http://react.localtest.me:5174` を開きます。`VITE_AUTH_GATEWAY_URL` の既定値は `http://localhost:8800` です。Viteは `/auth/*` をgatewayの `/auth/react-app-playground/*` に転送します。ブラウザの呼び出し先は従来どおり `/auth/*` です。

ZITADELのReact用OIDCクライアントに `http://react.localtest.me:5174/auth/callback` を登録し、gatewayのReact設定のoriginも一致させます。Cookieはホスト専用なので `localhost:5173` とはログイン状態を共有しません。本番ではViteの開発プロキシの代わりに、同じ固定パス変換を持つリバースプロキシを用意してください。

gatewayの移行後は再ログインが必要です。ReactのログアウトはReactのセッションだけを終了し、ZITADELのログイン状態は維持します。

Reactバックエンドの開発ポートは `18080` とし、ZITADELの `8080` と分けます。`VITE_BACKEND_URL` とバックエンドの `SERVER_ADDR` を対応させてください。
