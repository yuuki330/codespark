# README

## 1. 背景とスコープ

CodeSpark は、開発者向けの **ローカルスニペットランチャー** である。

- スニペット（コード断片・テンプレ）をローカルに保存する
- キーボード中心の操作で、検索 → 即コピー → エディタ等へ貼り付けできる
- 将来的には Git 管理されたスニペットとの連携や、社内標準スニペットの参照も視野に入れる
- macOS と Windows の両 OS で同一 UX を提供する（Linux は可能な限りサポート）

本ドキュメントでは、主に **エンティティ（Entity）** と **ユースケース（Usecase）** を定義する。  
実装技術（React / Tauri / Rust）には依存しない抽象レベルを目指す。

---

## 2. エンティティ（Entities）

### 2.1 Snippet

**概要**：  
CodeSpark の中心となるエンティティ。  
開発者が再利用したいコード・コマンド・テキスト断片を表す。

| フィールド名   | 型                    | 説明 |
|----------------|-----------------------|------|
| `id`           | `SnippetId` (string)  | スニペットの永続的な識別子（UUID など） |
| `title`        | string                | スニペットのタイトル。検索結果一覧に表示される短いラベル |
| `body`         | string                | 実際にコピーされるコード本体・テキスト |
| `description`  | string \| null        | 補足説明。使用例や注意点など（任意） |
| `tags`         | `TagName[]`           | 言語・用途・カテゴリなどを表すタグ一覧 |
| `language`     | string \| null        | 主な言語（例: `"python"`, `"typescript"`, `"bash"`） |
| `libraryId`    | `LibraryId`           | Personal / Team / Project など所属ライブラリ |
| `isFavorite`   | boolean               | お気に入り（頻繁に使う）フラグ |
| `createdAt`    | `Date`                | 作成日時 |
| `updatedAt`    | `Date`                | 最終更新日時 |
| `usageCount`   | number                | このスニペットがコピーされた回数（ランチャー内での使用頻度） |

**ドメインルール / 不変条件 (例)**

- `title` は空文字列ではないこと
- `body` は空文字列ではないこと
- `tags` は重複しない（同じ文字列のタグが二重に入らない）
- `updatedAt >= createdAt` であること

---

### 2.2 Tag

**概要**：  
スニペットを分類・検索しやすくするためのラベル。

最初はシンプルに **文字列として表現** する。

```ts
type TagName = string;
````

必要になったら、次のように独立したエンティティとして昇格させることを想定：

```ts
type TagId = string;

type Tag = {
  id: TagId;
  name: string;      // 表示名
  color?: string;    // UI 上のカラーコード（例: #4b9fff）
  kind?: "lang" | "domain" | "team" | "custom";
};
```

---

### 2.3 LibraryCategory

**概要**：
ライブラリの利用コンテキストを示す属性。保存媒体（Git / Local）は区別せず、どのような目的のスニペットかだけを表す。

```ts
type LibraryCategory = "PERSONAL" | "TEAM" | "PROJECT";
```

- `PERSONAL`: 個人メモ・試行錯誤用。多少雑でもよい箱。
- `TEAM`: チーム共有を前提とした信頼度の高い断片。
- `PROJECT`: 特定プロジェクトや領域専用のスニペット（将来的な拡張枠）。

MVP では `PERSONAL` と `TEAM` の 2 種類のみを UI スコープとして扱うが、データモデル上は `PROJECT` などの追加にも備えておく。

---

### 2.4 SnippetLibrary

**概要**：
スニペット集合を論理的にまとめるコンテナ。
1つのライブラリ = 1つの「スニペットストレージ」単位（例：1つの JSON ファイル、1つの Git リポジトリ）。

```ts
type LibraryId = string;

