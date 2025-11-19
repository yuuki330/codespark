import { describe, expect, it } from 'vitest'

import type {
  SnippetLibrary,
  UserPreferences,
  UserPreferencesGateway,
} from '../../domain/snippet'
import { GetActiveLibraryUseCase } from './getActiveLibraryUseCase'

class FakePreferencesGateway implements UserPreferencesGateway {
  constructor(private prefs: UserPreferences | null) {}

  async getPreferences(): Promise<UserPreferences | null> {
    return this.prefs
  }

  async savePreferences(): Promise<void> {}
}

const libraries: SnippetLibrary[] = [
  { id: 'personal', name: 'Personal', isReadOnly: false, category: 'PERSONAL' },
  { id: 'team', name: 'Team', isReadOnly: true, category: 'TEAM' },
]

describe('GetActiveLibraryUseCase', () => {
  it('returns preference when library exists', async () => {
    const gateway = new FakePreferencesGateway({
      defaultLibraryId: 'team',
      theme: 'system',
      globalShortcut: null,
    })

    const useCase = new GetActiveLibraryUseCase({ preferencesGateway: gateway })
    const result = await useCase.execute({ availableLibraries: libraries })

    expect(result).toBe('team')
  })

  it('falls back when preference library is missing', async () => {
    const gateway = new FakePreferencesGateway({
      defaultLibraryId: 'unknown',
      theme: 'dark',
      globalShortcut: null,
    })

    const useCase = new GetActiveLibraryUseCase({ preferencesGateway: gateway })
    const result = await useCase.execute({ availableLibraries: libraries, fallbackLibraryId: 'personal' })

    expect(result).toBe('personal')
  })

  it('returns null when nothing available', async () => {
    const gateway = new FakePreferencesGateway(null)
    const useCase = new GetActiveLibraryUseCase({ preferencesGateway: gateway })
    const result = await useCase.execute({ availableLibraries: libraries })

    expect(result).toBeNull()
  })
})
