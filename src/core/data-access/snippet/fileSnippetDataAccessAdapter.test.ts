import { describe, expect, it } from 'vitest'

import type { Snippet } from '../../domain/snippet'
import { ReadOnlyLibraryError, FileSnippetDataAccessAdapter } from './fileSnippetDataAccessAdapter'

type SerializedSnippet = {
  id: string
  title: string
  body: string
  tags: string[]
  shortcut: string | null
  description: string | null
  language: string | null
  isFavorite: boolean
  usageCount: number
  lastUsedAt: string | null
  libraryId: string
  createdAt: string
  updatedAt: string
}

type MemoryStore = {
  version: number
  snippets: SerializedSnippet[]
}

type MemoryFs = ReturnType<typeof createMemoryFs>

const baseSnippet: Snippet = {
  id: 'team-snippet',
  title: 'Team snippet',
  body: 'body',
  tags: [],
  shortcut: null,
  description: null,
  language: null,
  isFavorite: false,
  usageCount: 0,
  lastUsedAt: null,
  libraryId: 'team',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
}

const writableLibrary = {
  id: 'personal',
  name: 'Personal',
  description: '',
  isReadOnly: false,
  category: 'PERSONAL' as const,
}

const readOnlyLibrary = {
  id: 'team',
  name: 'Team',
  description: '',
  isReadOnly: true,
  category: 'TEAM' as const,
}

function createMemoryFs(initial?: MemoryStore) {
  let exists = Boolean(initial)
  let contents = initial ? JSON.stringify(initial) : ''
  const ensureDir = () => Promise.resolve()

  return {
    readFile: () => Promise.resolve(contents),
    writeFile: ({ contents: next }: { contents: string }) => {
      contents = next
      exists = true
      return Promise.resolve()
    },
    exists: () => Promise.resolve(exists),
    ensureDir: () => Promise.resolve(),
  }
}

describe('FileSnippetDataAccessAdapter ReadOnly protections', () => {
  it('throws when saving to ReadOnly library', async () => {
    const adapter = new FileSnippetDataAccessAdapter({
      libraries: [writableLibrary, readOnlyLibrary],
      fs: createMemoryFs(),
    })

    await expect(adapter.save(baseSnippet)).rejects.toBeInstanceOf(ReadOnlyLibraryError)
  })

  it('throws when deleting from ReadOnly library', async () => {
    const now = new Date().toISOString()
    const fs = createMemoryFs({
      version: 1,
      snippets: [
        {
          id: baseSnippet.id,
          title: baseSnippet.title,
          body: baseSnippet.body,
          tags: [],
          shortcut: null,
          description: null,
          language: null,
          isFavorite: false,
          usageCount: 0,
          lastUsedAt: null,
          libraryId: 'team',
          createdAt: now,
          updatedAt: now,
        },
      ],
    })

    const adapter = new FileSnippetDataAccessAdapter({
      libraries: [writableLibrary, readOnlyLibrary],
      fs,
    })

    await expect(adapter.delete(baseSnippet.id)).rejects.toBeInstanceOf(ReadOnlyLibraryError)
  })
})
