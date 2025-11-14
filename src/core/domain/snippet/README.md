# Snippet Domain Module

`src/core/domain/snippet/` は Snippet に関するエンティティ／値オブジェクト／ファクトリ／エラー／ユーティリティを集約するモジュール。

```
snippet/
├── entities/        # Snippet エンティティや関連構造体
├── domain-values/   # SnippetId, LibraryId, TagName など値オブジェクト
├── converters/      # createSnippet, updateSnippet などエンティティ変換ロジック
├── errors/          # ValidationError などドメイン専用エラー
├── ports/           # SnippetDataAccessAdapter など永続層との境界
└── utils/           # バリデーション補助や共通処理
```

`index.ts` で各ディレクトリを再エクスポートし、ユースケース層からは
`src/core/domain/snippet` を参照するだけで必要な型やユーティリティへアクセスできる。

詳細な定義は docs/design.md / docs/tasks.md の要件に沿って段階的に実装する。
