# ローカル統合環境

フロント、auth-gateway、バックエンドをローカルで起動し、バックエンド結合 E2E を実行する手順です。DB・ZITADEL・auth-gateway は Compose で、Go API と Vite はホストプロセスで動かします。

## 前提

- コンテナエンジンが起動し、`docker compose` が使えること。Podman を使う場合は `CONTAINER_ENGINE=podman` を指定し、`podman compose` が使えること（Podman の machine も起動しておく）
- Go、pnpm、curl がインストール済みであること
- `pnpm install` 済みであること
- 関連リポジトリが既定の場所にあること。異なる場合は `AUTH_GATEWAY_DIR` と `REACT_APP_PLAYGROUND_BACKEND_DIR` で指定します
- auth-gateway の ZITADEL にReact用OIDCクライアントがあり、redirect URI が `http://react.localtest.me:5174/auth/callback` であること
- auth-gateway の `config/compose.yaml` に登録した `internal_token` と同じ値を `AUTH_GATEWAY_INTERNAL_TOKEN` に指定すること。未指定時は開発設定の `replace-with-react-internal-token` を使います

ZITADEL の新しいDBを使う場合は、初回起動後にConsoleでReact用OIDCクライアントを登録してください。PKCEを使う公開クライアントを作り、リダイレクトURIに `http://react.localtest.me:5174/auth/callback` を登録します。発行されたClient IDをauth-gatewayの `config/compose.yaml` の `applications[].client_id` に設定してから起動します。初期管理者の案内は、auth-gateway リポジトリのディレクトリで `docker compose logs zitadel`（Podman では `podman compose`） を実行して確認できます。

E2E用の2ユーザーもZITADELに事前作成してください。認証情報をこのリポジトリに保存しないため、ユーザー登録とOIDCクライアントの初回登録は自動化しません。

## 起動

リポジトリルートで次を実行します。

```sh
CONTAINER_ENGINE=podman bash scripts/local-dev-env.sh
```

スクリプトは auth-gateway の PostgreSQL と ZITADEL を起動し、auth-gateway の migration を実行して gateway/login を起動します。続いてバックエンドDBを起動し、業務DBの migration 後に Go API と Vite を起動します。フロントは `http://react.localtest.me:5174`、API は `http://localhost:18080`、auth-gateway は `http://localhost:8800`、ZITADEL は `http://auth.localtest.me:8080` です。

`Ctrl-C` で Go API と Vite を終了します。Compose のコンテナは残ります。停止する場合は各リポジトリで `docker compose down`（Podman では `podman compose`） を実行してください。DBデータを保持するため、`down -v` は使いません。

E2EではPlaywright専用のViteとポートが競合するため、次のモードで起動します。このモードはDB、ZITADEL、gateway、migration、Go APIを準備し、Viteは起動しません。

E2Eは案件・請求書などの業務データを作り、削除APIがないものがあります。通常開発のDBを汚さないよう、このモードは同じPostgreSQL内に使い捨てのdatabase `playground_e2e`（`E2E_DATABASE_NAME` で変更可）を作り直してmigrationとAPIに使い、終了時に破棄します。通常開発用の `playground` には触れません。

```sh
CONTAINER_ENGINE=podman bash scripts/local-dev-env.sh e2e
```

結合 E2E は組織・メンバー権限・サーバーページング・請求書の一括ステータス API に対応したバックエンドが必要です。関連リポジトリの main を使ってください。

## E2E用ユーザー状態

E2E は異なる ZITADEL ユーザー2名の認証済みstorage stateを必要とします。各コマンドでブラウザーが開くため、ZITADELに実際にログインしてください。

stateの作成には `http://react.localtest.me:5174` のViteが必要です。先に既定モードの `CONTAINER_ENGINE=podman bash scripts/local-dev-env.sh` を起動し、別ターミナルで次の手順を実行してください。作成後は `Ctrl-C` で止め、「E2E実行」に進みます。

1. ユーザーA用stateを作ります。

   ```sh
   pnpm --filter @playground/web exec playwright codegen --save-storage=../../tests/fixtures/e2e-user-a.json http://react.localtest.me:5174/login
   ```

2. ブラウザーでユーザーAとしてログインし、ログイン後にブラウザーを閉じます。
3. 同じ手順をユーザーBで実行します。ユーザーAとは異なるZITADELアカウントを選びます。

   ```sh
   pnpm --filter @playground/web exec playwright codegen --save-storage=../../tests/fixtures/e2e-user-b.json http://react.localtest.me:5174/login
   ```

PlaywrightはログインCookieをブラウザーコンテキストから保存します。実ユーザー認証情報を自動入力できないため、各ユーザーのログインは手動です。storage stateは `tests/fixtures/*.json` としてgit管理対象外です。

## E2E実行

`CONTAINER_ENGINE=podman bash scripts/local-dev-env.sh e2e` を起動したまま、別ターミナルでリポジトリルートから実行します。

```sh
E2E_USER_A_STORAGE_STATE="$PWD/tests/fixtures/e2e-user-a.json" \
E2E_USER_B_STORAGE_STATE="$PWD/tests/fixtures/e2e-user-b.json" \
pnpm test:e2e:backend
```

ルートの `pnpm test:e2e:backend` は Turbo を経由せず `apps/web` のスクリプトを直接呼ぶため、上の環境変数はそのまま Playwright に渡ります。

テストは専用の組織を作成し、ユーザーAとBで組織の共有・分離と閲覧者・編集者の権限を確認します。既存の組織名・ユーザーID・業務データには依存しません。組織の事前作成やメンバー追加は不要です。

通常のテストは `chromium` プロジェクトで実行します。依存先の `logout` プロジェクトは、通常のテストがすべて成功した後でユーザーAのセッションを終了します。通常のテストが失敗した場合、ログアウトのテストはスキップします。ログアウトが成功すると、JSONファイルが残っていても、保存済みのユーザーA stateは次の実行では認証されません。再実行する前に、「E2E用ユーザー状態」の手順でユーザーAのstateを作り直してください（`apps/web/README.md` にも同じ注意があります）。

Playwrightが自身のViteサーバーを起動します。終了後に起動スクリプトを `Ctrl-C` で止めます。ComposeのDB、ZITADEL、gatewayは起動したままで構いません。

E2E開始時に `/api/healthz`、匿名 `/auth/me`、両storage stateの認証状態と異なる `user_id` を確認します。
