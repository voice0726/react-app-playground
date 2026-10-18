# ブラウザテスト

`tests/` の Playwright テストを用途ごとに分けています。

| コマンド | 検証するもの | 必要な環境 |
| --- | --- | --- |
| `pnpm test:e2e` / `pnpm test:e2e:backend` | 実 API・認証境界・ユーザー間分離 | バックエンドと認証済みの 2 ユーザー |
| `pnpm test:e2e:standalone` | MSW を使う画面操作 | Chromium |
| `pnpm test:vrt` | MSW の固定データを表示した画面の画像比較 | CI の Linux 環境と基準画像 |

バックエンド結合 E2E の準備は[ローカル統合環境](local-development.md)に従ってください。
単体 E2E と VRT は実バックエンドへ接続しません。
MSW のデータはブラウザのページ単位で初期化されます。
再読み込みをまたぐデータ永続化は、バックエンド結合 E2E で検証します。

## 操作テストの対象

| 対象 | 単体 E2E での検証 |
| --- | --- |
| ダッシュボード | 顧客・案件・請求書・タスクの件数 |
| 顧客 | 作成・詳細・編集・削除確認・削除キャンセル・削除・必須入力 |
| 顧客一覧 | 検索・ソートの URL 保存・再読み込み・空の結果からの復帰 |
| 案件 | 作成・関連顧客表示・タイトルと状態の編集 |
| 請求書 | 作成・送付・支払・キャンセル・終端状態の操作ボタン |
| タスク | 作成・状態選択・ドラッグによる移動 |
| チケット | 作成・詳細・編集・コメント投稿／編集／削除・削除確認とキャンセル |
| チケット一覧 | 検索・状態フィルタ・ページング・表示件数・URL 復元・空の結果 |
| チケットの異常系 | 存在しない ID のエラーと一覧への復帰 |
| プロジェクト | 必須入力・送信時の API 未実装メッセージ |
| セッション | サインアウト後のログイン画面 |

API 障害・401・ログアウト再試行・ユーザー間分離は既存のバックエンド結合 E2E にあります。
フォームの保存失敗、保存中の画面切替、タスク移動失敗時の復元は Vitest にあります。
上記の異常系を今回の単体 E2E がすべて代替するわけではありません。
タスクの状態選択は Playwright の `selectOption` で検証します。
物理キーによるネイティブ選択欄の操作は自動検証に含めていません。
プロジェクト API は未実装のため、保存成功のテストはありません。

## VRT の対象と固定条件

主要な一覧・詳細・作成／編集フォーム・ダッシュボード・ログインに基準画像があります。
顧客作成モーダルの入力エラー・削除確認・検索結果なしも比較します。
17 状態をデスクトップとモバイルの 2 サイズで撮影します。
モバイルは Chromium の端末エミュレーションです。
実機や Safari の表示を保証するものではありません。

| 条件 | 固定値 |
| --- | --- |
| 基準環境 | CI の Linux、公式 Playwright イメージ `v1.64.0-noble` |
| デスクトップ | 1440 x 1000、deviceScaleFactor 1 |
| モバイル | 390 x 844、deviceScaleFactor 1、タッチ有効 |
| 言語・時刻 | ja-JP、Asia/Tokyo、2026-04-06 12:00 |
| 表示 | ライト、reducedMotion、アニメーション無効、キャレット非表示 |
| フォント | アプリ同梱の Noto Sans JP Variable、通常体の weight 軸 |
| データ | MSW の初期データ、読み込み後に撮影 |
| 比較 | ページ全体、差分ピクセル数は最大 20、色差閾値は Playwright 既定 |
| 保存先 | `tests/screenshots/linux/{desktop,mobile}/` |

許容値は画面の大きさに関係なく 20 ピクセルです。
最小の 390 x 844 の画面でも、全体の約 0.0061% が上限です。
Linux のアーキテクチャ間で生じ得る微小差に備えます。
OS 間の描画差を吸収するために許容を広げる運用はしません。

通常実行は基準画像を作成・更新しません。
基準画像がない場合も失敗します。
時刻は Date の値だけを固定し、タイマーは動かしたままにします。

## ローカル実行

```sh
pnpm exec playwright install chromium
pnpm test:e2e:standalone
```

VRT の比較と基準画像の更新は GitHub Actions の Linux 環境で行います。
macOS の基準画像とローカルの画像生成スクリプトは管理しません。
`pnpm test:vrt` と `pnpm test:vrt:update` は CI 内で使います。
Linux 以外で VRT を起動すると、環境を案内するエラーで終了します。

## 基準画像の更新

通常の push・pull request の CI は、コミット済みの Linux 画像と比較します。
基準画像の作成・更新はしません。
表示変更が意図したものか、失敗レポートの差分画像を確認してください。

更新には `CI and Deploy` ワークフローの手動起動を使います。
手動起動では基準画像の更新ジョブだけを実行します。
通常のチェックとデプロイは実行しません。
ワークフローの定義がデフォルトブランチへ入った後に利用できます。

1. 画像を更新する変更を push し、Actions の `Run workflow` で対象ブランチを選びます。
2. 成功した run の `vrt-baselines-<commit SHA>` artifact をダウンロードします。
3. `source-commit.txt` と手元の HEAD が一致することを確認します。
4. `tests/screenshots/linux/` を artifact の画像一式で置き換えます。
5. 画像の差分をレビューし、意図した画像だけを UI 変更と一緒にコミットします。
6. push 後の通常 CI で、更新オプションなしの比較が成功することを確認します。

CLI で起動・取得する場合は、次のように実行します。
`<branch>` と `<run-id>` は対象ブランチと手動起動した run の値に置き換えます。

```sh
gh workflow run ci.yml --ref <branch>
gh run watch <run-id>
baseline_dir=$(mktemp -d)
gh run download <run-id> --name "vrt-baselines-$(git rev-parse HEAD)" --dir "$baseline_dir"
```

次のブロックは、生成元のコミットが一致するときだけ画像を置き換えます。
画像一式を置き換えるため、不要になった画面の基準画像も削除されます。

```sh
if [ "$(cat "$baseline_dir/source-commit.txt")" = "$(git rev-parse HEAD)" ]; then
  rm -rf tests/screenshots/linux
  tar -xzf "$baseline_dir/vrt-baselines.tar.gz"
else
  echo '生成元のコミットと HEAD が一致しません。' >&2
fi
```

更新ジョブは同じ Linux イメージで画像を生成し、更新なしの再比較も行います。
成功した画像一式と生成元のコミット SHA を artifact に 7 日間保存します。
ブランチには自動コミットしません。
失敗した場合は `vrt-update-report` artifact を確認してください。
通常 CI の失敗レポートは `browser-test-report` artifact にあります。
HTML レポートは展開後に `pnpm exec playwright show-report <展開先>/playwright-report` で開けます。

画像を Git にコミットする前に、人が表示変更をレビューします。
このため artifact で返し、CI の権限は `contents: read` に留めています。
Playwright を更新したら、CI のコンテナイメージも同じバージョンに揃えてください。
同じ手動ジョブで基準画像を更新してください。

生成と比較を同じ環境で行う方針は、[Playwright の画像比較ガイド](https://playwright.dev/docs/test-snapshots) に従っています。
コンテナのバージョン固定は、[Playwright のコンテナガイド](https://playwright.dev/docs/docker) に従っています。
手動起動の条件は、[GitHub Actions のガイド](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow) を参照してください。