type SnippetLibrary = {
  id: LibraryId;
  name: string;           // 例: "Personal", "Team Snippets", "Backend Team"
  description?: string;
  isReadOnly: boolean;    // 読み取り専用かどうか（例: チームリポジトリ）
  category: LibraryCategory;
};
```

**役割**

* 将来的に「複数のスニペットソース（個人用 / チーム用 / プロジェクト用）」を扱う前提の拡張ポイント。
* 現時点では「ローカルのデフォルトライブラリ 1つ」だけでもよい。

---

### 2.5 UserPreferences（将来の拡張枠）

**概要**：
ユーザーごとの表示設定・動作設定。

例：

```ts
type UserPreferences = {
  defaultLibraryId: LibraryId;
  theme: "dark" | "light" | "system";
  globalShortcut: string; // 例: "Cmd+Shift+Space"
};
```

**現時点では必須ではないが**、
「グローバルショートカット」「ダーク／ライトテーマ切り替え」を入れたくなったときに、ここに落とし込める。

---

## 3. ユースケース（Usecases）

ここでは CodeSpark の中核となるユースケースを整理する。
クリーンアーキテクチャ的には、**アプリケーション層（Usecase）** として実装される。

※名前は `XXXUseCase` クラス or 単純な関数のどちらでもよいが、ここではクラス名で記述する。

---

### UC-01: スニペットを検索してコピーする

**目的**：
ユーザーが必要なスニペットを高速に探し、クリップボードにコピーする。

**Usecase 名案**

* `SearchSnippetsUseCase`
* `CopySnippetUseCase`（コピー操作を別 Usecase に分けるパターン）

**主なフロー**

1. ユーザーが検索キーワードを入力する。
2. `SearchSnippetsUseCase` が `SnippetDataAccessAdapter` からスニペット一覧を取得する。
3. タイトル / タグ / 本文でキーワードフィルタリングを行う。
4. UI に一覧を返す。
5. ユーザーが特定のスニペットを選択して「コピー」操作を行う。
6. `CopySnippetUseCase` が対象スニペットを取得し、クリップボードへ送る。
7. `usageCount` をインクリメントして保存する（頻度ベースの並び替えに使える）。

---

### UC-02: スニペットを新規登録する

**目的**：
ユーザーが CodeSpark 上にスニペットを追加する。

**Usecase 名案**

* `CreateSnippetUseCase`

**入力**

* `title`
* `body`
* `tags`
* `language`
* 対象ライブラリ（省略時はデフォルトライブラリ）

**主なフロー**

1. 入力値を受け取り、`Snippet` エンティティを生成。
2. 必要なバリデーションを実行（タイトル必須、body 必須、タグ重複排除など）。
3. `SnippetDataAccessAdapter.save(snippet)` を呼び出し、永続化。
4. 成功したスニペットを返す。

実装は `src/core/usecases/snippet/createSnippetUseCase.ts` で行い、DTO から `constructSnippet` を呼び出してドメインルール検証と保存を直列化している。React 側では `App.tsx` のコマンドサーフェス下部に「新規スニペットを追加」フォームを設けており、タイトル／本文／ライブラリ／タグ等を入力して `CreateSnippetUseCase` を実行し、完了後はリストへ即座に反映される。

---

### UC-03: スニペットを編集する

**目的**：
既存スニペットのタイトル・本文・タグ等を更新する。

**Usecase 名案**

* `UpdateSnippetUseCase`

**主なフロー**

1. `SnippetId` と変更内容（partial）を受け取る。
2. `SnippetDataAccessAdapter.getById(id)` で既存スニペットを取得。
3. 差分をマージして新しい `Snippet` を生成。
4. バリデーション。
5. `updatedAt` を更新。
6. `SnippetDataAccessAdapter.save(updatedSnippet)` を実行。

実装は `src/core/usecases/snippet/updateSnippetUseCase.ts` で行い、ReadOnly ライブラリの場合は `ReadOnlyLibraryViolationError` を返す。UI では `App.tsx` 内の「選択中のスニペットを編集」フォームから `UpdateSnippetUseCase` を呼び出し、ライブラリやタグ変更を含む編集を行う。

---

### UC-04: スニペットを削除する

**目的**：
不要になったスニペットを削除する。

**Usecase 名案**

* `DeleteSnippetUseCase`

**主なフロー**

1. `SnippetId` を受け取る。
2. `SnippetDataAccessAdapter.delete(id)` を呼ぶ。
3. 関連するキャッシュ等があれば更新する（将来）。

実装は `src/core/usecases/snippet/deleteSnippetUseCase.ts` で行い、ReadOnly ライブラリの削除は `ReadOnlyLibraryViolationError` で防いでいる。UI では `App.tsx` 内のスニペット編集パネルに「スニペットを削除」ボタンを配置し、選択中のスニペットを削除するとトースト通知が表示されリストが更新される。

---

### UC-05: タグ・条件でスニペットを絞り込む

**目的**：
特定のタグや条件でスニペット一覧を絞り込む。

**Usecase 名案**

* `FilterSnippetsUseCase`（検索と統合するかは要検討）

**主なフロー**

1. キーワード + タグ + ライブラリ等の条件を受け取る。
2. `SnippetDataAccessAdapter` から集合を取得。
3. 条件に基づいてフィルタリング。
4. UI 用にソート済みのリストとして返却。

※ 検索とフィルタをひとつの `SearchSnippetsUseCase` にまとめる形でも問題ない。

---

### UC-06: 最近使ったスニペットを表示する

**目的**：
直近でよく使っているスニペットを素早く呼び出す。

**Usecase 名案**

* `GetRecentSnippetsUseCase`

**主なフロー**

1. `SnippetDataAccessAdapter` から全スニペットを取得。
2. `usageCount`・`updatedAt` などを用いて並び替える。
3. 上位 N 件を返す。

---

### UC-07: ライブラリを切り替える / 管理する（将来）

**目的**：
個人用・チーム用・プロジェクト用など複数ライブラリを切り替えて利用する。

**Usecase 名案（例）**

* `GetAllLibrariesUseCase`
* `SwitchActiveLibraryUseCase`
* `AddLibraryUseCase`（Git リポジトリをライブラリとして追加、など）

現時点では実装優先度は低めだが、`SnippetLibrary` エンティティを設計しておくことで、
将来この領域をきれいに拡張できる。

---

## 4. データアクセスアダプタ

Usecase が依存するのはあくまで **抽象データアクセスアダプタ** であり、
具体的な保存先（ローカル JSON / Git / DB）は知らない。

```ts
// src/core/domain/snippet/SnippetDataAccessAdapter.ts

