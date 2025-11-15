# Repository Guidelines

## プロジェクト構成とモジュール配置
CodeSpark は Vite + React のフロントエンドと Rust 製の Tauri シェルで構成されます。UI ロジックとスタイルは `src/` 配下（`main.tsx`、`App.tsx`、`App.css`、および将来の `components/` ディレクトリ）に置き、静的アセットは `public/` へ配置します。デスクトップ固有コードは `src-tauri/` 内にあり、`src/main.rs` でコマンドを公開し、`tauri.conf.json` と `capabilities/` で権限やバンドル設定を管理します。機能別の画像や JSON は `src/assets/<feature>/` にまとめ、相対インポートを短く保ってください。

## ビルド・テスト・開発コマンド
- `npm install` : Node 依存と Tauri CLI を同期します。
- `npm run dev` : Vite 開発サーバーで React UI をホットリロードします。
- `npm run tauri dev` : Vite サーバーを再利用しつつ Tauri シェルを起動し、OS API を確認します。
- `npm run build` : `tsc` で型チェック後、`dist/` に最適化バンドルを出力します。
- `npm run preview` : 生成済み `dist/` をローカルで配信し、本番挙動を確認します。
- `npm run tauri build` : `src-tauri/tauri.conf.json` に基づき署名つきデスクトップパッケージを生成します。

## コーディングスタイルと命名規則
TypeScript は 2 スペースインデント、セミコロン省略、単一引用符を推奨します。React コンポーネントは PascalCase (`SnippetList`) 、フックは `use` から始め、小さな UI 断片は `src/components/` に分離してください。共有色や余白は CSS 変数またはモジュール CSS へ逃がし、インラインスタイルは一時的な実験に留めます。Rust 側は `snake_case` ファイル／関数名を守り、JS から呼び出すフロント API では camelCase に変換します。

## テスト指針
現状テストは未導入のため、UI には Vitest + React Testing Library を同居ファイル形式（`App.test.tsx`）で追加してください。Tauri コマンドは `src-tauri/src/lib.rs` に単体テストを書き、`cargo test` で検証します。検索フィルタリング、クリップボード失敗ハンドリング、権限チェックなど主要シナリオをカバーし、再現手順を README へ記しておくとレビューが容易です。

## コミットとプルリクエスト
コミットメッセージは Conventional Commits (`feat: add clipboard guard` など) を参考にし、意図と影響範囲を一読で把握できるようにします。PR 説明には変更概要、影響するコマンド、関連 Issue、UI 変更時のスクリーンショット／動画、Tauri 設定差分を添付してください。ローカルで `npm run build` と必要な `cargo test` を通し、必要なら手動検証結果をチェックリスト化します。

## セキュリティと設定のヒント
API キーや機密 URL は `.env` または Tauri の環境読み込み機構に限定し、リポジトリへコミットしないでください。`src-tauri/capabilities/*.json` で不要な権限を無効化し、macOS 公証向けに最小権限を維持しましょう。クリップボードやファイルシステムへ触れる処理にはユーザー通知や明示的なトリガーを設け、レビュー時には該当パスを PR 説明で強調してください。

## このプロジェクトでのCodexの振る舞い
- まず最初に @README.md と @docs/require.md 、@docs/design.md を読み、要件・制約・ビルド・設計方法を把握する。
- 以降のタスクは、上記3ファイルの内容を前提に計画・実行する。
- 足りない情報があれば、関連ドキュメント(@docs/tasks.md 等)を参照して補完する。
- 出力は日本語で簡潔に。
- GitHub の Pull Request 説明・タイトルは必ず日本語で記載する。
- Issue を解決する PR を作成する場合は、PR 本文に該当 Issue を参照（`Closes #<number>` など）として必ず記載する。
- PR を勝手にマージせず、必ずユーザーの確認や明示的な指示を得てから取り込む。
- レポートは自然な日本語で行うこと。
- 造語禁止。**必ず一般的な技術用語、広く使われる日本語を使うこと**。
- 不自然な翻訳禁止。**必ず一般的な日本語翻訳を行い、不自然な日本語になりそうな場合は元の英単語を使うこと**。
- 省略禁止。**必ずこのレポート単体で理解できるようにすること**。
- 機能・要件の変更やコードの追加・修正を行った場合は、関連ドキュメントおよび README.md を必ず更新する。
