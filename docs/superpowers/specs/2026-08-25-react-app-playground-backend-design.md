# react-app-playground Backend 設計

## 目的

`react-app-playground` の MSW が提供している customers、deals、invoices、tasks の API を、PostgreSQL に永続化する独立した Go バックエンドへ置き換える。

バックエンドのリポジトリ名は `react-app-playground-backend`、Go module は `github.com/voice0726/react-app-playground-backend` とする。認証は `github.com/voice0726/auth-gateway` に集約し、業務データは認証ユーザー単位で分離する。

## スコープ

初期版に含めるもの:

- customers の一覧、作成、単体取得、更新、削除
- deals の一覧、作成、単体取得、更新
- invoices の一覧、作成、単体取得、更新と状態遷移
- tasks の一覧、作成、更新、削除
- `auth-gateway` のセッションを使う認証middleware
- PostgreSQL schema とバージョン管理されたmigration
- バックエンド専用PostgreSQLのローカルCompose環境
- Reactフロントのbetter-authモック認証から`auth-gateway`への切り替え
- Vite proxyを使った同一オリジンのローカル統合

初期版に含めないもの:

- projects API
- organization、membership、組織単位のマルチテナント
- roleを使った機能別認可
- dealの削除、invoiceの削除、taskの単体取得
- 一覧のサーバーサイドページング、検索、ソート
- 認証結果のキャッシュ
- `auth-gateway`、Redis、ZITADEL、フロントを複製した統合Compose
- OpenAPI生成、Kubernetes manifest、クラウドへのデプロイ

初期版のAPI範囲は、計画文書の「4機能すべてCRUD」という表現ではなく、現在のフロントとMSWが実際に呼び出している契約に合わせる。projectsと不足しているCRUD操作は後続フェーズとして扱う。

## 技術スタック

- Go 1.27.0
- Echo v5.3.1
- `log/slog`
- Fx v1.24.0
- GORM v1.31.2
- GORM PostgreSQL driver v1.6.2
- google/uuid v1.6.0
- PostgreSQL 18.6
- golang-migrate v4.19.1

依存はexact versionで固定する。新規リポジトリなのでEcho v5を採用し、v4互換コードは持ち込まない。EchoのRequestLoggerとslogを接続し、Fx LifecycleでHTTPサーバーとDB接続の開始・停止を管理する。

参考となる公式文書:

