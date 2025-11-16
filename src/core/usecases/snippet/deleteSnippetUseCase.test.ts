import { describe, expect, it } from 'vitest'

import type {
  Snippet,
  SnippetDataAccessAdapter,
  SnippetId,
  SnippetLibrary,
  SnippetLibraryDataAccessAdapter,
} from '../../domain/snippet'
import {
  ReadOnlyLibraryViolationError,
  SnippetNotFoundError,
} from '../../domain/snippet'
import { DeleteSnippetUseCase } from './deleteSnippetUseCase'

const personalLibrary: SnippetLibrary = {
  id: 'personal',
  name: 'Personal',
  description: '',
  isReadOnly: false,
  category: 'PERSONAL',
}

const teamLibrary: SnippetLibrary = {
  id: 'team',
  name: 'Team',
  description: '',
  isReadOnly: true,
  category: 'TEAM',
}

const createSnippet = (overrides: Partial<Snippet> & { id: SnippetId }): Snippet => ({
  id: overrides.id,
  title: overrides.title ?? 'snippet',
  body: overrides.body ?? 'body',
  tags: overrides.tags ?? [],
  shortcut: overrides.shortcut ?? null,
  description: overrides.description ?? null,
  language: overrides.language ?? null,
  isFavorite: overrides.isFavorite ?? false,
  usageCount: overrides.usageCount ?? 0,
  lastUsedAt: overrides.lastUsedAt ?? null,
  libraryId: overrides.libraryId ?? 'personal',
  createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
  updatedAt: overrides.updatedAt ?? new Date('2024-01-01T00:00:00Z'),
})

class StubGateway
  implements SnippetDataAccessAdapter, SnippetLibraryDataAccessAdapter
{
  private readonly snippets = new Map<SnippetId, Snippet>()
  private readonly libraries: SnippetLibrary[]

  constructor(initialSnippets: Snippet[], libraries: SnippetLibrary[]) {
    initialSnippets.forEach(snippet => this.snippets.set(snippet.id, { ...snippet }))
    this.libraries = libraries
  }

  async getAll(): Promise<Snippet[]> {
    return Array.from(this.snippets.values()).map(snippet => ({ ...snippet }))
  }

  async getById(id: SnippetId): Promise<Snippet | null> {
    const snippet = this.snippets.get(id)
    return snippet ? { ...snippet } : null
  }

  async save(snippet: Snippet): Promise<void> {
    this.snippets.set(snippet.id, { ...snippet })
  }

  async delete(id: SnippetId): Promise<void> {
    this.snippets.delete(id)
  }

  async getLibraries(): Promise<SnippetLibrary[]> {
    return this.libraries
  }
}

describe('DeleteSnippetUseCase', () => {
  it('deletes an existing snippet and returns it', async () => {
    const snippet = createSnippet({ id: 'python' })
    const gateway = new StubGateway([snippet], [personalLibrary])
    const useCase = new DeleteSnippetUseCase({
      snippetGateway: gateway,
      libraryGateway: gateway,
    })

    const result = await useCase.execute({ snippetId: 'python' })
    expect(result.deletedSnippet.id).toBe('python')
    expect(await gateway.getById('python')).toBeNull()
  })

  it('throws SnippetNotFoundError when id is unknown', async () => {
    const gateway = new StubGateway([], [personalLibrary])
    const useCase = new DeleteSnippetUseCase({
      snippetGateway: gateway,
      libraryGateway: gateway,
    })

    await expect(useCase.execute({ snippetId: 'missing' })).rejects.toBeInstanceOf(
      SnippetNotFoundError
    )
  })

  it('blocks deleting snippets from read-only libraries', async () => {
    const snippet = createSnippet({ id: 'team-snippet', libraryId: 'team' })
    const gateway = new StubGateway([snippet], [personalLibrary, teamLibrary])
    const useCase = new DeleteSnippetUseCase({
      snippetGateway: gateway,
      libraryGateway: gateway,
    })

    await expect(useCase.execute({ snippetId: 'team-snippet' })).rejects.toBeInstanceOf(
      ReadOnlyLibraryViolationError
    )
    expect(await gateway.getById('team-snippet')).not.toBeNull()
  })
})
