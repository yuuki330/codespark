import type { Snippet, SnippetLibrary, UserPreferences } from '../entities'
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

/**
 * ライブラリメタデータ（Personal / Team 等）を取得するためのアダプタ。
 */
export interface SnippetLibraryDataAccessAdapter {
  getLibraries(): Promise<SnippetLibrary[]>
}

/**
 * クリップボードへアクセスするためのゲートウェイ。
 * OS ごとの挙動はインフラ層で実装し、ユースケースからは抽象化された API として利用する。
 */
export interface ClipboardGateway {
  copyText(text: string): Promise<void>
}

export interface UserPreferencesGateway {
  getPreferences(): Promise<UserPreferences | null>
  savePreferences(preferences: UserPreferences): Promise<void>
}
