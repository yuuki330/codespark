import type { Snippet } from '../entities'
import type { LibraryId, SnippetId, TagName } from '../domain-values'
import {
  SnippetValidationError,
  type SnippetValidationIssue,
} from '../errors'

/**
 * createSnippet や updateSnippet など、入力 DTO からドメインエンティティへ
 * 変換するロジックをここにまとめる。
 */

export type CreateSnippetInput = {
  id: SnippetId
  title: string
  body: string
  shortcut?: string | null
  description?: string | null
  tags?: TagName[]
  language?: string | null
  isFavorite?: boolean
  usageCount?: number
  lastUsedAt?: Date | null
  libraryId: LibraryId
  createdAt: Date
  updatedAt: Date
}

export const createSnippet = (input: CreateSnippetInput): Snippet => {
  const issues: SnippetValidationIssue[] = []
  const title = input.title?.trim() ?? ''
  const body = input.body?.trim() ?? ''

  if (!title) {
    issues.push({
      code: 'TITLE_EMPTY',
      field: 'title',
      message: 'title must not be empty',
    })
  }

  if (!body) {
    issues.push({
      code: 'BODY_EMPTY',
      field: 'body',
      message: 'body must not be empty',
    })
  }

  const tags = [...(input.tags ?? [])]
  const duplicates = findDuplicateTags(tags)

  if (duplicates.length > 0) {
    issues.push({
      code: 'TAGS_DUPLICATED',
      field: 'tags',
      message: `tags contain duplicates: ${duplicates.join(', ')}`,
    })
  }

  const createdAtTime = input.createdAt?.getTime()
  const updatedAtTime = input.updatedAt?.getTime()

  if (
    Number.isNaN(createdAtTime) ||
    Number.isNaN(updatedAtTime) ||
    createdAtTime === undefined ||
    updatedAtTime === undefined
  ) {
    issues.push({
      code: 'INVALID_TIMESTAMP',
      field: 'timestamps',
      message: 'createdAt and updatedAt must be valid Date objects',
    })
  } else if (updatedAtTime < createdAtTime) {
    issues.push({
      code: 'UPDATED_AT_BEFORE_CREATED_AT',
      field: 'timestamps',
      message: 'updatedAt must be greater than or equal to createdAt',
    })
  }

  if (issues.length > 0) {
    throw new SnippetValidationError(issues)
  }

  return {
    id: input.id,
    title,
    body,
    shortcut: input.shortcut ?? null,
    description: input.description ?? null,
    tags,
    language: input.language ?? null,
    isFavorite: input.isFavorite ?? false,
    usageCount: input.usageCount ?? 0,
    lastUsedAt: input.lastUsedAt ?? null,
    libraryId: input.libraryId,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  }
}

const findDuplicateTags = (tags: TagName[]): TagName[] => {
  const seen = new Set<TagName>()
  const duplicates = new Set<TagName>()

  tags.forEach(tag => {
    const key = tag
    if (seen.has(key)) {
      duplicates.add(key)
      return
    }

    seen.add(key)
  })

  return Array.from(duplicates)
}
