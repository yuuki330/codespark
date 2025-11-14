# 設計メモ

## 1. 全体像
- フロントエンド: Vite + React + TypeScript。`App.tsx` から検索 UI を提供し、今後ユースケース層へロジックを移譲する。
- デスクトップシェル: Tauri (Rust)。`src-tauri/src/main.rs` が JS からのコマンドを受け、必要に応じてファイルアクセスやクリップボード操作を担当する。
- クリーンアーキテクチャ志向で、**ドメイン（エンティティ/ユースケース）** と **インターフェースアダプタ（データアクセスアダプタ実装・UI）** を分離する。
- Tauri のマルチプラットフォーム対応を活かし、macOS と Windows の両ビルドを同等優先でサポート（Linux はベストエフォート）。

## 2. ドメインモデル
### 2.1 Snippet
Raycast 寄りの操作感を支えるフィールドを含む。
```ts
export type Snippet = {
  id: string;
  title: string;
  body: string;
  shortcut?: string | null;
  description?: string | null;
  tags: string[];
  language?: string | null;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt?: Date | null;
  libraryId: string;        // Personal / Team など所属ライブラリ
  createdAt: Date;
  updatedAt: Date;
};
```
Validation で `title/body` 非空、`tags` 重複禁止、`updatedAt >= createdAt` を保証する。

### 2.2 SnippetLibrary / LibraryCategory
```ts
export type LibraryCategory = "PERSONAL" | "TEAM" | "PROJECT";

export type SnippetLibrary = {
  id: string;
  name: string;
  description?: string;
  isReadOnly: boolean;
  category: LibraryCategory;
};
```
MVP の UI スコープは `PERSONAL` / `TEAM` のみだが、`PROJECT` 等の追加カテゴリにも耐えられるよう設計しておく。

## 3. データアクセスアダプタ層
ユースケースからは抽象データアクセスアダプタインターフェースのみに依存する。
```ts
export interface SnippetDataAccessAdapter {
  getAll(): Promise<Snippet[]>;
  getById(id: string): Promise<Snippet | null>;
  save(snippet: Snippet): Promise<void>;
  delete(id: string): Promise<void>;
}
```
- File 実装: ローカル JSON / SQLite を監督。
- 将来の同期実装: Git リポジトリや社内 API など、取得元に応じたアダプタを追加可能。

## 4. ユースケース設計
### 4.1 SearchSnippetsUseCase
1. クエリと検索条件（ライブラリ、タグ）を受け取る。
2. `SnippetDataAccessAdapter.getAll()` / 条件付き取得で候補集合を得る。
3. 以下のスコアリングで `score` を計算し降順ソート:
   - `shortcut === query` : +100
   - `title` 前方一致 : +60、部分一致 : +30
   - `tags` 一致 : +20、`body` 一致 : +10
   - `isFavorite` : +15
   - `usageCount` 正規化、`lastUsedAt` が直近なら追加ボーナス
4. 上位 N 件を返却。空クエリ時はお気に入り＋最近利用結果を `GetTopSnippetsForEmptyQueryUseCase` に委譲。

### 4.2 CopySnippetUseCase
- Snippet ID を受け取り、データアクセスアダプタから取得。
- クリップボードコピーを Tauri 経由で実行。
- `usageCount++`, `lastUsedAt = now` を反映して保存。

### 4.3 CRUD 系
- `CreateSnippetUseCase`: エンティティ生成→バリデーション→保存。
- `UpdateSnippetUseCase`: 差分マージ→バリデーション→保存。
- `DeleteSnippetUseCase`: `delete` 呼び出し後、UI キャッシュ更新。

### 4.4 ライブラリ管理
- `GetAllLibrariesUseCase`: Personal / Team（将来的には Project など）を列挙して UI ドロップダウンを構成。
- `SwitchActiveLibraryUseCase`: 選択状態を `UserPreferences` に記録し、検索条件に反映。

## 5. UI とのインタラクション
- React 側はユースケースの戻り値を表示する薄いプレゼンタに徹する。
- 検索バーは初期フォーカス済み、`Enter` で `CopySnippetUseCase` を即呼び出し、`⌘1`〜`⌘3` でライブラリスコープを切り替えるショートカットをハンドリングする。
- 空クエリ状態では「お気に入り」＋「最近使った」を共通コンポーネントで表示し、ユースケースの結果順にカードを描画する。

## 6. データ永続と同期
- MVP では一つのストレージ（JSON / SQLite など）に `Personal` と `Team` の両ライブラリを同居させ、`libraryId` で区別する。
- `SnippetLibrary.isReadOnly` を使って Team 側を保護したり、将来的にプロジェクト別ライブラリを追加する余地を残す。
- ライブラリ単位でデータをエクスポートすればオンボーディングパックとして配布しやすい。

## 7. 今後の進め方
1. `src/core/domain/snippet` 配下にエンティティ定義とデータアクセスアダプタインターフェースを新設。
2. `src/core/usecases` に検索・コピー・CRUD ユースケースを TypeScript で実装し、React から注入する。
3. 検索ロジックを Vitest でテストし、ショートカットやスコアリングの調整を容易にする。
4. ライブラリ切替 UI を追加し、Personal/Team コンテキストの概念実装を後追いする。
