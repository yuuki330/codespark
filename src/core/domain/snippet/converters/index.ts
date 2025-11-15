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

type SnippetValidationPayload = {
  title: string
  body: string
  tags: TagName[]
  createdAt: Date
  updatedAt: Date
}

const validateSnippetDomainRules = (
  payload: SnippetValidationPayload
): SnippetValidationIssue[] => {
  const issues: SnippetValidationIssue[] = []

  if (!payload.title) {
    issues.push({
      code: 'TITLE_EMPTY',
      field: 'title',
      message: 'title must not be empty',
    })
  }

  if (!payload.body) {
    issues.push({
      code: 'BODY_EMPTY',
      field: 'body',
      message: 'body must not be empty',
    })
  }

  const duplicates = findDuplicateTags(payload.tags)

  if (duplicates.length > 0) {
    issues.push({
      code: 'TAGS_DUPLICATED',
      field: 'tags',
      message: `tags contain duplicates: ${duplicates.join(', ')}`,
    })
  }

  const createdAtTime = payload.createdAt?.getTime()
  const updatedAtTime = payload.updatedAt?.getTime()

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

  return issues
}

export const createSnippet = (input: CreateSnippetInput): Snippet => {
  const title = input.title?.trim() ?? ''
  const body = input.body?.trim() ?? ''
  const tags = [...(input.tags ?? [])]

  const issues = validateSnippetDomainRules({
    title,
    body,
    tags,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  })

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

type UpdatableSnippetField =
  | 'title'
  | 'body'
  | 'shortcut'
  | 'description'
  | 'tags'
  | 'language'
  | 'isFavorite'
  | 'usageCount'
  | 'lastUsedAt'
  | 'libraryId'

export type UpdateSnippetChanges = Partial<Pick<Snippet, UpdatableSnippetField>>

export type UpdateSnippetOptions = {
  updatedAt?: Date
}

export const updateSnippet = (
  snippet: Snippet,
  changes: UpdateSnippetChanges,
  options: UpdateSnippetOptions = {}
): Snippet => {
  const nextTitleSource =
    hasOwn(changes, 'title') && changes.title !== undefined
      ? changes.title
      : snippet.title
  const title = (nextTitleSource ?? '').trim()

  const nextBodySource =
    hasOwn(changes, 'body') && changes.body !== undefined
      ? changes.body
      : snippet.body
  const body = (nextBodySource ?? '').trim()

  const tags = hasOwn(changes, 'tags')
    ? [...(changes.tags ?? snippet.tags)]
    : [...snippet.tags]

  const shortcut = hasOwn(changes, 'shortcut')
    ? changes.shortcut === undefined
      ? snippet.shortcut ?? null
      : changes.shortcut
    : snippet.shortcut ?? null

  const description = hasOwn(changes, 'description')
    ? changes.description === undefined
      ? snippet.description ?? null
      : changes.description
    : snippet.description ?? null

  const language = hasOwn(changes, 'language')
    ? changes.language === undefined
      ? snippet.language ?? null
      : changes.language
    : snippet.language ?? null

  const isFavorite = hasOwn(changes, 'isFavorite')
    ? changes.isFavorite ?? snippet.isFavorite
    : snippet.isFavorite

  const usageCount = hasOwn(changes, 'usageCount')
    ? changes.usageCount ?? snippet.usageCount
    : snippet.usageCount

  const lastUsedAt = hasOwn(changes, 'lastUsedAt')
    ? changes.lastUsedAt === undefined
      ? snippet.lastUsedAt ?? null
      : changes.lastUsedAt
    : snippet.lastUsedAt ?? null

  const libraryId = hasOwn(changes, 'libraryId')
    ? changes.libraryId ?? snippet.libraryId
    : snippet.libraryId

  const updatedAt = options.updatedAt ?? new Date()

  const nextSnippet: Snippet = {
    ...snippet,
    title,
    body,
    tags,
    shortcut,
    description,
    language,
    isFavorite,
    usageCount,
    lastUsedAt,
    libraryId,
    updatedAt,
  }

  const issues = validateSnippetDomainRules({
    title: nextSnippet.title,
    body: nextSnippet.body,
    tags: nextSnippet.tags,
    createdAt: nextSnippet.createdAt,
    updatedAt: nextSnippet.updatedAt,
  })

  if (issues.length > 0) {
    throw new SnippetValidationError(issues)
  }

  return nextSnippet
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

const hasOwn = <K extends keyof UpdateSnippetChanges>(
  changes: UpdateSnippetChanges,
  key: K,
): boolean => Object.prototype.hasOwnProperty.call(changes, key)
