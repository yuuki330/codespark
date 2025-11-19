import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Snippet } from '../../core/domain/snippet'
import { SnippetList } from '../SnippetList'

describe('SnippetList', () => {
  const mockScrollIntoView = vi.fn()

  beforeEach(() => {
    mockScrollIntoView.mockClear()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: mockScrollIntoView,
    })
  })

  it('scrolls selected snippet into view', () => {
    const snippets: Snippet[] = [
      {
        id: 'a',
        title: 'Snippet A',
        body: 'body A',
        tags: ['ts'],
        shortcut: 'a',
        description: null,
        language: 'ts',
        isFavorite: false,
        usageCount: 0,
        lastUsedAt: null,
        libraryId: 'personal',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'b',
        title: 'Snippet B',
        body: 'body B',
        tags: ['ts'],
        shortcut: 'b',
        description: null,
        language: 'ts',
        isFavorite: false,
        usageCount: 0,
        lastUsedAt: null,
        libraryId: 'personal',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    render(
      <SnippetList
        snippets={snippets}
        selectedSnippetId='b'
        copiedSnippetId={null}
        mode='search'
        onSelect={() => {}}
        onHover={() => {}}
      />
    )

    expect(mockScrollIntoView).toHaveBeenCalled()
  })
})
