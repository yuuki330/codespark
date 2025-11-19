# 要件整理

## 0. ステータス概要
| 領域 | 状態 | 備考 |
| --- | --- | --- |
| ドメインモデル | ✅ 実装済 | Snippet / Library / Tag / Preferences 型、`constructSnippet`、バリデーション、ReadOnly 例外を `src/core/domain/snippet` に集約。 |
| CRUD ユースケース | ✅ 実装済 | 検索、空クエリサジェスト、コピー、作成、更新、削除が `src/core/usecases/snippet` に揃い、Vitest テスト付き。 |
| UI 主要機能 | ✅ 実装済（一部課題あり） | 検索バー、フィルタ、リスト、フォーム、通知、ショートカットを `App.tsx` + `src/components/` で提供。今後は検索ビューの簡素化やスラッシュコマンド導線を追加。 |
| データ永続化 | ⚠️ プロトタイプ | In-memory 実装で動作。Tauri 経由の JSON アダプタは完成済だが UI 未接続。 |
| ライブラリ＆Preferences 拡張 | ⏳ 未着手 | `GetAllLibrariesUseCase` `SwitchActiveLibraryUseCase`、UserPreferences の保存・読込などは今後対応。 |
| ドキュメント | ✅ 更新済 | README / 設計 / タスクに最新状況を反映。 |

## 1. 背景とスコープ
CodeSpark はローカルに保存したスニペットを高速検索・コピーできるランチャーであり、キーボード中心の操作体験を最優先とする。macOS / Windows を対象とし、Linux はベストエフォートでサポートする。ドキュメントは実装技術に依存しない形で要件を整理しつつ、現状の達成度を明示する。

## 2. エンティティ要件
### 2.1 Snippet（✅ 実装済）
- 定義: `src/core/domain/snippet/entities/index.ts`
- 必須フィールド: `id`, `title`, `body`, `libraryId`, `createdAt`, `updatedAt`
- 任意フィールド: `shortcut`, `description`, `tags`, `language`, `isFavorite`, `usageCount`, `lastUsedAt`
- バリデーション: `constructSnippet` が `title/body` 非空、タグ重複禁止、`updatedAt >= createdAt` を検証

### 2.2 Tag（✅ 実装済）
- 文字列エイリアス `TagName` として管理。タグ重複チェックは `constructSnippet` で実施。

### 2.3 LibraryCategory / SnippetLibrary（✅ 実装済）
- `LibraryCategory = "PERSONAL" | "TEAM" | "PROJECT"`
- `SnippetLibrary` には `isReadOnly` を含み、Team ライブラリを保護
- In-memory / File アダプタの既定ライブラリとして Personal/Team を定義

### 2.4 UserPreferences（ⓘ 型のみ）
- `defaultLibraryId`, `theme`, `globalShortcut` を保持する型を定義済
- 具体的な保存・読込処理や UI 連携は未着手

## 3. ユースケース要件
| UC | 状態 | 実装/備考 |
| --- | --- | --- |
| UC-01 検索してコピー | ✅ | `SearchSnippetsUseCase` + `CopySnippetUseCase`。ショートカット完全一致・前方一致・タグ・本文・お気に入り・Usage/Recency 正規化でスコアリング。Vitest カバレッジあり。 |
| UC-02 新規登録 | ✅ | `CreateSnippetUseCase`。`constructSnippet` でバリデーションの後、Gateway に保存。 |
| UC-03 編集 | ✅ | `UpdateSnippetUseCase`。ReadOnly ライブラリ判定、`applySnippetUpdate` により差分反映。 |
| UC-04 削除 | ✅ | `DeleteSnippetUseCase`。ライブラリ保護を通過した場合のみ削除。 |
| UC-05 絞り込み | ✅ | ライブラリ / タグ条件を `filterSnippetsByConditions` で処理し、UI のフィルタと同期。 |
| UC-06 最近使った表示 | ✅ | `GetTopSnippetsForEmptyQueryUseCase` が空クエリ時の候補を返却。 |
| UC-07 ライブラリ切替/管理 | ⏳ | UIから `FilterChip` 経由で切替できるが、`GetAllLibrariesUseCase` / `SwitchActiveLibraryUseCase` は未実装。Preferences 連携も未着手。 |
| 補助 UC（Copy 時の履歴更新など） | ✅ | Copy ユースケースが `usageCount` / `lastUsedAt` を更新。 |

## 4. ライブラリ運用要件
- Personal: ローカル書き込み可能。既定ライブラリ
- Team: 既定で ReadOnly。`Update/Delete` はブロック。Create 時のバリデーションは今後追加予定
- UI では `All/Personal/Team` をワンクリック + `⌘1`〜`⌘3` で切替

## 5. Raycast ライクな体験要件（実装状況）
- 起動時フォーカス: ✅ `SearchInput` へ `useEffect` でフォーカス
- サジェスト: ✅ 空クエリ時にお気に入り + 最近利用を提示
- キーボード操作: ✅ `Enter` でコピー、`↑↓` / `⌘J,K` で選択移動、`⌘Enter`（Ctrl+Enter）でアクションパレットを開き編集または削除を選択できる
- スラッシュコマンド: ✅ `/create`, `/list`, `/settings` の入力で専用ビューへ遷移し、戻る矢印ボタンと ESC キーで検索ビューへ戻れる
- 拡張アクション: ✅ Cmd+Enter で「編集 or 削除」を選択するダイアログを実装済。選択行の自動スクロールは今後の対応

- シンプルビュー: 検索画面はコマンドパレット風 UI とし、画面の縁やヘッダーを無くして検索バー＋結果リストのみ表示。フィルタやフォームは専用ルート（`/list` `/create` `/settings`）に移動
- `/create``/list``/settings` などのスラッシュコマンドで即時遷移し、左上の戻る矢印ボタンまたは ESC キーで検索画面へ戻る
- Cmd+Enter は「編集に移動」「削除を実行」など複数アクションを提示するダイアログを呼び出す。アクション定義は配列で管理しており、将来的に他アクションを追加できるよう設計する
- `/list` 画面ではライブラリ/タグフィルタを可視化し、検索ビューではフィルタを非表示にする
- 設定画面（フル画面）はショートカット（Cmd/Ctrl＋任意キー）と保存フォルダパスを編集可能。Tauri 実行時はネイティブダイアログでフォルダを選択でき、結果は JSON ストア (`codespark/preferences.json`) に保存される。ブラウザ/テスト時は localStorage を利用
- 自動スクロール: `↑↓` や `Cmd+J/K` で選択を動かしたとき、リストの外に出ないよう最小限スクロールする

## 7. 今後のフォローアップ
1. File アダプタの UI 統合とストアマイグレーション仕様
2. Preferences / ライブラリ切替ユースケースの設計
3. エクスポート / インポート、Git 連携の設計メモ化
4. macOS / Windows ビルド手順 + QA チェックリスト策定
5. 追加ショートカット（例: グローバル検索起動）や設定項目の永続化パターン追加

最新のタスク進捗は `docs/tasks.md` を参照。優先度 P0 から順に着手する。
