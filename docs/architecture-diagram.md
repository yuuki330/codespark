# アーキテクチャ図

Mermaid で表現した CodeSpark の主要レイヤとデータフロー。

```mermaid
flowchart LR

  subgraph UI["React UI (Vite)"]
    App["App.tsx / Components"]
    App --> Hooks["Hooks / Context"]
  end

  subgraph Usecases["Usecases"]
    Search["SearchSnippetsUseCase"]
    Copy["CopySnippetUseCase"]
    CRUD["Create/Update/Delete UseCases"]
  end

  subgraph Domain["Domain"]
    Snippet["Snippet Entities & Value Objects"]
    Factory["constructSnippet / applySnippetUpdate"]
    Validation["Validation / Errors"]
    Snippet --- Factory
    Factory --- Validation
  end

  subgraph DataAccess["Data Access Adapters"]
    FileAdapter["FileSnippetDataAccessAdapter"]
    LibraryPort["SnippetLibraryDataAccessAdapter"]
  end

  subgraph Tauri["Tauri (Rust) Commands"]
    ClipboardCmd["copy_to_clipboard"]
    StoreRead["read_snippet_store"]
    StoreWrite["write_snippet_store / ensure_snippet_store_dir"]
  end

  subgraph Storage["OS Storage"]
    JsonFile["snippets.json (AppData)"]
    Clipboard["OS Clipboard"]
  end

  App -->|依存| Hooks -->|呼び出し| Search
  Hooks --> Copy
  Hooks --> CRUD
  Search -->|ドメイン操作| Snippet
  Copy --> Snippet
  CRUD --> Factory
  Factory --> Snippet
  Snippet --> FileAdapter
  FileAdapter -->|invoke| StoreRead
  FileAdapter --> StoreWrite
  StoreRead --> JsonFile
  StoreWrite --> JsonFile
  Copy -->|invoke| ClipboardCmd --> Clipboard
  LibraryPort -.-> FileAdapter
```

## 読み方
- **UI → Usecase**: React からフックを介して各ユースケースを呼び出し、検索・コピー・CRUD を実行する。
- **Usecase → Domain**: ユースケースは `constructSnippet` / `applySnippetUpdate` などのファクトリを経由して `Snippet` エンティティを生成・更新し、バリデーションを行う。
- **Domain → DataAccess**: ドメインは `SnippetDataAccessAdapter` 経由で FileSnippetDataAccessAdapter を利用する。
- **DataAccess → Tauri**: アダプタは `invoke` で Tauri コマンド（JSON 読み書き・ディレクトリ作成）を呼び出し、OS ファイルへ委譲する。
- **Copy Usecase → Clipboard**: コピー用ユースケースは Tauri のクリップボードコマンドを呼んで OS クリップボードへ書き込む。

## 参考リンク
- [README](../README.md)
- [docs/design.md](./design.md)
