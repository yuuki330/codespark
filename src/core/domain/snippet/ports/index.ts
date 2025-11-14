import type { Snippet } from '../entities'
import type { SnippetId } from '../domain-values'

/**
 * 永続層へのアクセスを抽象化するためのスニペット用データアクセスアダプタ。
 * ドメイン型にのみ依存し、実際の実装（JSON, SQLite など）はこのインターフェースを満たす。
 */
export interface SnippetDataAccessAdapter {
  getAll(): Promise<Snippet[]>
  getById(id: SnippetId): Promise<Snippet | null>
  save(snippet: Snippet): Promise<void>
  delete(id: SnippetId): Promise<void>
}
