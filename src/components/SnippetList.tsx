import { useEffect, useRef, type MouseEvent } from 'react'

import type { Snippet } from '../core/domain/snippet'

type SnippetListProps = {
  snippets: Snippet[]
  selectedSnippetId: string | null
  copiedSnippetId: string | null
  mode: 'search' | 'suggestion'
  emptyMessage?: string
  onSelect: (snippet: Snippet) => void
  onHover: (index: number) => void
}

const truncateBody = (body: string): string => {
  const normalized = body.replace(/\s+/g, ' ').trim()
  return normalized.length > 80 ? `${normalized.slice(0, 80)}…` : normalized
}

export function SnippetList({
  snippets,
  selectedSnippetId,
  copiedSnippetId,
  onSelect,
  onHover,
  mode,
  emptyMessage = '検索結果がありません',
}: SnippetListProps) {
  if (snippets.length === 0) {
    return <div className='empty-state'>{emptyMessage}</div>
  }

  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const selectedIndex = snippets.findIndex(snippet => snippet.id === selectedSnippetId)
    if (selectedIndex === -1) return
    const target = itemRefs.current[selectedIndex]
    if (!target || typeof target.scrollIntoView !== 'function') return
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [snippets, selectedSnippetId])

  return (
    <div className='snippet-list' aria-live='polite'>
      {mode === 'suggestion' ? (
        <div className='snippet-panel__note'>お気に入りと最近使用のスニペットを表示しています</div>
      ) : null}
      {snippets.map((snippet, index) => {
        const isSelected = snippet.id === selectedSnippetId
        const isCopied = snippet.id === copiedSnippetId
        const className = ['snippet-item', isSelected ? 'is-selected' : '', isCopied ? 'is-copied' : '']
          .filter(Boolean)
          .join(' ')

        const handleClick = (event: MouseEvent<HTMLDivElement>) => {
          event.preventDefault()
          onSelect(snippet)
        }

        return (
          <div
            key={snippet.id}
            role='button'
            tabIndex={0}
            aria-pressed={isSelected}
            className={className}
            ref={element => {
              itemRefs.current[index] = element
            }}
            onMouseEnter={() => onHover(index)}
            onClick={handleClick}
          >
            <div className='snippet-item__title'>
              <span>{snippet.title}</span>
              {snippet.shortcut ? <span className='snippet-item__shortcut'>{snippet.shortcut}</span> : null}
            </div>
            <div className='snippet-item__tags'>
              {snippet.tags.map(tag => (
                <span key={tag} className='snippet-item__tag'>
                  {tag}
                </span>
              ))}
            </div>
            <div className='snippet-item__body'>{truncateBody(snippet.body)}</div>
          </div>
        )
      })}
    </div>
  )
}
