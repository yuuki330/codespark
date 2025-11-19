# タスクリスト

## ドメイン層
- [x] [P0] `src/core/domain/snippet/` を作成し、エンティティ・値オブジェクト・ユーティリティを集約するインデックスファイルを置く。
- [x] [P0] `Snippet` 型を docs/design.md の定義どおり実装し、`shortcut` / `usageCount` / `lastUsedAt` など UI 要件をすべて含める。
- [x] [P1] `SnippetId` / `LibraryId` / `TagName` の型エイリアスを整理し、ユースケース側からインポートしやすくする。
- [x] [P0] `constructSnippet` 関数を用意し、`title` / `body` 非空、`tags` 重複禁止、`updatedAt >= createdAt` などドメインルールをバリデーションする。
- [x] [P0] `applySnippetUpdate` 関数を実装し、partial 更新値を受けて差分マージと再バリデーションを行う。
- [x] [P1] バリデーションエラーや ReadOnly ライブラリ違反を表すドメイン専用エラー型を定義する。
- [x] [P1] `SnippetLibrary` と `LibraryCategory` 型を実装し、`isReadOnly` や `category` を含む構造にする。
- [x] [P2] `UserPreferences`（拡張枠）の型を定義し、`defaultLibraryId` や `theme` など将来的に参照するフィールドを用意する（永続化は未実装）。

## データアクセスアダプタ層
- [x] [P0] `SnippetDataAccessAdapter` インターフェースを `getAll` / `getById` / `save` / `delete` で定義し、ドメイン型のみを参照するようにする。
- [x] [P1] `SnippetLibraryDataAccessAdapter`（または同等の取得 API）を定義し、Personal/Team のライブラリメタデータを取得できるようにする。
- [x] [P0] JSON ベース永続化を前提にした `FileSnippetDataAccessAdapter` の骨組みを作る（読み書き・ID 生成・日時シリアライズ方針を含める）。
- [x] [P1] Team ライブラリを `isReadOnly` として扱い、書き込み系 API で保護する仕組みを実装する。
- [ ] [P2] 将来の Git / Remote 接続を見据えて、DI で差し替え可能なファクトリ関数を設計する。
- [ ] [P1] ストレージのファイルレイアウト（保存先パス、JSON スキーマ）を docs/ かコメントで説明し、移行時の参考にする（現状 README/設計に概要のみ記載）。
- [x] [P0] UI から `FileSnippetDataAccessAdapter` を利用できるようにし、Tauri 実行時は JSON ストア、ブラウザ/テスト時は InMemory を自動切り替え（`VITE_USE_IN_MEMORY_SNIPPETS` で手動切替）できるようにする。

## ユースケース
- [x] [P0] `SearchSnippetsUseCase` を実装し、クエリ・ライブラリ・タグ条件を受け、デザイン記載のスコアリングルールを網羅する。
- [x] [P1] `GetTopSnippetsForEmptyQueryUseCase` を作成し、空クエリ時にお気に入り＋最近利用スニペットを返す処理を切り出す。
- [x] [P0] `CopySnippetUseCase` を実装し、Snippet 取得→Tauri クリップボードコマンド呼び出し→`usageCount`/`lastUsedAt` 更新→保存までを直列化する。
- [x] [P0] `CreateSnippetUseCase` を実装し、入力 DTO→`constructSnippet`→保存→結果返却のフローを整備する。
- [x] [P0] `UpdateSnippetUseCase` で差分マージと `updatedAt` 更新、ReadOnly ライブラリチェックを行う（`applySnippetUpdate` を利用）。
- [x] [P0] `DeleteSnippetUseCase` で削除と UI 通知（例: 成功イベント）を提供する。
- [x] [P1] `GetAllLibrariesUseCase` を作成して Personal/Team の表示用データ（name/category/isReadOnly）を返す。
- [x] [P1] `SwitchActiveLibraryUseCase` を実装し、選択状態を Preferences に保存し、検索条件への反映をハンドリングする。

