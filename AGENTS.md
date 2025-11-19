# AGENTS.md – Coding Agent Guidelines (for CodeSpark)

このドキュメントは **Codex などの自動コーディングエージェント向けの作業規約**です。
人間開発者向けの情報は `./README.md` を参照してください。

---

# 1. プロジェクト構成とモジュール配置

CodeSpark は以下の技術で構成されています：

* **フロントエンド**：Vite + React（`./src/`）
* **デスクトップシェル**：Tauri + Rust（`./src-tauri/`）

ディレクトリ配置ルール：

* UI ロジック、状態管理、スタイル：`src/`

  * エントリ：`main.tsx`, `App.tsx`, `App.css`
  * 将来的なコンポーネント：`src/components/`
* 静的アセット：`public/`
* 機能別の画像や JSON：`src/assets/<feature>/`
* Tauri コマンド：`src-tauri/src/main.rs`
* 権限・バンドル設定：`src-tauri/tauri.conf.json`, `src-tauri/capabilities/`

**注意（重要）**
`src-tauri/capabilities/*.json` は破壊的変更が反映されます。
Codex は **変更前に必ずその意図を説明し、ユーザー承認を得ること**。

---

# 2. エージェントの行動優先順位（最重要）

エージェントは以下の順に優先して判断してください：

1. **安全性・セキュリティの確保**

   * 機密情報の生成・埋め込み禁止
   * OS API の安易な利用禁止
   * ファイル操作を行う変更は必ずユーザーに確認する

2. **既存仕様・設計・コードスタイルの尊重**

   * 新規ライブラリ・依存関係の追加は禁止（提案のみ）

3. **最小限・局所的な変更**

   * 1 PR = 1 目的
   * 不要なリファクタリングを混ぜない

4. **読みやすいコードとドキュメント更新**

   * 仕様変更・ファイル追加があれば必ず関連ドキュメントを更新

---

# 3. ビルド・テスト・開発コマンド

```
npm install              # Node 依存のインストール
npm run dev             # Vite 開発サーバー
npm run tauri dev       # Tauri シェル + UI 開発
npm run build           # tsc チェック + Vite 本番ビルド
npm run preview         # dist/ のプレビュー配信
npm run tauri build     # デスクトップアプリパッケージ生成

cargo test              # Rust テスト
```

Codex は **これ以外のコマンドを提案・実行しない**。

---

# 4. コーディングスタイルと命名規則

## TypeScript

* インデント：2 スペース
* セミコロン：省略
* 文字列：単一引用符 `' '`
* コンポーネント：PascalCase
* フック：`useXxx`
* スタイル：CSS 変数または CSS Modules を推奨
* インラインスタイルは暫定利用のみにする

## Rust

* 命名：`snake_case`
* JS から呼ぶ API（Tauri commands）は camelCase へ変換
* モジュール配置：`src-tauri/src/*` に機能別で整理

**禁止**：Codex が独断で `package.json` や `Cargo.toml` に依存を追加すること。

---

# 5. テスト指針

**現状テストは未導入 → 今後追加する方針**。

推奨：

### フロントエンド

* Vitest + React Testing Library
* テストファイル：同居形式（例：`App.test.tsx`）

### Rust / Tauri

* `src-tauri/src/lib.rs` に単体テスト
* 実行：`cargo test`

テスト追加ルール：

* 新機能追加 → 必ずテストも同時に作成
* 既存機能変更 → 該当テストを適宜更新
* 主要シナリオ（検索、フィルタ、クリップボード、権限チェック）は必ずテスト化する

---

# 6. コミット・Pull Request のルール

### 🔧 Git 運用ルール（重要）

Codex は Git 操作をする際、以下のルールに必ず従うこと：

* **`git pull` を実行する場合は、必ず事前に `main` ブランチへ移動すること。**

  ```bash
  git switch main
  git pull
  ```

  他のブランチで `git pull` を行うと、不要なマージコミットや競合が発生するため禁止。

* 機能追加や修正作業は **新しいブランチを main から切って** 行うこと。

  ```bash
  git switch main
  git pull
  git switch -c feature/<name>
  ```

* ローカルの変更が未コミットの状態で `git pull` を実行しない。
  必要であれば `git stash` を利用する。

* `git push --force` は禁止。
  ただしユーザーから明示的に指示があった場合のみ例外的に使用する。

* 新しい作業ブランチを切る前に `git branch -r` 等でリモートブランチを確認し、すでにリモートから削除されたブランチがあればローカルでも `git branch -d` などで削除してリポジトリを整理する。

### コミット

* Conventional Commits 推奨：

  * `feat: add clipboard guard`
  * `fix: correct filter logic`

### Pull Request

必ず以下を含める：

1. 概要（何を、なぜ）
2. 影響範囲（UI / Tauri / config / API）
3. 関連 Issue（`Closes #xx`）
4. UI 変更 → スクリーンショット or 動画
5. Rust 変更 → JS 側の動作確認手順
6. ビルド結果 (`npm run build`, `cargo test`) の通過確認
7. 必要なら QA 手順

追加ルール：

* PR のタイトル・概要・本文は原則として日本語で記載する（レビュー状況共有を滑らかにするため）

**禁止**：

* PR を勝手にマージ
* 1 PR に複数の目的を混ぜる
* コード変更だけしてドキュメント更新を忘れる

---

# 7. セキュリティと設定ルール

* API キー・機密情報は必ず `.env` または Tauri の secure API 経由で読み込む
* `capabilities/` の権限は最小限に維持する
* ファイルシステムアクセスは慎重に扱う
* クリップボード操作など OS API に触れる場合は PR で明示する

---

# 8. Codex の具体的な振る舞いルール

Codex は次に従う：

1. **最初に読むファイル**

   * `./README.md`
   * `./docs/require.md`
   * `./docs/design.md`

2. 追加情報は以下から補完：

   * `./docs/tasks.md`
   * `./docs/*.md`

3. 出力は自然で読みやすい日本語で書く

4. 造語禁止

5. 不自然な翻訳禁止（必要なら英単語をそのまま使う）

6. 省略禁止（この AGENTS.md 単体で理解できるように）

7. ドキュメントや設定に影響がある変更を行った場合は、**必ず関連する md ファイルも更新する**

---

# 9. AGENTS.md の更新ルール

* 設計変更・依存追加・ディレクトリ構造変更があった場合、**必ず本ファイルも更新すること**
* Codex が構造や仕様の変更を検出した場合、PR で更新提案を行うこと
