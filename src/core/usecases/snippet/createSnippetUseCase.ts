import {
  constructSnippet,
  type LibraryId,
  type Snippet,
  type SnippetDataAccessAdapter,
  type SnippetId,
  type TagName,
} from '../../domain/snippet'

export type CreateSnippetUseCaseInput = {
  title: string
  body: string
  shortcut?: string | null
  description?: string | null
  tags?: TagName[]
  language?: string | null
  libraryId?: LibraryId
  isFavorite?: boolean
}

export type CreateSnippetUseCaseDependencies = {
  snippetGateway: SnippetDataAccessAdapter
  generateId: () => SnippetId
  now?: () => Date
  defaultLibraryId?: LibraryId
}

/**
 * 新規スニペットを作成して保存するユースケース。
 * constructSnippet を通じてドメインルールを検証し、成功したら永続化する。
 */
export class CreateSnippetUseCase {
  private readonly snippetGateway: SnippetDataAccessAdapter
  private readonly generateId: () => SnippetId
  private readonly now: () => Date
  private readonly defaultLibraryId?: LibraryId

  constructor(deps: CreateSnippetUseCaseDependencies) {
    this.snippetGateway = deps.snippetGateway
    this.generateId = deps.generateId
    this.now = deps.now ?? (() => new Date())
    this.defaultLibraryId = deps.defaultLibraryId
  }

  async execute(input: CreateSnippetUseCaseInput): Promise<Snippet> {
    const timestamp = this.now()
    const libraryId = input.libraryId ?? this.defaultLibraryId

    if (!libraryId) {
      throw new Error('libraryId is required when no defaultLibraryId is configured')
    }

    const snippet = constructSnippet({
      id: this.generateId(),
      title: input.title,
      body: input.body,
      shortcut: input.shortcut ?? null,
      description: input.description ?? null,
      tags: input.tags ?? [],
      language: input.language ?? null,
      isFavorite: input.isFavorite ?? false,
      usageCount: 0,
      lastUsedAt: null,
      libraryId,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    await this.snippetGateway.save(snippet)
    return snippet
  }
}
