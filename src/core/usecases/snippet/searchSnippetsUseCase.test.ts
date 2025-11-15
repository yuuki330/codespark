import { describe, expect, it } from 'vitest'

import type { Snippet } from '../../domain/snippet'
import { InMemorySnippetDataAccessAdapter } from '../../data-access/snippet'
import { SearchSnippetsUseCase } from './searchSnippetsUseCase'

const baseDate = new Date('2024-01-01T00:00:00Z')

const createSnippet = (input: Partial<Snippet> & { id: string; title: string; body: string }): Snippet => ({
  id: input.id,
  title: input.title,
  body: input.body,
  tags: input.tags ?? [],
  shortcut: input.shortcut ?? null,
  description: input.description ?? null,
  language: input.language ?? null,
  isFavorite: input.isFavorite ?? false,
  usageCount: input.usageCount ?? 0,
  lastUsedAt: input.lastUsedAt ?? null,
  libraryId: input.libraryId ?? 'personal',
  createdAt: input.createdAt ?? baseDate,
  updatedAt: input.updatedAt ?? baseDate,
})

const createUseCase = (snippets: Snippet[], overrides?: { now?: () => Date }) =>
  new SearchSnippetsUseCase({
    snippetGateway: new InMemorySnippetDataAccessAdapter(snippets),
    ...overrides,
  })

describe('SearchSnippetsUseCase', () => {
  it('prioritizes shortcut matches over other signals', async () => {
    const useCase = createUseCase([
      createSnippet({
        id: 'shortcut-match',
        title: 'Deploy command',
        body: 'deploy with script',
        shortcut: 'deploy',
        usageCount: 5,
      }),
      createSnippet({
        id: 'favorite-match',
        title: 'Deploy favorite',
        body: 'deploy favorite',
        isFavorite: true,
      }),
      createSnippet({
        id: 'title-match',
        title: 'Deploy via CLI',
        body: 'cli deploy',
      }),
    ])

    const results = await useCase.execute({ query: 'deploy' })
    expect(results.map(result => result.snippet.id)).toEqual([
      'shortcut-match',
      'favorite-match',
      'title-match',
    ])
    expect(results[0].score).toBeGreaterThan(results[1].score)
  })

  it('filters by library ids when provided', async () => {
    const useCase = createUseCase([
      createSnippet({
        id: 'personal-api',
        title: 'API call personal',
        body: 'api request',
        libraryId: 'personal',
      }),
      createSnippet({
        id: 'team-api',
        title: 'API call team',
        body: 'api request team',
        libraryId: 'team',
        tags: ['api', 'team'],
      }),
    ])

    const results = await useCase.execute({ query: 'api', libraryIds: ['team'] })
    expect(results).toHaveLength(1)
    expect(results[0].snippet.id).toBe('team-api')
  })

  it('requires all selected tags to be present', async () => {
    const useCase = createUseCase([
      createSnippet({
        id: 'redis-cache',
        title: 'Redis cache priming',
        body: 'cache warmup',
        tags: ['redis', 'cache'],
      }),
      createSnippet({
        id: 'redis-only',
        title: 'Redis helpers',
        body: 'redis script',
        tags: ['redis'],
      }),
    ])

    const results = await useCase.execute({ query: 'cache', tags: ['redis', 'cache'] })
    expect(results).toHaveLength(1)
    expect(results[0].snippet.id).toBe('redis-cache')
  })

  it('uses usageCount and recency bonuses to break ties', async () => {
    const recent = new Date('2024-01-05T00:00:00Z')
    const older = new Date('2024-01-02T00:00:00Z')
    const useCase = createUseCase(
      [
        createSnippet({
          id: 'high-usage',
          title: 'Logger setup',
          body: 'logger info',
          tags: ['log'],
          usageCount: 20,
          lastUsedAt: older,
        }),
        createSnippet({
          id: 'recent',
          title: 'Logger advanced',
          body: 'logger debug',
          tags: ['log'],
          usageCount: 5,
          lastUsedAt: recent,
        }),
      ],
      { now: () => new Date('2024-01-06T00:00:00Z') }
    )

    const results = await useCase.execute({ query: 'log' })
    expect(results.map(result => result.snippet.id)).toEqual(['high-usage', 'recent'])
    expect(results[0].score).toBeGreaterThan(results[1].score)
  })
})
