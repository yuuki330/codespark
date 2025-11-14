/**
 * Snippet ドメインモジュールのエントリポイント。
 * - entities: Snippet などのエンティティ定義
 * - value-objects: SnippetId, TagName などの値オブジェクト
 * - factories: createSnippet などの生成関数
 * - errors: ドメイン専用エラー
 * - utils: バリデータなどの補助ロジック
 *
 * ここで再エクスポートしておくことで、ユースケース層からは
 * `src/core/domain/snippet` を参照するだけで必要な型／関数へアクセスできる。
 */
export * from './entities'
export * from './value-objects'
export * from './factories'
export * from './errors'
export * from './utils'
