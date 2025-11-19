import type {
  LibraryId,
  SnippetLibraryDataAccessAdapter,
  UserPreferences,
  UserPreferencesGateway,
} from '../../domain/snippet'

export type SwitchActiveLibraryUseCaseInput = {
  libraryId: LibraryId | null
}

export type SwitchActiveLibraryUseCaseDependencies = {
  libraryGateway: SnippetLibraryDataAccessAdapter
  preferencesGateway: UserPreferencesGateway
}

export class SwitchActiveLibraryUseCase {
  private readonly libraryGateway: SnippetLibraryDataAccessAdapter
  private readonly preferencesGateway: UserPreferencesGateway

  constructor(deps: SwitchActiveLibraryUseCaseDependencies) {
    this.libraryGateway = deps.libraryGateway
    this.preferencesGateway = deps.preferencesGateway
  }

  async execute(input: SwitchActiveLibraryUseCaseInput): Promise<UserPreferences> {
    if (input.libraryId) {
      await this.assertLibraryExists(input.libraryId)
    }

    const current = (await this.preferencesGateway.getPreferences()) ?? {
      defaultLibraryId: null,
      theme: 'system' as const,
      globalShortcut: null,
    }

    const next: UserPreferences = {
      defaultLibraryId: input.libraryId,
      theme: current.theme,
      globalShortcut: current.globalShortcut ?? null,
    }

    await this.preferencesGateway.savePreferences(next)
    return next
  }

  private async assertLibraryExists(libraryId: LibraryId): Promise<void> {
    const libraries = await this.libraryGateway.getLibraries()
    const exists = libraries.some(library => library.id === libraryId)
    if (!exists) {
      throw new Error(`library ${libraryId} not found`)
    }
  }
}
