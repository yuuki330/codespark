import { describe, expect, it, vi } from 'vitest'

import type {
  ClipboardGateway,
  Snippet,
  SnippetDataAccessAdapter,
  SnippetId,
} from '../../domain/snippet'
import {
  ClipboardCopyError,
  SnippetNotFoundError,
} from '../../domain/snippet'
import { CopySnippetUseCase } from './copySnippetUseCase'

const createSnippet = (overrides: Partial<Snippet> & { id: SnippetId }): Snippet => ({
  id: overrides.id,
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

class SpySnippetGateway implements SnippetDataAccessAdapter {
  private readonly records = new Map<SnippetId, Snippet>()

  constructor(initialSnippets: Snippet[]) {
    initialSnippets.forEach(snippet => this.records.set(snippet.id, { ...snippet }))
  }

  async getAll(): Promise<Snippet[]> {
    return Array.from(this.records.values()).map(snippet => ({ ...snippet }))
  }

  async getById(id: SnippetId): Promise<Snippet | null> {
    const snippet = this.records.get(id)
    return snippet ? { ...snippet } : null
  }

  async save(snippet: Snippet): Promise<void> {
    this.records.set(snippet.id, { ...snippet })
  }

  async delete(id: SnippetId): Promise<void> {
    this.records.delete(id)
  }
}

class StubClipboardGateway implements ClipboardGateway {
  readonly copyText = vi.fn((_text: string) => Promise.resolve())
}

describe('CopySnippetUseCase', () => {
  it('increments usage statistics and persists the snippet', async () => {
    const snippet = createSnippet({ id: 'typescript', body: 'console.log("hi")' })
    const gateway = new SpySnippetGateway([snippet])
    const clipboard = new StubClipboardGateway()
    const now = new Date('2024-02-01T00:00:00Z')

    const useCase = new CopySnippetUseCase({
      snippetGateway: gateway,
      clipboardGateway: clipboard,
      now: () => now,
    })

    const updated = await useCase.execute({ snippetId: snippet.id })

    expect(clipboard.copyText).toHaveBeenCalledWith('console.log("hi")')
    expect(updated.usageCount).toBe(1)
    expect(updated.lastUsedAt).toEqual(now)
    expect(updated.updatedAt).toEqual(now)

    const persisted = await gateway.getById(snippet.id)
    expect(persisted?.usageCount).toBe(1)
  })

  it('throws SnippetNotFoundError when id is missing', async () => {
    const gateway = new SpySnippetGateway([])
    const clipboard = new StubClipboardGateway()

    const useCase = new CopySnippetUseCase({
      snippetGateway: gateway,
      clipboardGateway: clipboard,
    })

    await expect(useCase.execute({ snippetId: 'missing' })).rejects.toBeInstanceOf(SnippetNotFoundError)
  })

  it('wraps clipboard failures into ClipboardCopyError', async () => {
    const snippet = createSnippet({ id: 'rust', body: 'println!("hi");' })
    const gateway = new SpySnippetGateway([snippet])
    const clipboard = new StubClipboardGateway()
    clipboard.copyText.mockRejectedValueOnce(new Error('permission denied'))

    const useCase = new CopySnippetUseCase({
      snippetGateway: gateway,
      clipboardGateway: clipboard,
    })

    await expect(useCase.execute({ snippetId: 'rust' })).rejects.toBeInstanceOf(ClipboardCopyError)
    const persisted = await gateway.getById('rust')
    expect(persisted?.usageCount).toBe(0)
  })
})
