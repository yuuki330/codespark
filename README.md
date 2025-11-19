# CodeSpark

## 1. プロジェクト概要
CodeSpark はローカルに保存したスニペットを検索・コピーできるデスクトップランチャーです。フロントエンドは Vite + React、デスクトップシェルは Tauri で構築しており、macOS / Windows で共通 UX を提供することを目指しています。本リポジトリは現在 **React プロトタイプ + Tauri ブリッジ** の状態で、次の目的で利用できます。

- キーボード中心の検索体験（Raycast ライク）を検証する
- スニペット CRUD ユースケースとドメインモデルの API を確立する
- クリップボードやローカル JSON 永続化など Tauri 側の最小権限セットを用意する

## 2. 現在の実装状況
| 領域 | 実装内容 |
| --- | --- |
| UI | 検索バーと結果リストのみのコマンドパレット風ビューを基軸に、`Enter` / `↑↓` / `⌘J,K` で候補操作、`⌘Enter`（Ctrl+Enter）でアクションパレットを開く。`/create` `/list` `/settings` のスラッシュコマンドで専用ビューへ即時遷移し、一覧ではライブラリ/タグフィルタ、設定ではアクションショートカットと保存フォルダパスを編集できる。左上の矢印または ESC で検索ビューへ戻れる。 |
| ドメイン | `src/core/domain/snippet` に Snippet / Library / Preferences などの型、`constructSnippet`・`applySnippetUpdate`、バリデーションエラー、ReadOnly 例外を集約。 |
| ユースケース | 検索・空クエリサジェスト・コピー・作成・更新・削除を個別クラスで実装し、`App.tsx` から依存注入。使用履歴とライブラリ保護を含むテストを `src/core/usecases/snippet/*.test.ts` に用意。 |
| データアクセス | Tauri 実行時は `FileSnippetDataAccessAdapter` を介して `codespark/snippets.json` へ永続化する。ブラウザ開発や Vitest では `InMemorySnippetDataAccessAdapter` を自動利用。`VITE_USE_IN_MEMORY_SNIPPETS=true` で明示的に切り替え可能。 |
| Preferences | `LocalStorageUserPreferencesGateway` がアクティブライブラリ・テーマを保存し、`GetActiveLibraryUseCase` / `SwitchActiveLibraryUseCase` で UI と同期。 |
| プラットフォーム | `TauriClipboardGateway` が `copy_snippet_to_clipboard` コマンドを呼び出し、Rust 側で OS ごとのコマンドを実行。 |
| Rust / Tauri | `src-tauri/src/lib.rs` に clipboard + JSON ストア操作コマンド、`src-tauri/permissions/*.json` にコマンドごとの権限を明示。capability `default` でウィンドウへ付与。 |
| テスト | React UI（`App.test.tsx`）、`SnippetForm`、各ユースケースのユニットテストを Vitest + RTL で実行。`src/test/setup.ts` で共通セットアップ。 |

## 3. 未実装または今後の課題
- ⌘Enter でのアクションパレット強化（今後は新規アクションの追加）
- Tauri ダイアログによるフォルダ選択結果を即時適用した後の追加 QA（権限確認や OS ごとの差分）
- ライブラリ別エクスポート / インポート、Git 連携、Preferences など拡張要件の具体化
- `docs/tasks.md` に残っている残件（高度なフィルタリング、ReadOnly ライブラリに対する Create の保護など）を順次解消

## 4. ディレクトリ構成
| パス | 役割 |
| --- | --- |
| `src/App.tsx` | React プロトタイプ本体。ユースケース呼び出しと UI の調停を担当。 |
| `src/components/` | 検索バー、スニペット一覧、通知、フォーム等のプレゼンテーションコンポーネント。 |
| `src/core/domain/` | ドメインモデル（エンティティ、値オブジェクト、エラー、ポート）。`snippet/README.md` にモジュール構成を記載。 |
| `src/core/usecases/` | Snippet 関連ユースケースの実装とテスト。 |
| `src/core/data-access/` | InMemory / File の各アダプタ。 |
| `src/core/platform/` | Clipboard など OS API へのゲートウェイ。 |
| `src-tauri/` | Rust 側コード、権限設定、バンドル設定。 |
| `docs/` | 要件・設計・タスクリスト。 |

## 5. 開発コマンド
| コマンド | 説明 |
| --- | --- |
| `npm install` | 依存パッケージのセットアップ。 |
| `npm run dev` | Vite の開発サーバー。UI 単体の動作確認に利用。 |
| `npm run tauri dev` | Tauri + React を同時に起動し、ネイティブ API を含めた挙動を確認。 |
| `npm run build` | TypeScript チェック + Vite 本番ビルド。Tauri ビルド前提。 |
| `npm run preview` | `dist/` をホストしてビルド成果物を確認。 |
| `npm run tauri build` | デスクトップアプリのバンドル生成。 |
| `npm run test` | Vitest によるユニット / コンポーネントテスト。 |
| `cargo test` | Rust 側にテストが追加された際の実行コマンド（現状テスト未定義）。 |

## 6. ビルド / 配布

- 共通コマンドは `npm run tauri build`。Tauri CLI が `npm run build` を自動実行してから各 OS 向けバンドルを生成する
- macOS 15.6.1 (arm64) + Node v24.10.0 + rustc 1.91.1 でビルド済。成果物は `src-tauri/target/release/bundle/macos/codespark.app` と `bundle/dmg/codespark_0.1.0_aarch64.dmg`
- Windows では Visual Studio Build Tools + WebView2 + `x86_64-pc-windows-msvc` ツールチェーンを事前に用意し、同じコマンドで MSI/NSIS インストーラを生成する
- 詳細手順と QA チェックリストは [`docs/build.md`](docs/build.md) を参照

## 7. Tauri コマンドと権限
- `copy_snippet_to_clipboard`: `pbcopy` / `clip` など OS コマンドを叩いてクリップボードへ書き込む
- `read_snippet_store`, `write_snippet_store`, `snippet_store_exists`, `ensure_snippet_store_dir`: JSON ストレージ用の読み書き API
- `src-tauri/permissions/*.json` で上記コマンドごとに permission identifier を定義し、`src-tauri/capabilities/default.json` から付与

## 8. ドキュメント
- `docs/require.md`: ドメイン要件とステータス
- `docs/design.md`: アーキテクチャとレイヤー間の責務
- `docs/tasks.md`: 実装済み/未実装タスク一覧（優先度付き）

## 9. 貢献の流れ
1. `README.md` と `docs/*.md` を読み、既存仕様を把握
2. 変更は 1 トピック 1 PR を徹底し、必要なら issue を紐付ける
3. コード変更に伴う仕様変更は必ず関連ドキュメントにも反映
4. クリップボードやファイル権限など OS 依存機能を触る場合は、意図を共有してから作業

## 10. ストレージ設定メモ
- Tauri で実行している場合は自動的にファイルストレージ（`appData/codespark/snippets.json`）を利用する
- `npm run dev` などブラウザのみで起動する場合や Vitest 実行時は InMemory ストアへフォールバックする
- `.env.local` 等で `VITE_USE_IN_MEMORY_SNIPPETS=true` を設定すると、Tauri 実行時でも InMemory モードを強制できる
- 初回起動でスニペットが存在しない場合は、プロトタイプ用のサンプル 3 件が JSON にシードされる
- ライブラリ選択は `localStorage` に保存され、次回起動時に自動復元される（All 選択時は `null` を保存）
- `/settings` で変更したショートカットや保存フォルダの設定は Tauri 実行時に `codespark/preferences.json` へ保存され、ブラウザ/テスト実行時は `localStorage` に保存される
