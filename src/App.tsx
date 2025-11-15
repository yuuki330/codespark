import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Snippet } from './core/domain/snippet'
import { InMemorySnippetDataAccessAdapter } from './core/data-access/snippet'
import { TauriClipboardGateway } from './core/platform'
import { CopySnippetUseCase } from './core/usecases'

const createSeedDate = (offsetDays: number) => {
  const base = new Date(Date.UTC(2024, 0, 1, 0, 0, 0))
  base.setUTCDate(base.getUTCDate() + offsetDays)
  return base
}

const createSnippet = (input: {
  id: string
  title: string
  body: string
  tags: string[]
  shortcut?: string | null
  description?: string | null
  language?: string | null
  libraryId?: string
  isFavorite?: boolean
}): Snippet => ({
  id: input.id,
  title: input.title,
  body: input.body,
  tags: input.tags,
  shortcut: input.shortcut ?? null,
  description: input.description ?? null,
  language: input.language ?? null,
  isFavorite: input.isFavorite ?? false,
  usageCount: 0,
  lastUsedAt: null,
  libraryId: input.libraryId ?? 'personal',
  createdAt: createSeedDate(0),
  updatedAt: createSeedDate(0),
})

const initialSnippets: Snippet[] = [
  createSnippet({
    id: 'snippet-python-logger',
    title: 'ログ出力（Python）',
    body: [
      'import logging',
      '',
      "logger = logging.getLogger(__name__)",
      'logger.setLevel(logging.INFO)',
      '',
      'handler = logging.StreamHandler()',
      'handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))',
      'logger.addHandler(handler)',
      '',
      'logger.info("Hello CodeSpark")',
    ].join('\n'),
    tags: ['python', 'logging'],
    language: 'python',
    shortcut: 'pylog',
  }),
  createSnippet({
    id: 'snippet-ts-fetch-wrapper',
    title: 'fetch wrapper（TypeScript）',
    body: [
      'export async function apiGet<T>(path: string): Promise<T> {',
      '  const res = await fetch(path)',
      '  if (!res.ok) throw new Error(`Request failed: ${res.status}`)',
      '  return res.json()',
      '}',
    ].join('\n'),
    tags: ['typescript', 'fetch'],
    language: 'typescript',
    shortcut: 'apiget',
  }),
  createSnippet({
    id: 'snippet-bash-git-pull',
    title: 'git pull (fast-forward)',
    body: 'git pull --ff-only',
    tags: ['git', 'bash'],
    language: 'bash',
    shortcut: 'gpff',
  }),
]

const highlightTimeoutMs = 180

