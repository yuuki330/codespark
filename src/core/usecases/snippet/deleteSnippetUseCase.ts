import type {
  Snippet,
  SnippetDataAccessAdapter,
  SnippetId,
  SnippetLibraryDataAccessAdapter,
} from '../../domain/snippet'
import {
  ReadOnlyLibraryViolationError,
  SnippetNotFoundError,
} from '../../domain/snippet'

export type DeleteSnippetUseCaseInput = {
  snippetId: SnippetId
}

export type DeleteSnippetUseCaseOutput = {
  deletedSnippet: Snippet
}

export type DeleteSnippetUseCaseDependencies = {
  snippetGateway: SnippetDataAccessAdapter
  libraryGateway: SnippetLibraryDataAccessAdapter
}

export class DeleteSnippetUseCase {
  private readonly snippetGateway: SnippetDataAccessAdapter
  private readonly libraryGateway: SnippetLibraryDataAccessAdapter

  constructor(deps: DeleteSnippetUseCaseDependencies) {
    this.snippetGateway = deps.snippetGateway
    this.libraryGateway = deps.libraryGateway
  }

  async execute(input: DeleteSnippetUseCaseInput): Promise<DeleteSnippetUseCaseOutput> {
    const snippet = await this.snippetGateway.getById(input.snippetId)
    if (!snippet) {
      throw new SnippetNotFoundError(input.snippetId)
    }

    await this.assertWritable(snippet.libraryId)
    await this.snippetGateway.delete(snippet.id)

    return { deletedSnippet: snippet }
  }

  private async assertWritable(libraryId: string): Promise<void> {
    const libraries = await this.libraryGateway.getLibraries()
    const target = libraries.find(library => library.id === libraryId)
    if (target?.isReadOnly) {
      throw new ReadOnlyLibraryViolationError(libraryId)
    }
  }
}
