import type {
  LibraryId,
  Snippet,
  SnippetDataAccessAdapter,
  SnippetId,
  SnippetLibraryDataAccessAdapter,
  TagName,
} from '../../domain/snippet'
import {
  ReadOnlyLibraryViolationError,
  SnippetNotFoundError,
  applySnippetUpdate,
} from '../../domain/snippet'

export type UpdateSnippetUseCaseInput = {
  snippetId: SnippetId
  updates: {
    title?: string
    body?: string
    tags?: TagName[]
    shortcut?: string | null
    description?: string | null
    language?: string | null
    isFavorite?: boolean
    libraryId?: LibraryId
  }
}

export type UpdateSnippetUseCaseDependencies = {
  snippetGateway: SnippetDataAccessAdapter
  libraryGateway: SnippetLibraryDataAccessAdapter
  now?: () => Date
}

export class UpdateSnippetUseCase {
  private readonly snippetGateway: SnippetDataAccessAdapter
  private readonly libraryGateway: SnippetLibraryDataAccessAdapter
  private readonly now: () => Date

  constructor(deps: UpdateSnippetUseCaseDependencies) {
    this.snippetGateway = deps.snippetGateway
    this.libraryGateway = deps.libraryGateway
    this.now = deps.now ?? (() => new Date())
  }

  async execute(input: UpdateSnippetUseCaseInput): Promise<Snippet> {
    const snippet = await this.snippetGateway.getById(input.snippetId)
    if (!snippet) {
      throw new SnippetNotFoundError(input.snippetId)
    }

    const targetLibraryId = input.updates.libraryId ?? snippet.libraryId
    await this.assertWritable(targetLibraryId)

    const updatedSnippet = applySnippetUpdate({
      snippet,
      patch: input.updates,
      updatedAt: this.now(),
    })

    await this.snippetGateway.save(updatedSnippet)
    return updatedSnippet
  }

  private async assertWritable(libraryId: LibraryId): Promise<void> {
    const libraries = await this.libraryGateway.getLibraries()
    const target = libraries.find(library => library.id === libraryId)
    if (target?.isReadOnly) {
      throw new ReadOnlyLibraryViolationError(libraryId)
    }
  }
}
