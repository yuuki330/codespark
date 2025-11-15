# アーキテクチャ図

Mermaid で表現した CodeSpark の主要レイヤとデータフロー。

```mermaid
flowchart TD

  subgraph UI["UI Layer (React)"]
    App["App.tsx / Components"]
    App --> Hooks["Hooks / Context"]
  end

  subgraph Usecases["Usecase Layer"]
    direction TB
    Search["SearchSnippetsUseCase"]
    Copy["CopySnippetUseCase"]
    CRUD["Create/Update/Delete UseCases"]
  end

  subgraph Domain["Domain Layer (Entities / Rules)"]
    direction TB
    Snippet["Snippet Entities & Value Objects"]
    Factory["constructSnippet / applySnippetUpdate"]
    Validation["SnippetValidationError / Issues"]
    Factory --> Snippet
    Snippet --- Validation
    Factory --- Validation
  end

  subgraph DataAccess["Interface Adapter Layer"]
    direction TB
    FileAdapter["FileSnippetDataAccessAdapter"]
    LibraryPort["SnippetLibraryDataAccessAdapter"]
  end

  subgraph Tauri["Tauri (Rust) Layer"]
    direction TB
    ClipboardCmd["copy_to_clipboard"]
    StoreRead["read_snippet_store"]
    StoreWrite["write_snippet_store / ensure_snippet_store_dir"]
  end

  subgraph Storage["Infrastructure Layer"]
    JsonFile["snippets.json (AppData)"]
    Clipboard["OS Clipboard"]
  end

  App -->|依存| Hooks -->|呼び出し| Search
  Hooks --> Copy
  Hooks --> CRUD
  Search -->|参照| Snippet
  Copy --> Factory
  CRUD --> Factory
  Factory --> Snippet
  Snippet --> FileAdapter
  FileAdapter -->|invoke| StoreRead
  FileAdapter --> StoreWrite
  StoreRead --> JsonFile
  StoreWrite --> JsonFile
  Copy -->|invoke| ClipboardCmd --> Clipboard
  LibraryPort -.-> FileAdapter
  ClipboardCmd --> Clipboard
```

## 読み方
- **UI → Usecase**: React からフックを介して各ユースケースを呼び出し、検索・コピー・CRUD を実行する。
- **Usecase → Domain**: ユースケースはドメインファクトリ（`constructSnippet` / `applySnippetUpdate`）を呼び、同じ層にある Validation/Errors とともにエンティティを検証・生成する。
- **Domain → DataAccess**: ドメインは `SnippetDataAccessAdapter` 経由で FileSnippetDataAccessAdapter を利用する。
- **DataAccess → Tauri**: アダプタは `invoke` で Tauri コマンド（JSON 読み書き・ディレクトリ作成）を呼び出し、OS ファイルへ委譲する。
- **Copy Usecase → Clipboard**: コピー用ユースケースは Tauri のクリップボードコマンドを呼んで OS クリップボードへ書き込む。

## 参考リンク
- [README](../README.md)
- [docs/design.md](./design.md)
