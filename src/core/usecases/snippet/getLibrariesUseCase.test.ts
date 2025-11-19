import { describe, expect, it } from 'vitest'

import type { SnippetLibrary, SnippetLibraryDataAccessAdapter } from '../../domain/snippet'
import { GetLibrariesUseCase } from './getLibrariesUseCase'

class FakeLibraryGateway implements SnippetLibraryDataAccessAdapter {
  constructor(private readonly libraries: SnippetLibrary[]) {}

  async getLibraries(): Promise<SnippetLibrary[]> {
    return this.libraries
  }
}

describe('GetLibrariesUseCase', () => {
  it('returns libraries from the gateway as-is', async () => {
    const gateway = new FakeLibraryGateway([
      { id: 'personal', name: 'Personal', isReadOnly: false, category: 'PERSONAL' },
      { id: 'team', name: 'Team', isReadOnly: true, category: 'TEAM' },
    ])

    const useCase = new GetLibrariesUseCase({ libraryGateway: gateway })
    const result = await useCase.execute()

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('personal')
    expect(result[1].id).toBe('team')
  })
})
