import { describe, expect, it } from 'vitest'

import type { Snippet, SnippetDataAccessAdapter } from '../../domain/snippet'
import { GetTopSnippetsForEmptyQueryUseCase } from './getTopSnippetsForEmptyQueryUseCase'

class StubGateway implements SnippetDataAccessAdapter {
  constructor(private readonly snippets: Snippet[]) {}

  async getAll(): Promise<Snippet[]> {
    return this.snippets.map(snippet => ({ ...snippet }))
  }

  async getById(): Promise<Snippet | null> {
    return null
  }

  async save(): Promise<void> {}

  async delete(): Promise<void> {}
}

const baseDate = new Date('2024-01-01T00:00:00Z')

const buildSnippet = (overrides: Partial<Snippet> & { id: string; title: string; libraryId?: string }): Snippet => ({
  id: overrides.id,
  title: overrides.title,
  body: overrides.body ?? overrides.title,
  tags: overrides.tags ?? [],
  shortcut: overrides.shortcut ?? null,
  description: overrides.description ?? null,
  language: overrides.language ?? null,
  isFavorite: overrides.isFavorite ?? false,
  usageCount: overrides.usageCount ?? 0,
  lastUsedAt: overrides.lastUsedAt ?? null,
  libraryId: overrides.libraryId ?? 'personal',
  createdAt: overrides.createdAt ?? baseDate,
  updatedAt: overrides.updatedAt ?? baseDate,
})

describe('GetTopSnippetsForEmptyQueryUseCase', () => {
  it('prioritizes favorites and recent snippets', async () => {
    const now = new Date('2024-02-01T00:00:00Z')
    const gateway = new StubGateway([
      buildSnippet({ id: 'fav', title: 'Favorite', isFavorite: true, usageCount: 2 }),
      buildSnippet({ id: 'recent', title: 'Recent', lastUsedAt: new Date('2024-01-31T00:00:00Z'), usageCount: 1 }),
      buildSnippet({ id: 'regular', title: 'Regular', usageCount: 5 }),
    ])

    const useCase = new GetTopSnippetsForEmptyQueryUseCase({ snippetGateway: gateway, now: () => now })
    const results = await useCase.execute({ limit: 2 })

    expect(results.map(result => result.snippet.id)).toEqual(['fav', 'recent'])
  })

  it('respects tag and library filters', async () => {
    const gateway = new StubGateway([
      buildSnippet({ id: 'personal', title: 'Personal', tags: ['cli'], libraryId: 'personal', isFavorite: true }),
      buildSnippet({ id: 'team', title: 'Team', tags: ['ui'], libraryId: 'team', isFavorite: true }),
    ])

    const useCase = new GetTopSnippetsForEmptyQueryUseCase({ snippetGateway: gateway })
    const results = await useCase.execute({ libraryIds: ['team'], tags: ['ui'] })

    expect(results).toHaveLength(1)
    expect(results[0].snippet.id).toBe('team')
  })
})