import type { Snippet, SnippetId } from "./Snippet";

export interface SnippetDataAccessAdapter {
  getAll(): Promise<Snippet[]>;
  getById(id: SnippetId): Promise<Snippet | null>;
  save(snippet: Snippet): Promise<void>;
  delete(id: SnippetId): Promise<void>;
}
```

* ローカル JSON 用実装：`FileSnippetDataAccessAdapter`
* （将来）Git 連携用：`GitSnippetDataAccessAdapter`
* （将来）社内 API 用：`RemoteSnippetDataAccessAdapter`

ローカル JSON の保存先パスや `snippets.json` のスキーマは [docs/storage-layout.md](./docs/storage-layout.md) にまとめてある。

などを **インターフェースアダプタ層（データアクセスアダプタ）** に実装する。

---

## 5. 現時点の前提と今後詰める余地があるポイント

### 現時点での前提

* 利用者は 1 人（≒ローカルユーザー）。アカウント概念は考えない。
* スニペットの保存先はとりあえず「ローカルファイル or ローカルDB」を想定する。
* ライブラリは当面 1 つ（`Default`）でも運用可能だが、設計上は複数を許容する。

### 今後、詳細化すると良さそうな論点（メモ）

* スニペット本文に **プレースホルダ（`{{name}}` のようなテンプレ機能）** を許容するか
* スニペットに **ショートカットキー（例: `gs` → 特定スニペット）** を割り当てるか
* スニペットの「共有」範囲（完全ローカルのみ / Git と連携 / エクスポート・インポート）
* ライブラリごとに **ReadOnly / Editable** のルールをどう定義するか
* クリップボードコピー以外に、**エディタへの直接貼り付け** や **コマンド実行** まで踏み込むか

これらは、今後の機能追加のタイミングでドメインに取り込むかどうか判断していけばよい。

---

## 6. ライブラリ運用に関する補足

### 6.1 Personal / Team を論理分割する狙い

保存方法に関係なく、**Personal / Team といった論理ライブラリを分ける**だけで十分価値がある。

- `Personal` ライブラリは雑多なメモや試行錯誤を気軽に蓄積できる「安心して汚せる箱」として使う。
- `Team` ライブラリはチーム全体で共有したいスニペットのみを置き、ノイズを排除して信頼できる一覧を保つ。
- `Personal` から `Team` への「昇格」フロー（コピーや移動）を用意すると、品質の違う情報が混じらない。

### 6.2 ライブラリ切り替え UX のヒント

利用シーン別に検索範囲を即切り替えられるとコンテキストスイッチが軽くなる。Raycast の Search Scope のように、`All / Personal / Team` を選べるドロップダウンや `⌘1` `⌘2` `⌘3` のショートカットを設けると、障害対応のような場面でも素早く最適なコマンドにアクセスできる。

### 6.3 オンボーディングパックとしての配布

`Team` ライブラリを JSON などで配布し、新規メンバーには CodeSpark インストール後にそのライブラリだけを検索範囲にすれば「まず読むべきスニペット集」がすぐ揃う。慣れてきたら `Personal` を増やす、という導線を作りやすい。

### 6.4 MVP では 1 ライブラリ運用で良い

実装複雑度を抑えるため、MVP では `Personal` と `Team` の 2 スコープのみを提供する（内部的には `libraryId` で区別し、それ以外のライブラリはまだ露出させない）。データモデルでは `PROJECT` などの追加カテゴリにも備えておき、スコープ設定 UI が整った段階で段階的に解放する。

---

## 7. Raycast 体験に寄せるためのドメイン指針

### 7.1 Snippet エンティティの拡張

Raycast 風の「入力 → 即結果」体験を支えるため、以下のようにフィールドを強化する。

```ts
type Snippet = {
  id: SnippetId;
  title: string;
  body: string;
  libraryId: LibraryId;
  shortcut?: string | null;  // "gs" などのキーワード
  description?: string | null;
  tags: string[];
  language?: string | null;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
```

`shortcut` で任意コマンドを模倣でき、`isFavorite` や `lastUsedAt` 情報は検索スコアリングや初期候補に効いてくる。

### 7.2 SearchSnippetsUseCase のスコアリング

単純な `includes` ではなく、クエリとの一致度でスコアを付ける。`shortcut === query` を最優先し、タイトル前方一致・タグ一致・本文一致の順に点数を下げる。`isFavorite` や `usageCount`、`lastUsedAt` もボーナスに加えて、最終的なスコア順をそのまま UI に渡せば「上に最適な候補が並ぶ」Raycast らしさが得られる。

### 7.3 キーボード前提のユースケース

- `CopySnippetUseCase` でコピー操作と同時に `usageCount` / `lastUsedAt` を更新し、次回検索順位に反映させる。
- `GetTopSnippetsForEmptyQueryUseCase` を用意し、クエリ未入力時はお気に入り＋最近使った候補を事前計算して返す。

### 7.4 UI 実装への示唆

アプリ起動時に検索バーへフォーカスし、下部に「最近使った & お気に入り」を並べる。入力に応じて即時フィルタ、`Enter` でトップ候補をコピー、`↓ / ↑` で移動…といった操作を前提に、ユースケース層で「最上位に表示すべきスニペット」をきちんと決めておく。

### 7.5 ライブラリ / タグ複合フィルタ

UI 側では Personal / Team など複数ライブラリをトグルできるチップと、タグごとの複合フィルタを提供する。状態は `SearchSnippetsUseCase` にそのまま渡され、ライブラリ ID 配列・タグ配列で条件を掛け合わせる。All を選択した場合は全ライブラリが検索対象になり、タグはすべて一致したスニペットのみを結果に含める。フィルタ状態は `GetTopSnippetsForEmptyQueryUseCase` にも引き継がれるため、空クエリでもコンテキストに沿った候補だけが提示される。

---

## 8. 次のアクション

- `src/core/domain/snippet/Snippet.ts` で拡張フィールドを定義する。
- `src/core/domain/snippet/SnippetDataAccessAdapter.ts` と `src/core/usecases/SearchSnippets.ts` を TypeScript 実装し、`App.tsx` からロジックを切り出す。
- Personal / Team スコープの UX を固めたうえで、必要に応じて Project など追加カテゴリを段階的に公開する。

## 9. アーキテクチャ図

Mermaid で各レイヤの依存関係をまとめた図を [docs/architecture-diagram.md](docs/architecture-diagram.md) に掲載している。React UI・ユースケース・ドメイン・データアクセス・Tauri コマンド・OS ストレージ間のフローを確認したい場合に参照すること。

## 10. 開発コマンドとテスト

- `npm run dev` : Vite 開発サーバーを起動し、フィルタ UI や検索体験を即座に確認する。
- `npm run build` : TypeScript 型チェックと Vite の本番ビルドを走らせる。
- `npm run test` : Vitest 実行。`SearchSnippetsUseCase` のスコアリングやフィルタリングをユニットテストで検証し、shortcut/タグ/ライブラリ条件の退行を防ぐ。

## 11. UI 操作ヒントとショートカット

- React 側の UI は検索バー・フィルタ・スニペットリストを `src/components/` 配下に分割し、メンテナンスしやすい構造にしている。`SearchInput` が初期フォーカスとフォーカス制御を担い、`SnippetList` は検索結果/空クエリ用候補を同じ描画ロジックで切り替える。
- 空クエリ時は `GetTopSnippetsForEmptyQueryUseCase` の結果（お気に入り + 最近使用）を優先的に表示し、「候補が無い」状態を明示するメッセージを出す。
- ライブラリ切替は `⌘1`（All）/`⌘2`（Personal）/`⌘3`（Team）…… のショートカットに対応し、ショートカット操作でも UI のトグルが同期する。Windows/Linux では `Ctrl` キーで同じ操作が可能。
- コピー失敗などの異常はアラートではなく通知トーストに集約し、複数イベントが続いてもスタックとして確認できる。通知は数秒で自動的に消える。


## 12. デスクトップビルド手順

1. 依存関係をセットアップ: `npm install` を実行して Node/Tauri CLI を同期する。
2. 開発時は `npm run tauri dev` で Vite と Tauri を同時起動し、OS API の動作を都度確認する。
3. 本番ビルドは `npm run tauri build` を利用し、macOS は Xcode Command Line Tools、Windows は WebView2 Runtime（Evergreen）と Visual C++ 再頒布パッケージを満たしていることを確認する。
4. macOS/Windows 共に生成バイナリで検索・コピー・ファイル永続化が動作するか実機確認し、WebView2 未導入環境では Microsoft 配布のインストーラで事前に更新してもらう旨を README/PR に記す。
