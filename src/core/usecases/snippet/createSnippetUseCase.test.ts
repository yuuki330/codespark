import { describe, expect, it, vi } from 'vitest'

import {
  SnippetValidationError,
  type LibraryId,
  type Snippet,
  type SnippetDataAccessAdapter,
  type SnippetId,
} from '../../domain/snippet'
import { CreateSnippetUseCase } from './createSnippetUseCase'

class SpySnippetGateway implements SnippetDataAccessAdapter {
  readonly savedSnippets: Snippet[] = []

  async getAll(): Promise<Snippet[]> {
    return []
  }

  async getById(): Promise<Snippet | null> {
    return null
  }

  async save(snippet: Snippet): Promise<void> {
    this.savedSnippets.push(snippet)
  }

  async delete(): Promise<void> {
    // noop
  }
}

const fixedNow = new Date('2024-02-01T12:00:00Z')

const createUseCase = (options?: {
  gateway?: SpySnippetGateway
  defaultLibraryId?: LibraryId
  generateId?: () => SnippetId
  now?: () => Date
}) => {
  const gateway = options?.gateway ?? new SpySnippetGateway()
  const generateId = options?.generateId ?? vi.fn<() => SnippetId>(() => 'snippet-id')

  return {
    gateway,
    useCase: new CreateSnippetUseCase({
      snippetGateway: gateway,
      generateId,
      defaultLibraryId: options?.defaultLibraryId,
      now: options?.now ?? (() => fixedNow),
    }),
  }
}

describe('CreateSnippetUseCase', () => {
  it('constructs a snippet and persists it via the gateway', async () => {
    const { useCase, gateway } = createUseCase()

    const result = await useCase.execute({
      title: 'New snippet',
      body: 'console.log("hi")',
      tags: ['ts'],
      shortcut: 'ns',
      description: 'Sample',
      language: 'typescript',
      libraryId: 'personal',
      isFavorite: true,
    })

    expect(result.id).toBe('snippet-id')
    expect(result.createdAt).toEqual(fixedNow)
    expect(result.updatedAt).toEqual(fixedNow)
    expect(result.usageCount).toBe(0)
    expect(result.lastUsedAt).toBeNull()
    expect(gateway.savedSnippets).toHaveLength(1)
    expect(gateway.savedSnippets[0]).toEqual(result)
  })

  it('applies default library when not provided', async () => {
    const { useCase } = createUseCase({ defaultLibraryId: 'team' })

    const result = await useCase.execute({
      title: 'Team note',
      body: 'body',
    })

    expect(result.libraryId).toBe('team')
  })

  it('throws when neither libraryId nor defaultLibraryId is provided', async () => {
    const { useCase, gateway } = createUseCase()

    await expect(
      useCase.execute({
        title: 'Missing library',
        body: 'body',
      }),
    ).rejects.toThrowError('libraryId is required')

    expect(gateway.savedSnippets).toHaveLength(0)
  })

  it('propagates validation errors and does not persist invalid snippets', async () => {
    const { useCase, gateway } = createUseCase({ defaultLibraryId: 'personal' })

    await expect(
      useCase.execute({
        title: '',
        body: '',
      }),
    ).rejects.toBeInstanceOf(SnippetValidationError)

    expect(gateway.savedSnippets).toHaveLength(0)
  })
})