const App: React.FC = () => {
  const [query, setQuery] = useState('')
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const snippetGatewayRef = useRef(new InMemorySnippetDataAccessAdapter(initialSnippets))
  const clipboardGatewayRef = useRef(new TauriClipboardGateway())
  const copySnippetUseCase = useMemo(
    () =>
      new CopySnippetUseCase({
        snippetGateway: snippetGatewayRef.current,
        clipboardGateway: clipboardGatewayRef.current,
      }),
    []
  )

  useEffect(() => {
    snippetGatewayRef.current.getAll().then(setSnippets)
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filteredSnippets = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return snippets

    return snippets.filter(snippet => {
      return (
        snippet.title.toLowerCase().includes(keyword) ||
        snippet.tags.some(tag => tag.toLowerCase().includes(keyword)) ||
        snippet.body.toLowerCase().includes(keyword)
      )
    })
  }, [query, snippets])

  const filteredCount = filteredSnippets.length

  useEffect(() => {
    setSelectedIndex(current => {
      if (filteredCount === 0) return 0
      return Math.min(current, filteredCount - 1)
    })
  }, [filteredCount])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const refreshSnippets = useCallback(async () => {
    const next = await snippetGatewayRef.current.getAll()
    setSnippets(next)
  }, [])

  const handleCopySnippet = useCallback(
    async (snippet: Snippet) => {
      setCopiedSnippetId(snippet.id)
      try {
        await copySnippetUseCase.execute({ snippetId: snippet.id })
        await refreshSnippets()
      } catch (error) {
        console.error('failed to copy snippet', error)
        window.alert('クリップボードへのコピーに失敗しました')
      } finally {
        setTimeout(() => {
          setCopiedSnippetId(current => (current === snippet.id ? null : current))
        }, highlightTimeoutMs)
      }
    },
    [copySnippetUseCase, refreshSnippets]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (filteredCount === 0) return
      const isNextByLetter =
        (event.key === 'j' || event.key === 'J') && (event.metaKey || event.ctrlKey)
      const isPrevByLetter =
        (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)

      if (event.key === 'ArrowDown' || isNextByLetter) {
        event.preventDefault()
        setSelectedIndex(current => Math.min(current + 1, filteredCount - 1))
        return
      }

      if (event.key === 'ArrowUp' || isPrevByLetter) {
        event.preventDefault()
        setSelectedIndex(current => Math.max(current - 1, 0))
        return
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        const snippet = filteredSnippets[selectedIndex]
        if (snippet) {
          event.preventDefault()
          handleCopySnippet(snippet)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredCount, filteredSnippets, handleCopySnippet, selectedIndex])

  const selectedSnippet = filteredSnippets[selectedIndex]

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top, #1e293b, #020617)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#e5e7eb',
      }}
    >
      <div
        style={{
          width: '640px',
          maxWidth: '90vw',
          background: 'rgba(15, 23, 42, 0.9)',
          borderRadius: '18px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          padding: '16px 20px 12px',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              CodeSpark
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#9ca3af',
              }}
            >
              Local snippet launcher (React prototype)
            </div>
          </div>
          <div
            style={{
              fontSize: '11px',
              borderRadius: '999px',
              border: '1px solid rgba(148, 163, 184, 0.5)',
              padding: '4px 8px',
              color: '#e5e7eb',
              opacity: 0.7,
            }}
          >
            ⌘⇧Space
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '12px',
            background: '#020617',
            border: '1px solid rgba(55, 65, 81, 0.8)',
          }}
        >
          <input
            ref={inputRef}
            type='text'
            placeholder='Search snippets…'
            value={query}
            onChange={event => setQuery(event.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e5e7eb',
              fontSize: '13px',
            }}
          />
        </div>

        <div
          style={{
            marginTop: '4px',
            maxHeight: '260px',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {filteredSnippets.length === 0 ? (
            <div
              style={{
                fontSize: '12px',
                color: '#6b7280',
                padding: '12px 4px',
              }}
            >
              No snippets found.
            </div>
          ) : (
            filteredSnippets.map((snippet, index) => {
              const isSelected = selectedSnippet?.id === snippet.id
              const isCopied = copiedSnippetId === snippet.id
              const background = isCopied
                ? 'rgba(22, 163, 74, 0.55)'
                : isSelected
                  ? 'rgba(59, 130, 246, 0.25)'
                  : 'transparent'

              return (
                <div
                  key={snippet.id}
                  onClick={() => handleCopySnippet(snippet)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    padding: '8px 8px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'background 120ms ease-out, transform 80ms ease-out',
                    background,
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      marginBottom: '2px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{snippet.title}</span>
                    {snippet.shortcut ? (
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#cbd5f5',
                          border: '1px solid rgba(148, 163, 184, 0.4)',
                          borderRadius: '999px',
                          padding: '1px 6px',
                        }}
                      >
                        {snippet.shortcut}
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    {snippet.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '999px',
                          background: 'rgba(31, 41, 55, 0.9)',
                          color: '#9ca3af',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#9ca3af',
                      marginTop: '4px',
                    }}
                  >
                    {snippet.body.replace(/\s+/g, ' ').slice(0, 80)}…
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default App
