import { describe, expect, it, vi } from 'vitest'

import type { ClipboardGateway, Snippet, SnippetDataAccessAdapter, SnippetId } from '../../domain/snippet'
import { SnippetNotFoundError } from '../../domain/snippet'
import { CopySnippetUseCase } from './copySnippetUseCase'

class InMemoryGateway implements SnippetDataAccessAdapter {
  private readonly records = new Map<SnippetId, Snippet>()

  constructor(snippets: Snippet[]) {
    snippets.forEach(snippet => this.records.set(snippet.id, { ...snippet }))
  }

  async getAll(): Promise<Snippet[]> {
    return Array.from(this.records.values()).map(snippet => ({ ...snippet }))
  }

  async getById(id: SnippetId): Promise<Snippet | null> {
    const match = this.records.get(id)
    return match ? { ...match } : null
  }

  async save(snippet: Snippet): Promise<void> {
    this.records.set(snippet.id, { ...snippet })
  }

  async delete(id: SnippetId): Promise<void> {
    this.records.delete(id)
  }
}

class StubClipboardGateway implements ClipboardGateway {
  readonly copyText = vi.fn<[], Promise<void>>(() => Promise.resolve())
}

const createSnippet = (overrides: Partial<Snippet> = {}): Snippet => ({
  id: overrides.id ?? 'snippet-id',
  title: overrides.title ?? 'title',
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

describe('CopySnippetUseCase', () => {
  it('increments usage fields and persists updates', async () => {
    const snippet = createSnippet({ id: 'python', body: 'print("hi")' })
    const gateway = new InMemoryGateway([snippet])
    const clipboard = new StubClipboardGateway()
    const now = new Date('2024-02-01T10:00:00Z')

    const useCase = new CopySnippetUseCase({
      snippetGateway: gateway,
      clipboardGateway: clipboard,
      now: () => now,
    })

    const result = await useCase.execute({ snippetId: snippet.id })

    expect(clipboard.copyText).toHaveBeenCalledWith('print("hi")')
    expect(result.usageCount).toBe(1)
    expect(result.lastUsedAt).toEqual(now)
    expect(result.updatedAt).toEqual(now)

    const persisted = await gateway.getById(snippet.id)
    expect(persisted?.usageCount).toBe(1)
  })

  it('throws SnippetNotFoundError when id is missing', async () => {
    const gateway = new InMemoryGateway([])
    const clipboard = new StubClipboardGateway()
    const useCase = new CopySnippetUseCase({
      snippetGateway: gateway,
      clipboardGateway: clipboard,
    })

    await expect(useCase.execute({ snippetId: 'missing' })).rejects.toBeInstanceOf(SnippetNotFoundError)
  })
})