- [Echo Request Logger](https://echo.labstack.com/middleware/logger/)
- [Fx Lifecycle](https://uber-go.github.io/fx/lifecycle.html)
- [GORM Database Indexes](https://gorm.io/docs/indexes.html)
- [Go slog](https://pkg.go.dev/log/slog)
- [PostgreSQL 18.6 Documentation](https://www.postgresql.org/docs/18/)

## 全体アーキテクチャ

ブラウザからは同一オリジンに見せ、パスで各サービスへ振り分ける。

```text
Browser
  |
  v
Same-origin reverse proxy
  |-- /auth/* --> auth-gateway
  |-- /api/*  --> react-app-playground-backend
  `-- /*      --> React frontend

react-app-playground-backend
  |-- auth middleware --> auth-gateway /internal/session
  |-- Echo handler
  |-- feature service
  |-- GORM repository
  `-- PostgreSQL
```

本番のリバースプロキシ製品や配置方法は初期版のスコープ外とする。ローカルではVite proxyで`/api/*`をバックエンド、`/auth/*`を`auth-gateway`へ転送する。

### 責務境界

- Handler: JSON decode、入力検証、Service呼び出し、HTTP responseへの変換
- Service: 請求書状態遷移、関連顧客確認などの業務ルール
- Repository: GORMを使った永続化とユーザースコープ
- Auth client: `auth-gateway /internal/session`のHTTP契約
- Auth middleware: セッション検証と認証ユーザーのrequest contextへの格納
- Fx: constructorの接続とリソースのlifecycle管理
- slog: アプリケーション、HTTP、GORM、Fxの構造化ログ

業務ロジックはEcho、GORM、Fxへ依存させない。Fxをservice locatorとして使わず、constructor injectionだけに使用する。

## パッケージ構成

技術レイヤだけで巨大なパッケージを作らず、機能単位の境界を中心にする。

```text
cmd/
  api/main.go
internal/
  app/
  config/
  platform/
    authgateway/
    database/
    httpserver/
    logging/
  customer/
  deal/
  invoice/
  task/
  shared/
    httperror/
    requestuser/
migrations/
test/
docker-compose.yml
Dockerfile
Makefile
README.md
```

各feature packageはmodel、request/response DTO、repository interface、GORM repository、service、handler、testを持つ。feature間で実装型を直接参照せず、dealとinvoiceがcustomerの存在確認を必要とする場合は、customer packageが公開する最小のfinder interfaceをServiceへ注入する。

## 認証と認可

`auth-gateway`をセッションの唯一の正とする。業務APIはすべて認証必須で、`/healthz`と`/readyz`だけを除外する。

認証middlewareは次の順で処理する。

1. ブラウザから届いたCookie headerを取得する。
2. `GET {AUTH_GATEWAY_URL}/internal/session`を呼ぶ。
3. Cookie headerをそのまま転送する。
4. 環境変数の値を`X-Internal-Token`として付与する。
5. `{user_id, roles, email, name}`をdecodeし、`user_id`が空でないことを検証する。
6. 型付きの認証ユーザーをrequest contextへ格納する。

任意の受信header、Authorization header、request bodyは`auth-gateway`へ転送しない。Cookie、internal token、メールアドレスはログへ出さない。

認証結果の扱い:

- Cookieなし、またはgatewayの401: `401 Unauthorized`
- gatewayの不正なJSONや契約違反: `502 Bad Gateway`
- gatewayのtimeout、接続失敗、5xx: `503 Service Unavailable`
- 認証後に対象データが存在しない: `404 Not Found`

初期版は認証結果をキャッシュせず、毎回`auth-gateway`へ確認する。性能上の問題が実測された場合だけ、セッション失効とのトレードオフを定義して短時間キャッシュを別途設計する。

### CSRF

Cookie認証を使うため、`POST`、`PATCH`、`DELETE`では`Origin` headerが`PUBLIC_ORIGIN`と一致することを検証する。JSON endpointは`Content-Type: application/json`を要求し、未知のJSON fieldを拒否する。ローカルもVite proxyで同一オリジンにするため、バックエンドのCORS許可は初期版では不要とする。

## ユーザー単位のデータ分離

すべての業務テーブルに`owner_user_id text NOT NULL`を持たせる。値はrequest bodyやquery parameterから受け取らず、認証済みrequest contextの`user_id`だけを使用する。

Repositoryの公開メソッドはすべて`userID string`を必須引数にする。

```go
type Repository interface {
	List(ctx context.Context, userID string) ([]Customer, error)
	Find(ctx context.Context, userID string, id uuid.UUID) (Customer, error)
	Create(ctx context.Context, userID string, customer Customer) (Customer, error)
	Update(ctx context.Context, userID string, customer Customer) (Customer, error)
	Delete(ctx context.Context, userID string, id uuid.UUID) error
}
```

各GORM queryは`owner_user_id = ?`を明示する。暗黙的なglobal callbackやtenant pluginは導入しない。更新と削除もユーザー条件を含むSQLとして実行し、他ユーザーのUUIDを指定した場合は常にnot foundとして扱う。

## データモデル

### customers

- `id uuid PRIMARY KEY`
- `owner_user_id text NOT NULL`
- `name text NOT NULL`
- `email text NOT NULL`
- `phone text NOT NULL`
- `status text NOT NULL CHECK (status IN ('active', 'inactive'))`
- `created_at timestamptz NOT NULL`
- `updated_at timestamptz NOT NULL`
- `UNIQUE (owner_user_id, id)`
- `INDEX (owner_user_id, created_at, id)`

### deals

- `id uuid PRIMARY KEY`
- `owner_user_id text NOT NULL`
- `customer_id uuid NOT NULL`
- `title text NOT NULL`
- `amount bigint NOT NULL CHECK (amount >= 0)`
- `status text NOT NULL CHECK (status IN ('open', 'won', 'lost'))`
- `created_at timestamptz NOT NULL`
- `updated_at timestamptz NOT NULL`
- `FOREIGN KEY (owner_user_id, customer_id) REFERENCES customers (owner_user_id, id) ON DELETE RESTRICT`
- `INDEX (owner_user_id, created_at, id)`

### invoices

- `id uuid PRIMARY KEY`
- `owner_user_id text NOT NULL`
- `customer_id uuid NOT NULL`
- `number text NOT NULL`
- `amount bigint NOT NULL CHECK (amount >= 0)`
- `issue_date date NOT NULL`
- `due_date date NOT NULL CHECK (due_date >= issue_date)`
- `status text NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'cancelled'))`
- `created_at timestamptz NOT NULL`
- `updated_at timestamptz NOT NULL`
- `UNIQUE (owner_user_id, number)`
- `FOREIGN KEY (owner_user_id, customer_id) REFERENCES customers (owner_user_id, id) ON DELETE RESTRICT`
- `INDEX (owner_user_id, created_at, id)`

### tasks

- `id uuid PRIMARY KEY`
- `owner_user_id text NOT NULL`
- `title text NOT NULL`
- `description text NOT NULL`
- `status text NOT NULL CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE'))`
- `created_at timestamptz NOT NULL`
- `updated_at timestamptz NOT NULL`
- `INDEX (owner_user_id, created_at, id)`

金額は既存フロントに合わせて円単位の整数とし、Goでは`int64`を使用する。IDはアプリ側でUUIDを生成する。migration SQLをschemaの正とし、GORMの`AutoMigrate`は使用しない。

入力検証は各request DTOの`Validate` methodとして標準ライブラリ中心に実装し、validation frameworkは追加しない。Repository testのfakeも手書きし、mock生成libraryは追加しない。

参照中のcustomerを削除した場合は外部キー制約により拒否し、APIでは`409 Conflict`へ変換する。

## API契約

初期版で提供するendpoint:

```text
GET    /healthz
GET    /readyz

GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PATCH  /api/customers/:id
DELETE /api/customers/:id

GET    /api/deals
POST   /api/deals
GET    /api/deals/:id
PATCH  /api/deals/:id

GET    /api/invoices
POST   /api/invoices
GET    /api/invoices/:id
PATCH  /api/invoices/:id

GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

成功レスポンスは現在のフロントとの互換性を保つため、envelopeを付けず配列またはオブジェクトを直接返す。createは`201 Created`、deleteは`200 OK`と`{"success":true}`、その他の成功は`200 OK`とする。

JSON field名は既存契約のcamelCaseを維持する。`createdAt`はRFC 3339文字列、`issueDate`と`dueDate`は`YYYY-MM-DD`文字列として返す。DB管理用の`owner_user_id`と`updated_at`は現在のresponseには含めない。

一覧は`created_at ASC, id ASC`で順序を固定する。PATCH DTOはpointer fieldを使い、省略とzero valueを区別する。入力では必須値、文字数、メール形式、enum、金額、日付を検証する。

請求書の状態遷移は次だけを許可する。

- 同じ状態への更新
- `draft -> sent`
- `sent -> paid`
- 任意の状態から`cancelled`

状態更新はDB transaction内で対象行をロックし、現在状態を読み直してから検証する。並行更新でも不正な遷移を許可しない。

## エラー契約

共通のdomain errorを一元的なHTTP error handlerで次のように変換する。

- validation error: 400
- unauthenticated: 401
- resource not found: 404
- state、unique、foreign key conflict: 409
- auth gateway contract failure: 502
- auth gateway unavailable: 503
- unexpected error: 500

```json
{
  "error": {
    "code": "invoice_status_conflict",
    "message": "Invoice status cannot be changed from paid to sent."
  }
}
```

ServiceとRepositoryはHTTP statusを返さない。予期しないエラー、SQL、stack traceはresponseへ含めず、request IDとともにログへ記録する。

## 設定

設定は環境変数から読み込み、起動前に必須値と形式を検証する。

- `SERVER_ADDR`
- `DATABASE_URL`
- `AUTH_GATEWAY_URL`
- `AUTH_GATEWAY_INTERNAL_TOKEN`
- `PUBLIC_ORIGIN`
- `AUTH_GATEWAY_TIMEOUT`
- `SHUTDOWN_TIMEOUT`
- `LOG_LEVEL`
- `LOG_FORMAT`

`.env.example`にはダミー値だけを記載する。認証tokenやDB passwordをrepository、sample、test logへ含めない。

## Migration

golang-migrateを使用し、アプリ起動とmigration適用を分離する。

- `migrate up`: 未適用migrationを順に適用
- `migrate down 1`: 直前のmigrationを1件戻す
- CI: 空DBに対して`up -> down -> up`を実行

GORMの`AutoMigrate`はproduction、development、testのいずれでも呼び出さない。integration testも同じmigrationファイルを適用する。

## LoggingとLifecycle

開発環境ではslog TextHandler、本番ではJSONHandlerを使う。HTTP request logは`request_id`、`method`、`path`、`status`、`latency`を記録し、認証済みrequestでは`user_id`を加える。

GORM logはerrorとslow queryだけをslogへ流し、SQL parameterは記録しない。Fx自身のevent logもslogへ統合する。EchoのRecoverでpanicを500へ変換し、request ID付きで記録する。

Fx Lifecycleで次を管理する。

- OnStart: DB疎通確認後にHTTP serverをbackground goroutineで開始
- OnStop: timeout付きgraceful shutdownとDB connection close

`/healthz`はprocessの稼働だけを返す。`/readyz`はPostgreSQLへのpingが成功した場合だけ200を返す。起動時に必須設定やDB接続が不正ならprocessを成功状態にしない。

## テスト戦略

### Unit test

- request validation
- 請求書状態遷移
- Serviceの関連customer確認
- domain errorからHTTP statusへの変換
- 認証済みuser IDがRepositoryへ渡されること

### HTTP component test

`httptest.Server`で偽の`auth-gateway`を起動し、次を検証する。

- Cookieとinternal tokenの転送
- gatewayの401、5xx、timeout、不正JSONの変換
- 各HandlerのJSON契約
- Origin検証
- panicや内部エラーで秘密情報がresponseへ漏れないこと

### PostgreSQL integration test

実PostgreSQLへ同じmigrationを適用し、次を検証する。

- 各RepositoryのCRUD
- DB constraint
- ユーザーAからユーザーBのデータを取得、更新、削除できないこと
- dealとinvoiceが別ユーザーのcustomerを参照できないこと
- invoice numberの一意性がユーザー単位であること
- invoiceの並行状態更新
- 参照中customerの削除が拒否されること

追加のcontainer管理用Go libraryは導入しない。ローカルではComposeのPostgreSQL、CIではGitHub Actionsのservice containerを使う。

### ブラウザ統合確認

MSWを無効化し、Vite proxy経由でフロント、バックエンド、`auth-gateway`を接続する。

- 2ユーザーでログインし、互いのデータが表示されないこと
- customers、deals、invoices、tasksの主要操作
- セッション切れ後にログインへ戻れること
- 認証基盤停止時に通常の未認証として扱わず、サービス障害として表示されること

## Frontend連携

現在のbetter-authメール・パスワードフォームとMSW認証を、`auth-gateway`のredirect認証へ切り替える。

- login: `window.location.assign('/auth/login?redirect=...')`
- session restore: `GET /auth/me`
- logout: `/auth/logout?redirect=...`
- `{user_id,name,email,roles}`を既存のSessionUserへ変換
- API requestは引き続き相対URL`/api/*`を使用
- developmentではVite proxyを通す
- 実APIモードではMSWを起動しない

`auth-gateway`のREADMEはlogoutをPOSTと記載しているが、2026-08-25に確認したremote main `55f87d5bd0536b9416f40641ea1a98d16e2c4ef9`のrouterは`GET /auth/logout`を登録している。初期設計は実装されているGET契約を使用し、component testとブラウザ統合確認で固定する。gatewayがPOSTへ統一された場合はFrontend連携だけを更新する。

## ローカル開発環境

`react-app-playground-backend`のComposeはバックエンド専用PostgreSQLだけを所有し、official image `postgres:18.6`を固定して使用する。`auth-gateway`とそのPostgreSQL、Redis、ZITADELは別途起動し、`AUTH_GATEWAY_URL`で接続する。

READMEには次の順序を記載する。

1. バックエンド用PostgreSQLを起動する。
2. migrationを適用する。
3. `auth-gateway`を別repositoryから起動する。
4. バックエンドを起動する。
5. Vite proxyを設定したフロントを実APIモードで起動する。

## CIの完了条件

- gofmtによる差分がない
- `go vet ./...`が成功
- `go test -race ./...`が成功
- PostgreSQL integration testが成功
- 空DBでmigrationの`up -> down -> up`が成功
- `go build ./cmd/api`が成功
- Docker image buildが成功

## 実装フェーズ

1. 新規repository、Go module、設定、slog、Fx、Echo、health endpoint、CIの基盤
2. PostgreSQL Compose、GORM接続、migration、共通domain error
3. `auth-gateway` client、認証middleware、Origin検証
4. customers feature
5. deals feature
6. invoices feature
7. tasks feature
8. frontendの認証切り替え、Vite proxy、MSW切り替え
9. 実サービスを使うブラウザ統合確認とドキュメント整備

各フェーズは失敗するtestから開始し、そのフェーズ単独でreview可能なcommitにする。

## 完了条件

- 認証済みユーザーが4機能の既存画面を実APIで利用できる
- データがPostgreSQLへ永続化される
- 2ユーザー間でデータが分離される
- 他ユーザーのUUIDを使った参照、更新、削除がnot foundになる
- 認証失敗と`auth-gateway`障害が異なるHTTP statusになる
- invoiceの状態遷移と参照整合性がDBを含むtestで保証される
- MSWを無効化した主要フローをbrowser automationで確認できる
- projectsは未実装のまま、後続フェーズとして明示される
