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
import { UpdateSnippetUseCase } from './updateSnippetUseCase'

const personalLibrary: SnippetLibrary = {
  id: 'personal',
  name: 'Personal',
  description: '個人',
  isReadOnly: false,
  category: 'PERSONAL',
}

const teamLibrary: SnippetLibrary = {
  id: 'team',
  name: 'Team',
  description: '共有',
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

describe('UpdateSnippetUseCase', () => {
  it('updates fields and timestamps when snippet exists', async () => {
    const snippet = createSnippet({ id: 'ts-snippet', title: 'Old title', body: 'const n = 1' })
    const gateway = new StubGateway([snippet], [personalLibrary])
    const now = new Date('2024-03-10T00:00:00Z')

    const useCase = new UpdateSnippetUseCase({
      snippetGateway: gateway,
      libraryGateway: gateway,
      now: () => now,
    })

    const updated = await useCase.execute({
      snippetId: 'ts-snippet',
      updates: { title: 'Updated title', tags: ['typescript'] },
    })

    expect(updated.title).toBe('Updated title')
    expect(updated.tags).toEqual(['typescript'])
    expect(updated.updatedAt).toEqual(now)
    expect(await gateway.getById('ts-snippet')).toMatchObject({ title: 'Updated title' })
  })

  it('throws SnippetNotFoundError when the id is unknown', async () => {
    const gateway = new StubGateway([], [personalLibrary])
    const useCase = new UpdateSnippetUseCase({
      snippetGateway: gateway,
      libraryGateway: gateway,
    })

    await expect(
      useCase.execute({ snippetId: 'missing', updates: { title: 'x' } })
    ).rejects.toBeInstanceOf(SnippetNotFoundError)
  })

  it('blocks updates targeting read-only libraries', async () => {
    const snippet = createSnippet({ id: 'team-snippet', libraryId: 'team' })
    const gateway = new StubGateway([snippet], [personalLibrary, teamLibrary])
    const useCase = new UpdateSnippetUseCase({
      snippetGateway: gateway,
      libraryGateway: gateway,
    })

    await expect(
      useCase.execute({ snippetId: 'team-snippet', updates: { title: 'x' } })
    ).rejects.toBeInstanceOf(ReadOnlyLibraryViolationError)
  })

  it('prevents moving a snippet into a read-only library', async () => {
    const snippet = createSnippet({ id: 'movable', libraryId: 'personal' })
    const gateway = new StubGateway([snippet], [personalLibrary, teamLibrary])
    const useCase = new UpdateSnippetUseCase({
      snippetGateway: gateway,
      libraryGateway: gateway,
    })

    await expect(
      useCase.execute({ snippetId: 'movable', updates: { libraryId: 'team' } })
    ).rejects.toBeInstanceOf(ReadOnlyLibraryViolationError)
  })
})
