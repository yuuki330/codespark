# ストレージファイルレイアウト

CodeSpark のスニペットは `FileSnippetDataAccessAdapter` を経由してローカル JSON ファイルに保存される。ここでは保存先ディレクトリ、JSON スキーマ、バックアップ手順をまとめる。

## 保存先ディレクトリ
- デフォルトのファイルパスは `codespark/snippets.json`
- デフォルトのスコープは `appData`（Tauri の `BaseDirectory::AppData`）
- 実際のパスは OS ごとに以下のように解決される

| OS | ベースディレクトリ (AppData) | 実際のファイルパス例 |
| --- | --- | --- |
| macOS | `~/Library/Application Support/<tauri.identifier>/` | `~/Library/Application Support/<tauri.identifier>/codespark/snippets.json` |
| Windows | `%APPDATA%\<tauri.identifier>\` | `%APPDATA%\<tauri.identifier>\codespark\snippets.json` |
| Linux | `~/.local/share/<tauri.identifier>/` | `~/.local/share/<tauri.identifier>/codespark/snippets.json` |

`<tauri.identifier>` には `tauri.conf.json` の `identifier` フィールド（現状は `com.yuuki330.codespark`）が入る。アプリの識別子を変更した場合でも、ここを揃えておけば保存先のベースパスが自動で切り替わる。

> `snippets.json` が存在しない場合や壊れている場合は、起動時に空ファイルを再作成する。

Tauri 側の `resolve_store_path` が `scope` を `BaseDirectory` に変換し、`FileSnippetDataAccessAdapter` の `filePath` で指定した相対パスを結合する。必要に応じて以下のオプションで保存先を変更できる。

```ts
new FileSnippetDataAccessAdapter({
  filePath: 'my/custom/snippets.json',
  scope: 'appConfig', // BaseDirectory::AppConfig へ切り替え
})
```

`scope` に対応する `BaseDirectory` は [`src-tauri/src/lib.rs`](../src-tauri/src/lib.rs) の `scope_to_base_directory` を参照。

## JSON スキーマ
トップレベル構造は下記の通り。`version` は現在 `1` 固定で、リーダー側が `STORE_VERSION` と異なる場合は自動的に再正規化される。

```jsonc
{
  "version": 1,
  "snippets": [SerializedSnippet],
  "libraries": [SnippetLibrary]
}
```

### snippets 配列
各要素は `Snippet` をシリアライズした `SerializedSnippet` で、日時は ISO 8601 文字列に変換される。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | `string` | スニペット ID (`SnippetId`) |
| `title` | `string` | 検索結果に表示するタイトル |
| `body` | `string` | コピー対象の本文 |
| `description` | `string \| null` | 補足説明 |
| `tags` | `string[]` | タグ。重複なし |
| `language` | `string \| null` | 主言語 |
| `shortcut` | `string \| null` | 完全一致で検索されるショートカット |
| `isFavorite` | `boolean` | お気に入りフラグ |
| `usageCount` | `number` | コピー回数 |
| `lastUsedAt` | `string \| null` | ISO 8601（例: `2024-08-22T09:00:00.000Z`） |
| `libraryId` | `string` | 所属ライブラリ ID (`personal` など) |
| `createdAt` | `string` | ISO 8601 文字列 |
| `updatedAt` | `string` | ISO 8601 文字列 |

例：

```json
{
  "id": "cli-node-install",
  "title": "Node.js を Homebrew で入れる",
  "body": "brew install node",
  "description": "LTS を入れたい場合は --lts",
  "tags": ["node", "cli"],
  "language": "bash",
  "shortcut": "node-install",
  "isFavorite": true,
  "usageCount": 42,
  "lastUsedAt": "2024-08-20T12:34:56.000Z",
  "libraryId": "personal",
  "createdAt": "2024-08-01T09:00:00.000Z",
  "updatedAt": "2024-08-20T12:34:56.000Z"
}
```

### libraries 配列
`SnippetLibrary` の定義に沿ったメタデータで、初期値は `personal`（書込み可能）と `team`（`isReadOnly: true`）の 2 件。`FileSnippetDataAccessAdapter` の `libraries` オプションで追加・上書きでき、ファイルにも同じ構造で保存される。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | `string` | ライブラリ ID |
| `name` | `string` | 表示名 |
| `description` | `string \| undefined` | 説明 |
| `category` | `"PERSONAL" \| "TEAM" \| "PROJECT"` | 分類 |
| `isReadOnly` | `boolean` | 書込み禁止の場合 `true` |

`team` ライブラリのように `isReadOnly: true` の行があると、CRUD ユースケースは削除や更新を拒否する。

## ファイル生成と復旧
1. 起動時に `exists` コマンドでファイルの有無を確認
2. 無い場合は `createEmptyStore()` を書き込み
3. 既存ファイルが JSON として壊れている場合は警告を出し、空ファイルに置き換え
4. 親ディレクトリは `ensure_snippet_store_dir` で必ず作成

## バックアップ・リストア手順
1. アプリを終了し、`snippets.json` が書き込まれない状態にする
2. 上記パスのファイルを任意の場所にコピー（`snippets.json.bak` など）
3. 復元したい場合はバックアップファイルを同じパスへ上書きする（必要ならアプリ終了後に実行）
4. 書式が壊れていないか不安な場合は JSON バリデータで `version/snippets/libraries` が揃っているか確認

このファイル 1 つをリポジトリ管理や同期対象に含めることで、Personal/Team いずれのライブラリもまとめて移行できる。
