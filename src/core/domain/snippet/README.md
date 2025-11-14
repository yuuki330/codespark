# Snippet Domain Module

`src/core/domain/snippet/` は Snippet に関するエンティティ／値オブジェクト／ファクトリ／エラー／ユーティリティを集約するモジュール。

```
snippet/
├── entities/        # Snippet エンティティや関連構造体
├── value-objects/   # SnippetId, LibraryId, TagName など値オブジェクト
├── factories/       # createSnippet, updateSnippet などの生成系関数
├── errors/          # ValidationError などドメイン専用エラー
└── utils/           # バリデーション補助や共通処理
```

`index.ts` で各ディレクトリを再エクスポートし、ユースケース層からは
`src/core/domain/snippet` を参照するだけで必要な型やユーティリティへアクセスできる。

詳細な定義は docs/design.md / docs/tasks.md の要件に沿って段階的に実装する。
