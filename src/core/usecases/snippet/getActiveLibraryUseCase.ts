import type {
  LibraryId,
  SnippetLibrary,
  UserPreferencesGateway,
} from '../../domain/snippet'

export type GetActiveLibraryUseCaseInput = {
  availableLibraries: SnippetLibrary[]
  fallbackLibraryId?: LibraryId | null
}

export type GetActiveLibraryUseCaseDependencies = {
  preferencesGateway: UserPreferencesGateway
}

export class GetActiveLibraryUseCase {
  private readonly preferencesGateway: UserPreferencesGateway

  constructor(deps: GetActiveLibraryUseCaseDependencies) {
    this.preferencesGateway = deps.preferencesGateway
  }

  async execute(input: GetActiveLibraryUseCaseInput): Promise<LibraryId | null> {
    const preferences = await this.preferencesGateway.getPreferences()
    const candidate = preferences?.defaultLibraryId ?? input.fallbackLibraryId ?? null
    if (!candidate) return null

    const exists = input.availableLibraries.some(library => library.id === candidate)
    return exists ? candidate : input.fallbackLibraryId ?? null
  }
}
