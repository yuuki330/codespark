import { describe, expect, it } from 'vitest'

import type {
  SnippetLibrary,
  SnippetLibraryDataAccessAdapter,
  UserPreferences,
  UserPreferencesGateway,
} from '../../domain/snippet'
import { SwitchActiveLibraryUseCase } from './switchActiveLibraryUseCase'

class FakeLibraryGateway implements SnippetLibraryDataAccessAdapter {
  constructor(private readonly libraries: SnippetLibrary[]) {}

  async getLibraries(): Promise<SnippetLibrary[]> {
    return this.libraries
  }
}

class SpyPreferencesGateway implements UserPreferencesGateway {
  saved: UserPreferences | null = null
  constructor(private prefs: UserPreferences | null = null) {}

  async getPreferences(): Promise<UserPreferences | null> {
    return this.prefs
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    this.saved = preferences
    this.prefs = preferences
  }
}

const libraries: SnippetLibrary[] = [
  { id: 'personal', name: 'Personal', isReadOnly: false, category: 'PERSONAL' },
  { id: 'team', name: 'Team', isReadOnly: true, category: 'TEAM' },
]

describe('SwitchActiveLibraryUseCase', () => {
  it('saves the provided library id', async () => {
    const gateway = new SpyPreferencesGateway()
    const useCase = new SwitchActiveLibraryUseCase({
      libraryGateway: new FakeLibraryGateway(libraries),
      preferencesGateway: gateway,
    })

    const result = await useCase.execute({ libraryId: 'personal' })

    expect(result.defaultLibraryId).toBe('personal')
    expect(gateway.saved?.defaultLibraryId).toBe('personal')
  })

  it('allows clearing the selection by passing null', async () => {
    const gateway = new SpyPreferencesGateway({
      defaultLibraryId: 'personal',
      theme: 'system',
      globalShortcut: null,
    })

    const useCase = new SwitchActiveLibraryUseCase({
      libraryGateway: new FakeLibraryGateway(libraries),
      preferencesGateway: gateway,
    })

    const result = await useCase.execute({ libraryId: null })

    expect(result.defaultLibraryId).toBeNull()
    expect(gateway.saved?.defaultLibraryId).toBeNull()
  })

  it('throws when the library does not exist', async () => {
    const gateway = new SpyPreferencesGateway()
    const useCase = new SwitchActiveLibraryUseCase({
      libraryGateway: new FakeLibraryGateway(libraries),
      preferencesGateway: gateway,
    })

    await expect(useCase.execute({ libraryId: 'unknown' })).rejects.toThrow('library unknown not found')
  })
})
