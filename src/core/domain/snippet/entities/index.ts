import type { LibraryId, SnippetId, TagName } from '../domain-values'

/**
 * Snippet エンティティ定義。
 * docs/design.md の要件に沿って UI で必要なフィールドをすべて含める。
 */
export type Snippet = {
  id: SnippetId
  title: string
  body: string
  shortcut?: string | null
  description?: string | null
  tags: TagName[]
  language?: string | null
  isFavorite: boolean
  usageCount: number
  lastUsedAt?: Date | null
  libraryId: LibraryId
  createdAt: Date
  updatedAt: Date
}