## UI / プレゼンテーション
- [x] [P1] `src/components/` を新設し、検索バー・スニペットリスト・ライブラリ切替・トーストコンポーネントを分離する。
- [x] [P0] `App.tsx` から検索・コピーのロジックをユースケース呼び出しに置き換え、フックで依存を注入する。
- [x] [P1] アプリ起動時に検索バーへ自動フォーカスする処理を追加する。
- [x] [P1] スニペット一覧で `Enter` コピー、`↑/↓` 選択移動、`⌘Enter` 追加アクション（エディタフォーカス）を実装する。
- [x] [P1] ライブラリ切替 UI（All/Personal/Team のボタンまたはショートカット `⌘1`〜`⌘3`）を追加し、`SwitchActiveLibraryUseCase` と連動させる。
- [x] [P1] 空クエリ時にお気に入り＋最近使用スニペットを表示するコンポーネントを実装し、検索結果との切り替えを滑らかにする。
- [x] [P1] コピー失敗や ReadOnly 書き込みエラーをユーザーへ通知する UI（トースト/バナー）を用意する。
- [ ] [P1] 検索ビューをコマンドパレット風に刷新し、ヘッダーやフォームを排除して検索バーと結果リストのみを表示する。
- [x] [P1] `Cmd+Enter` で「編集 / 削除（将来の追加アクションも想定）」を選択できるダイアログを実装し、キーボード操作だけで実行できるようにする。
- [ ] [P1] スラッシュコマンド（`/create`, `/list`, `/settings` など）で専用画面に遷移し、左上の戻る矢印ボタンと ESC キーで検索ビューへ戻れるようにする。
- [ ] [P1] `/list` 画面には従来のフィルタ UI を残し、通常検索ビューではフィルタを完全に非表示にする。
- [ ] [P1] リスト選択の移動（`↑↓`, `Cmd+J/K`）に合わせて自動スクロールし、選択行が常に表示範囲に入るようにする。
- [ ] [P1] 設定画面（フル画面）を追加し、ショートカットのカスタマイズと保存フォルダの変更（Tauri ネイティブダイアログ利用）を可能にする。設定データは JSON ストアにまとめて保存する。
- [ ] [P2] タグフィルタやライブラリフィルタを組み合わせられるコントロールを設置する（現状はタグの AND 条件のみ）。

## Tauri / ネイティブ連携
- [x] [P0] `src-tauri/src/main.rs` にクリップボードコピーコマンドを実装し、JS 側から `invoke` で呼び出せるようにする。
- [x] [P0] JSON/SQLite ストレージにアクセスする Tauri コマンドを実装し、`SnippetDataAccessAdapter` が透過的に利用できるようブリッジする（現状は JSON のみ）。
- [x] [P1] `src-tauri/capabilities/*.json` を更新し、クリップボード・ファイルアクセスなど必要最小限の権限に絞る。
- [x] [P1] `tauri.conf.json` の allowlist やバンドル設定を更新し、追加コマンドを登録する。
- [x] [P0] macOS と Windows 向けのビルド手順を整備し、両 OS で同一バイナリ機能を検証する（macOS は実機で確認済、Windows は docs/build.md に手順を記載）。

## データ永続化と同期
- [x] [P0] Personal/Team を同一ストレージ内で管理し、`libraryId` フィルタリングと `isReadOnly` フラグをデータアクセスアダプタ経由で提供する。
- [ ] [P2] ライブラリ別エクスポート/インポート関数の設計メモを残し、オンボーディングパック化の足掛かりにする。
- [ ] [P2] 将来の Git 連携やリモート同期を見据えたアダプタ追加手順（DI への登録方法、設定フラグ）を文書化する。

## テスト
- [x] [P0] Vitest + React Testing Library を導入し、`App.test.tsx` で基本 UI 挙動（検索・コピー・エラー表示）を確認する。
- [x] [P0] `SearchSnippetsUseCase` のスコアリングをユニットテストで網羅し、shortcut 完全一致やタグ一致など主要パターンを検証する。
- [x] [P1] `CopySnippetUseCase` の `usageCount`/`lastUsedAt` 更新ロジックとクリップボード失敗ハンドリングをテストする。
- [ ] [P1] ReadOnly ライブラリへの書き込み禁止が `Create/Update/Delete` ユースケースで正しく動作するかテストする（Update/Delete は実装済、Create も保護するテスト/実装が未完）。
- [ ] [P2] `GetTopSnippetsForEmptyQueryUseCase` がお気に入り＋最近使用の優先順を保証するテストを追加する。
- [ ] [P1] `src-tauri/src/lib.rs` などに単体テストを書き、ファイルアクセスコマンドや JSON パーサの基本ケースを検証する。

## ドキュメント
- [x] [P1] README にアーキテクチャレイヤ、ユースケース一覧、テスト実行コマンド (`npm run test`, `cargo test`) を追記する。
- [x] [P2] docs/design.md を更新し、実装差分（データアクセスアダプタや UI 構成）が変わった際に反映するルールを決める。
- [x] [P2] ストレージスキーマやライブラリ運用ルールの詳細ノートを docs/ に追加し、メンテナンス手順を共有する（require/design に反映済）。
- [ ] [P2] ライブラリ切替ショートカットや検索 UX を図解した資料（もしくは GIF 作成手順）を準備して、PR 時に添付できるようにする。
