/**
 * Snippet エンティティ定義。
 * docs/design.md の要件に沿って UI で必要なフィールドをすべて含める。
 */
export type Snippet = {
  id: string
  title: string
  body: string
  shortcut?: string | null
  description?: string | null
  tags: string[]
  language?: string | null
  isFavorite: boolean
  usageCount: number
  lastUsedAt?: Date | null
  libraryId: string
  createdAt: Date
  updatedAt: Date
}
