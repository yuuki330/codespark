import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { LibraryId, Snippet, SnippetLibrary, TagName } from './core/domain/snippet'
import { InMemorySnippetDataAccessAdapter } from './core/data-access/snippet'
import { TauriClipboardGateway } from './core/platform'
import {
  CopySnippetUseCase,
  CreateSnippetUseCase,
  GetTopSnippetsForEmptyQueryUseCase,
  SearchSnippetsUseCase,
} from './core/usecases'
import type { Notification } from './components'
import {
  FilterChip,
  FilterGroup,
  NotificationCenter,
  SearchInput,
  type SearchInputHandle,
  SnippetList,
  SnippetForm,
  type SnippetFormValues,
} from './components'

import './App.css'

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
    isFavorite: true,
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
const notificationDurationMs = 4000

const generateSnippetId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const randomSuffix = Math.random().toString(16).slice(2)
  return `snippet-${Date.now().toString(16)}-${randomSuffix}`
}

const App: React.FC = () => {
  const [query, setQuery] = useState('')
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [filteredSnippets, setFilteredSnippets] = useState<Snippet[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)
  const [libraries, setLibraries] = useState<SnippetLibrary[]>([])
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<LibraryId[]>([])
  const [selectedTags, setSelectedTags] = useState<TagName[]>([])
  const [dataVersion, setDataVersion] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const searchInputRef = useRef<SearchInputHandle | null>(null)
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
  const getTopSnippetsUseCase = useMemo(
    () => new GetTopSnippetsForEmptyQueryUseCase({ snippetGateway: snippetGatewayRef.current }),
    []
  )
  const createSnippetUseCase = useMemo(
    () =>
      new CreateSnippetUseCase({
        snippetGateway: snippetGatewayRef.current,
        generateId: generateSnippetId,
      }),
    []
  )
  const searchSnippetsUseCase = useMemo(
    () =>
      new SearchSnippetsUseCase({
        snippetGateway: snippetGatewayRef.current,
        emptyQueryStrategy: params =>
          getTopSnippetsUseCase.execute({
            libraryIds: params.libraryIds,
            tags: params.tags,
            limit: params.limit,
          }),
      }),
    [getTopSnippetsUseCase]
  )

  const pushNotification = useCallback((type: Notification['type'], message: string) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    setNotifications(current => [...current, { id, type, message }])
    window.setTimeout(() => {
      setNotifications(current => current.filter(notification => notification.id !== id))
    }, notificationDurationMs)
  }, [])

  useEffect(() => {
    snippetGatewayRef.current.getAll().then(setSnippets)
  }, [])

  useEffect(() => {
    snippetGatewayRef.current.getLibraries().then(setLibraries)
  }, [])

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    let cancelled = false

    searchSnippetsUseCase
      .execute({
        query,
        libraryIds: selectedLibraryIds,
        tags: selectedTags,
      })
      .then(results => {
        if (cancelled) return
        setFilteredSnippets(results.map(result => result.snippet))
      })
      .catch(error => {
        console.error('failed to search snippets', error)
        if (!cancelled) {
          setFilteredSnippets([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [query, selectedLibraryIds, selectedTags, searchSnippetsUseCase, dataVersion])

  const availableTags = useMemo(() => {
    const tagSet = new Set<TagName>()
    snippets.forEach(snippet => {
      snippet.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b))
  }, [snippets])

  const filteredCount = filteredSnippets.length
  const isAllLibrariesSelected = selectedLibraryIds.length === 0
  const isEmptyQuery = query.trim().length === 0

  const toggleLibrarySelection = (libraryId: LibraryId) => {
    setSelectedLibraryIds(current => {
      if (current.includes(libraryId)) {
        return current.filter(id => id !== libraryId)
      }
      return [...current, libraryId]
    })
  }

  const handleSelectAllLibraries = () => {
    setSelectedLibraryIds([])
  }

  const toggleTagSelection = (tag: TagName) => {
    setSelectedTags(current => {
      if (current.includes(tag)) {
        return current.filter(activeTag => activeTag !== tag)
      }
      return [...current, tag]
    })
  }

  const clearTagFilter = () => setSelectedTags([])

  useEffect(() => {
    setSelectedIndex(current => {
      if (filteredCount === 0) return 0
      return Math.min(current, filteredCount - 1)
    })
  }, [filteredCount])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, selectedLibraryIds, selectedTags])

  const refreshSnippets = useCallback(async () => {
    const next = await snippetGatewayRef.current.getAll()
    setSnippets(next)
    setDataVersion(version => version + 1)
  }, [])

  const handleCopySnippet = useCallback(
    async (snippet: Snippet) => {
      setCopiedSnippetId(snippet.id)
      try {
        await copySnippetUseCase.execute({ snippetId: snippet.id })
        await refreshSnippets()
      } catch (error) {
        console.error('failed to copy snippet', error)
        const message =
          error instanceof Error ? error.message : 'クリップボードへのコピーに失敗しました'
        pushNotification('error', `コピーできませんでした: ${message}`)
      } finally {
        setTimeout(() => {
          setCopiedSnippetId(current => (current === snippet.id ? null : current))
        }, highlightTimeoutMs)
      }
    },
    [copySnippetUseCase, pushNotification, refreshSnippets]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifierActive = event.metaKey || event.ctrlKey
      if (modifierActive && /^[1-9]$/.test(event.key)) {
        const digit = Number(event.key)
        if (digit === 1) {
          event.preventDefault()
          handleSelectAllLibraries()
          return
        }
        const index = digit - 2
        const targetLibrary = libraries[index]
        if (targetLibrary) {
          event.preventDefault()
          setSelectedLibraryIds([targetLibrary.id])
          return
        }
      }

      if (filteredCount === 0) return
      const isNextByLetter = (event.key === 'j' || event.key === 'J') && modifierActive
      const isPrevByLetter = (event.key === 'k' || event.key === 'K') && modifierActive

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
  }, [filteredCount, filteredSnippets, handleCopySnippet, libraries, selectedIndex])

  const selectedSnippet = filteredSnippets[selectedIndex] ?? null
  const defaultWritableLibraryId = useMemo(() => {
    const writable = libraries.find(library => !library.isReadOnly)
    return writable?.id ?? libraries[0]?.id
  }, [libraries])

  const handleCreateSnippet = useCallback(
    async (values: SnippetFormValues) => {
      try {
        await createSnippetUseCase.execute({
          title: values.title,
          body: values.body,
          tags: values.tags,
          language: values.language ?? null,
          shortcut: values.shortcut ?? null,
          description: values.description ?? null,
          libraryId: values.libraryId,
          isFavorite: values.isFavorite,
        })
        await refreshSnippets()
        pushNotification('success', `スニペットを追加しました: ${values.title}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'スニペットの追加に失敗しました'
        pushNotification('error', `スニペットを追加できませんでした: ${message}`)
        throw error
      }
    },
    [createSnippetUseCase, pushNotification, refreshSnippets]
  )

  return (
    <>
      <div className='app-shell'>
        <div className='command-surface'>
          <div className='command-header'>
            <div>
              <div className='command-header__title'>CodeSpark</div>
              <div className='command-header__caption'>Local snippet launcher (React prototype)</div>
            </div>
            <div className='shortcut-badge'>⌘⇧Space</div>
          </div>

          <SearchInput ref={searchInputRef} value={query} onChange={setQuery} />

          <div className='filters'>
            <FilterGroup label='Libraries'>
              <FilterChip active={isAllLibrariesSelected} onClick={handleSelectAllLibraries} title='⌘1'>
                All
              </FilterChip>
              {libraries.map((library, index) => {
                const shortcut = `⌘${index + 2}`
                return (
                  <FilterChip
                    key={library.id}
                    active={selectedLibraryIds.includes(library.id)}
                    onClick={() => toggleLibrarySelection(library.id)}
                    title={`${shortcut} で ${library.name} に切り替え`}
                  >
                    {library.name}
                  </FilterChip>
                )
              })}
            </FilterGroup>

            <FilterGroup label='Tags'>
              {availableTags.length === 0 ? (
                <span className='filter-group__label' style={{ textTransform: 'none' }}>
                  タグがまだありません
                </span>
              ) : (
                availableTags.map(tag => (
                  <FilterChip
                    key={tag}
                    active={selectedTags.includes(tag)}
                    onClick={() => toggleTagSelection(tag)}
                  >
                    {tag}
                  </FilterChip>
                ))
              )}
              {selectedTags.length > 0 ? (
                <FilterChip onClick={clearTagFilter}>Clear</FilterChip>
              ) : null}
            </FilterGroup>
          </div>

          <div className='snippet-panel'>
            <SnippetList
              snippets={filteredSnippets}
              selectedSnippetId={selectedSnippet?.id ?? null}
              copiedSnippetId={copiedSnippetId}
              onSelect={handleCopySnippet}
              onHover={index => setSelectedIndex(index)}
              mode={isEmptyQuery ? 'suggestion' : 'search'}
              emptyMessage={
                isEmptyQuery ? 'お気に入りや最近使用のスニペットがまだありません' : '一致するスニペットがありません'
              }
            />
          </div>

          <div className='creation-panel'>
            <SnippetForm
              libraries={libraries}
              defaultLibraryId={defaultWritableLibraryId}
              onSubmit={handleCreateSnippet}
            />
          </div>
        </div>
      </div>

      <NotificationCenter notifications={notifications} />
    </>
  )
}

export default App
