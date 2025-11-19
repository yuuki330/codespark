import type { SnippetLibrary, SnippetLibraryDataAccessAdapter } from '../../domain/snippet'

export type GetLibrariesUseCaseDependencies = {
  libraryGateway: SnippetLibraryDataAccessAdapter
}

export class GetLibrariesUseCase {
  private readonly libraryGateway: SnippetLibraryDataAccessAdapter

  constructor(deps: GetLibrariesUseCaseDependencies) {
    this.libraryGateway = deps.libraryGateway
  }

  async execute(): Promise<SnippetLibrary[]> {
    return this.libraryGateway.getLibraries()
  }
}
