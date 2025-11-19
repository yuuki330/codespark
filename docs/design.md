# 設計メモ

## 1. 全体像
CodeSpark はクリーンアーキテクチャ志向で、`src/core/` にドメイン・ユースケース・データアクセス・プラットフォーム層を集約している。React UI (`App.tsx` + `src/components/`) はユースケースを呼び出す薄いプレゼンタ、Tauri (`src-tauri/`) はクリップボードとファイルシステムのゲートウェイを担当する。

```
React UI ──▶ UseCases ──▶ Domain ＋ Ports ◀── Data Access / Platform ──▶ Tauri Commands
```

- 依存方向は **外側から内側へ一方向**。Ports は Domain モジュールが公開する「境界インターフェース」であり、実装（Data Access / Platform）がこれに依存して実装される
- Domain は Ports の実装に依存しない（Clean Architecture の“内側が外側を知らない”ルールを維持）
- Rust コマンドは @tauri-apps/api を介して呼び出す

## 2. レイヤー別詳細
### 2.1 Domain (`src/core/domain/snippet`)
- `entities`: Snippet / SnippetLibrary / UserPreferences などを定義
- `domain-values`: SnippetId / LibraryId / TagName の型エイリアス
- `converters`: `constructSnippet`, `applySnippetUpdate`。バリデーションや ReadOnly 例外を管理
- `errors`: SnippetValidationError, SnippetNotFoundError, ClipboardCopyError, ReadOnlyLibraryViolationError
- `ports`: Domain が公開する境界インターフェース（`SnippetDataAccessAdapter` / `SnippetLibraryDataAccessAdapter` / `ClipboardGateway`）。外側の層はこれに依存して実装される

### 2.2 UseCases (`src/core/usecases/snippet`)
- `SearchSnippetsUseCase`: スコアリング + 空クエリ委譲
- `GetTopSnippetsForEmptyQueryUseCase`: お気に入り/最近利用のソート
- `CopySnippetUseCase`: クリップボード呼出 + 履歴更新
- `CreateSnippetUseCase`: ID 生成 → バリデーション → Gateway 保存
- `UpdateSnippetUseCase`: ReadOnly 判定後に `applySnippetUpdate`
- `DeleteSnippetUseCase`: ReadOnly 判定後に削除
- すべて Vitest でカバーし、`App.tsx` では `useMemo` で生成

### 2.3 Data Access (`src/core/data-access/snippet`)
- `InMemorySnippetDataAccessAdapter`: プロトタイプ用。`getLibraries` も提供
- `FileSnippetDataAccessAdapter`: Tauri Command (`read/write_snippet_store` など) で JSON を読む/書く。ReadOnly ライブラリを検証し、ISO 文字列のシリアライズを行う
- どちらも Port を実装し、UI 側で切り替え可能な構造（現状は InMemory を利用）

### 2.4 Platform (`src/core/platform/clipboard`)
- `TauriClipboardGateway`: `copy_snippet_to_clipboard` を呼び出し、OS ごとのネイティブコマンドへ委譲

### 2.5 UI (`src/App.tsx`, `src/components/`)
- パネル構成: 検索バー / フィルタ / スニペットリスト / 作成フォーム / 編集パネル / 通知
- キーボード操作: `Enter` でコピー、`↑↓` と `⌘J,K` で移動、`⌘1` で全ライブラリ、`⌘2` 以降で順次切替
- `SnippetForm` / `SnippetEditor` は共通フォーム値型を利用し、成功/失敗を `NotificationCenter` へ通知
- `SnippetActionPalette` は Cmd+Enter（Ctrl+Enter）で呼び出され、選択中スニペットに対する編集・削除アクションをキーボード操作で実行できる。アクションは配列定義で拡張可能、Esc でクローズしオーバーレイクリックでも閉じる

## 3. データフロー
1. `App.tsx` 起動時に `InMemorySnippetDataAccessAdapter` を生成し、初期スニペットをロード
2. `SearchInput` 変更で `SearchSnippetsUseCase.execute` を呼ぶ → 絞り込み結果を表示
3. コピー操作は `CopySnippetUseCase` → `ClipboardGateway` → Tauri コマンド → OS コマンドの順
4. CRUD 操作は `Create/Update/DeleteSnippetUseCase` → Gateway。完了後に `refreshSnippets` で最新データを取得
5. 通知は `NotificationCenter` で管理し、一定時間で自動消滅

## 4. Tauri 側の構成
- `copy_snippet_to_clipboard`: macOS は `pbcopy`、Windows は `clip`。Linux は `wl-copy` / `xclip` / `xsel` を順に試行
- `read_snippet_store` / `write_snippet_store` / `snippet_store_exists` / `ensure_snippet_store_dir`: JSON ファイルの読み書きと初期化
- permissions (`src-tauri/permissions/*.json`) でコマンドを定義し、`capabilities/default.json` で main ウィンドウに付与
- `tauri.conf.json` で allowlist ではなく capability ベースの構成を採用

## 5. テスト戦略
- Vitest + RTL を採用。`vitest.config.ts` で jsdom + setup スクリプトを有効化
- `App.test.tsx`: 作成・編集・削除の UI フローを検証
- `SnippetForm.test.tsx`: 入力フォームの単体チェック
- ユースケースごとの `.test.ts` でドメインルールを確認
- Rust 側はまだテスト未整備（`cargo test` の枠のみ）

## 6. 今後の設計タスク
1. File アダプタを UI に接続し、アプリ間で共有できる JSON ストアを使う
2. `GetAllLibrariesUseCase` / `SwitchActiveLibraryUseCase` を用意し、Preferences へ保存するフローを設計
3. Create 時にも ReadOnly ライブラリを防ぐためのガードを導入
4. ライブラリ別エクスポート / インポート設計と Git 連携案のドキュメント化
5. macOS / Windows 各 OS でのビルド、コード署名、QA 手順を定義
6. スラッシュコマンド遷移やタグ複合フィルタなど、残りのキーボードショートカット要件をユースケースとして整理し UI へ反映（Cmd+Enter アクションパレットは実装済）

この設計メモは README / 要件 / タスクと連携し、変更があれば都度更新する。
