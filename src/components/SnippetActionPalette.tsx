import { useCallback, useEffect, useMemo, useState } from 'react'

type SnippetActionPaletteItem = {
  id: string
  label: string
  description?: string
  shortcutHint?: string
  onSelect: () => void | Promise<void>
}

type SnippetActionPaletteProps = {
  isOpen: boolean
  snippetTitle: string
  actions: SnippetActionPaletteItem[]
  onClose: () => void
}

export function SnippetActionPalette({
  isOpen,
  snippetTitle,
  actions,
  onClose,
}: SnippetActionPaletteProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const hasActions = actions.length > 0

  const invokeAction = useCallback((action?: SnippetActionPaletteItem) => {
    if (!action) return
    const result = action.onSelect()
    if (result instanceof Promise) {
      result.catch(error => {
        console.error('snippet action failed', error)
      })
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setHighlightedIndex(0)
  }, [isOpen, actions.length])

  useEffect(() => {
    if (!isOpen || !hasActions) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key === 'ArrowDown' || event.key === 'j' || event.key === 'J') {
        event.preventDefault()
        setHighlightedIndex(current => (current + 1) % actions.length)
        return
      }

      if (event.key === 'ArrowUp' || event.key === 'k' || event.key === 'K') {
        event.preventDefault()
        setHighlightedIndex(current => (current - 1 + actions.length) % actions.length)
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        invokeAction(actions[highlightedIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [actions, highlightedIndex, hasActions, invokeAction, isOpen, onClose])

  const visibleActions = useMemo(() => actions, [actions])

  if (!isOpen || !hasActions) {
    return null
  }

  const handleActionClick = (index: number) => {
    const action = visibleActions[index]
    if (!action) return
    setHighlightedIndex(index)
    invokeAction(action)
  }

  return (
    <div className='action-palette-backdrop' role='presentation' onClick={onClose}>
      <div
        role='dialog'
        aria-label='アクションパレット'
        className='action-palette'
        onClick={event => event.stopPropagation()}
      >
        <div className='action-palette__header'>
          <span className='action-palette__title'>{snippetTitle}</span>
          <span className='action-palette__hint'>アクションを選択してください</span>
        </div>
        <div className='action-palette__list' role='menu' aria-label='スニペットアクション一覧'>
          {visibleActions.map((action, index) => {
            const isActive = highlightedIndex === index
            const className = ['action-palette__item', isActive ? 'is-active' : ''].filter(Boolean).join(' ')
            return (
              <button
                key={action.id}
                type='button'
                role='menuitem'
                className={className}
                aria-current={isActive}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleActionClick(index)}
              >
                <div className='action-palette__item-title'>
                  <span>{action.label}</span>
                  {action.shortcutHint ? (
                    <span className='action-palette__item-shortcut'>{action.shortcutHint}</span>
                  ) : null}
                </div>
                {action.description ? (
                  <div className='action-palette__item-description'>{action.description}</div>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export type { SnippetActionPaletteItem }
