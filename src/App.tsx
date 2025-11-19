import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  LibraryId,
  Snippet,
  SnippetDataAccessAdapter,
  SnippetLibrary,
  SnippetLibraryDataAccessAdapter,
  UserPreferencesGateway,
} from './core/domain/snippet'
import { FileSnippetDataAccessAdapter, InMemorySnippetDataAccessAdapter } from './core/data-access/snippet'
import { LocalStorageUserPreferencesGateway, TauriClipboardGateway } from './core/platform'
import type { SnippetId } from './core/domain/snippet'
import {
  CopySnippetUseCase,
  CreateSnippetUseCase,
  DeleteSnippetUseCase,
  GetTopSnippetsForEmptyQueryUseCase,
  SearchSnippetsUseCase,
  GetLibrariesUseCase,
  GetActiveLibraryUseCase,
  SwitchActiveLibraryUseCase,
  UpdateSnippetUseCase,
} from './core/usecases'
import type { Notification } from './components'
import {
  NotificationCenter,
  SearchInput,
  type SearchInputHandle,
  SnippetList,
  SnippetForm,
  type SnippetFormValues,
  SnippetEditor,
  SnippetActionPalette,
  type SnippetActionPaletteItem,
  FilterChip,
  FilterGroup,
  SettingsPanel,
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

type SnippetGateway = SnippetDataAccessAdapter & SnippetLibraryDataAccessAdapter

type ViewMode = 'search' | 'create' | 'edit' | 'list' | 'settings'

const SLASH_COMMAND_VIEW_MAP: Record<string, ViewMode> = {
  '/create': 'create',
  '/list': 'list',
  '/settings': 'settings',
}

const VIEW_LABELS: Record<Exclude<ViewMode, 'search'>, string> = {
  create: 'スニペットを追加',
  edit: 'スニペットを編集',
  list: 'スニペットを一覧表示',
  settings: '設定',
}

const App: React.FC = () => {
  const [storageMode] = useState<'memory' | 'file'>(() =>
    shouldUseInMemoryStorage() ? 'memory' : 'file'
  )
  const [query, setQuery] = useState('')
  const [filteredSnippets, setFilteredSnippets] = useState<Snippet[]>(initialSnippets)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)
  const [libraries, setLibraries] = useState<SnippetLibrary[]>([])
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<LibraryId[]>([])
  const [dataVersion, setDataVersion] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('search')
  const [actionSnippet, setActionSnippet] = useState<Snippet | null>(null)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const searchInputRef = useRef<SearchInputHandle | null>(null)
  const snippetGatewayRef = useRef<SnippetGateway>(
    storageMode === 'memory'
      ? new InMemorySnippetDataAccessAdapter(initialSnippets)
      : new FileSnippetDataAccessAdapter()
  )
  const preferencesGatewayRef = useRef<UserPreferencesGateway>(new LocalStorageUserPreferencesGateway())
  const clipboardGatewayRef = useRef(new TauriClipboardGateway())
  const selectedLibraryIdsRef = useRef<LibraryId[]>([])

  const updateAvailableTags = useCallback(async (snippets?: Snippet[]) => {
    const source = snippets ?? (await snippetGatewayRef.current.getAll())
    const tagSet = new Set<string>()
    source.forEach(snippet => {
      snippet.tags.forEach(tag => tagSet.add(tag))
    })
    setAvailableTags(Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'ja')))
  }, [])

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
  const updateSnippetUseCase = useMemo(
    () =>
      new UpdateSnippetUseCase({
        snippetGateway: snippetGatewayRef.current,
        libraryGateway: snippetGatewayRef.current,
      }),
    []
  )
  const deleteSnippetUseCase = useMemo(
    () =>
      new DeleteSnippetUseCase({
        snippetGateway: snippetGatewayRef.current,
        libraryGateway: snippetGatewayRef.current,
      }),
    []
  )
  const getLibrariesUseCase = useMemo(
    () => new GetLibrariesUseCase({ libraryGateway: snippetGatewayRef.current }),
    []
  )
  const getActiveLibraryUseCase = useMemo(
    () => new GetActiveLibraryUseCase({ preferencesGateway: preferencesGatewayRef.current }),
    []
  )
  const switchActiveLibraryUseCase = useMemo(
    () =>
      new SwitchActiveLibraryUseCase({
        libraryGateway: snippetGatewayRef.current,
        preferencesGateway: preferencesGatewayRef.current,
      }),
    []
  )

  const pushNotification = useCallback((type: Notification['type'], message: string) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    setNotifications(current => [...current, { id, type, message }])
    window.setTimeout(() => {
      setNotifications(current => current.filter(notification => notification.id !== id))
    }, notificationDurationMs)
  }, [])

  useEffect(() => {
    const loadSnippets = async () => {
      const gateway = snippetGatewayRef.current
      let existing = await gateway.getAll()
      if (storageMode === 'file' && existing.length === 0) {
        await seedInitialSnippets(gateway, initialSnippets)
        existing = await gateway.getAll()
      }
      await updateAvailableTags(existing)
    }

    loadSnippets().catch(error => {
      console.error('failed to load snippets', error)
    })
  }, [storageMode, updateAvailableTags])

  useEffect(() => {
    let cancelled = false

    const loadLibraries = async () => {
      try {
        const records = await getLibrariesUseCase.execute()
        if (cancelled) return
        setLibraries(records)
        const fallbackLibraryId = records.find(library => !library.isReadOnly)?.id ?? null
        const activeLibraryId = await getActiveLibraryUseCase.execute({
          availableLibraries: records,
          fallbackLibraryId,
        })
        if (cancelled) return
        setSelectedLibraryIds(activeLibraryId ? [activeLibraryId] : [])
      } catch (error) {
        console.error('failed to load libraries', error)
        if (!cancelled) {
          setLibraries([])
          setSelectedLibraryIds([])
        }
      }
    }

    loadLibraries()

    return () => {
      cancelled = true
    }
  }, [getActiveLibraryUseCase, getLibrariesUseCase])

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [viewMode])

  useEffect(() => {
    selectedLibraryIdsRef.current = selectedLibraryIds
  }, [selectedLibraryIds])

  useEffect(() => {
    let cancelled = false
    const tagsFilter = viewMode === 'list' ? selectedTags : []

    searchSnippetsUseCase
      .execute({
        query,
        libraryIds: selectedLibraryIds,
        tags: tagsFilter,
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
  }, [query, selectedLibraryIds, selectedTags, viewMode, searchSnippetsUseCase, dataVersion])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && viewMode !== 'search') {
        event.preventDefault()
        setViewMode('search')
        setQuery('')
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [viewMode])

  const filteredCount = filteredSnippets.length
  const isEmptyQuery = query.trim().length === 0
  const selectedSnippet = filteredSnippets[selectedIndex] ?? null
  const isActionPaletteOpen = Boolean(actionSnippet)

  const refreshSnippets = useCallback(async () => {
    await updateAvailableTags()
    setDataVersion(version => version + 1)
  }, [updateAvailableTags])

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

  const applyLibrarySelection = useCallback(
    async (nextIds: LibraryId[]) => {
      try {
        await switchActiveLibraryUseCase.execute({ libraryId: nextIds[0] ?? null })
        setSelectedLibraryIds(nextIds)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'ライブラリ選択の保存に失敗しました'
        pushNotification('error', message)
      }
    },
    [pushNotification, switchActiveLibraryUseCase]
  )

  const handleSelectAllLibraries = useCallback(() => {
    void applyLibrarySelection([])
  }, [applyLibrarySelection])

  const handleSelectLibraryChip = useCallback(
    (libraryId: LibraryId) => {
      const isActive = selectedLibraryIds.length === 1 && selectedLibraryIds[0] === libraryId
      if (isActive) {
        void applyLibrarySelection([])
        return
      }
      void applyLibrarySelection([libraryId])
    },
    [applyLibrarySelection, selectedLibraryIds]
  )

  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags(current =>
      current.includes(tag) ? current.filter(existing => existing !== tag) : [...current, tag]
    )
  }, [])

  const handleClearTagFilters = useCallback(() => {
    setSelectedTags([])
  }, [])

  useEffect(() => {
    setSelectedIndex(current => {
      if (filteredCount === 0) return 0
      return Math.min(current, filteredCount - 1)
    })
  }, [filteredCount])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, selectedLibraryIds, selectedTags])

  const exitToSearch = useCallback(() => {
    setViewMode('search')
    setQuery('')
    setSelectedIndex(0)
    searchInputRef.current?.focus()
  }, [])

  const closeActionPalette = useCallback(() => {
    setActionSnippet(null)
  }, [])

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
        exitToSearch()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'スニペットの追加に失敗しました'
        pushNotification('error', `スニペットを追加できませんでした: ${message}`)
        throw error
      }
    },
    [createSnippetUseCase, exitToSearch, pushNotification, refreshSnippets]
  )

  const handleUpdateSnippet = useCallback(
    async ({ snippetId, values }: { snippetId: SnippetId; values: SnippetFormValues }) => {
      try {
        await updateSnippetUseCase.execute({
          snippetId,
          updates: {
            title: values.title,
            body: values.body,
            tags: values.tags,
            language: values.language ?? null,
            shortcut: values.shortcut ?? null,
            description: values.description ?? null,
            libraryId: values.libraryId,
            isFavorite: values.isFavorite,
          },
        })
        await refreshSnippets()
        pushNotification('success', `スニペットを更新しました: ${values.title}`)
        exitToSearch()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'スニペットの更新に失敗しました'
        pushNotification('error', `スニペットを更新できませんでした: ${message}`)
        throw error
      }
    },
    [exitToSearch, pushNotification, refreshSnippets, updateSnippetUseCase]
  )

  const handleDeleteSnippet = useCallback(
    async (snippetId: SnippetId) => {
      try {
        const result = await deleteSnippetUseCase.execute({ snippetId })
        await refreshSnippets()
        setSelectedIndex(0)
        pushNotification('success', `スニペットを削除しました: ${result.deletedSnippet.title}`)
        exitToSearch()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'スニペットの削除に失敗しました'
        pushNotification('error', `スニペットを削除できませんでした: ${message}`)
        throw error
      }
    },
    [deleteSnippetUseCase, exitToSearch, pushNotification, refreshSnippets]
  )

  const defaultWritableLibraryId = useMemo(() => {
    const writable = libraries.find(library => !library.isReadOnly)
    return writable?.id ?? libraries[0]?.id
  }, [libraries])

  const handleSearchInputChange = useCallback(
    (value: string) => {
      setQuery(value)
      const trimmed = value.trim().toLowerCase()
      const targetView = SLASH_COMMAND_VIEW_MAP[trimmed]
      if (targetView) {
        setViewMode(targetView)
        setQuery('')
      }
    },
    []
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifierActive = event.metaKey || event.ctrlKey

      if (modifierActive && /^[1-9]$/.test(event.key) && viewMode === 'search') {
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

      if (viewMode !== 'search') return
      if (actionSnippet) return
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

      if (modifierActive && event.key === 'Enter') {
        event.preventDefault()
        if (selectedSnippet) {
          setActionSnippet(selectedSnippet)
        } else {
          pushNotification('error', 'アクションを実行できるスニペットがありません')
        }
        return
      }

      if (event.key === 'Enter' && !event.shiftKey && !modifierActive) {
        const snippet = filteredSnippets[selectedIndex]
        if (snippet) {
          event.preventDefault()
          handleCopySnippet(snippet)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    actionSnippet,
    filteredCount,
    filteredSnippets,
    handleCopySnippet,
    handleSelectAllLibraries,
    libraries,
    selectedIndex,
    selectedSnippet,
    viewMode,
    pushNotification,
  ])

  useEffect(() => {
    if (viewMode !== 'search' && actionSnippet) {
      setActionSnippet(null)
    }
  }, [actionSnippet, viewMode])

  useEffect(() => {
    if (!selectedSnippet && actionSnippet) {
      setActionSnippet(null)
    }
  }, [actionSnippet, selectedSnippet])

  const snippetActions = useMemo<SnippetActionPaletteItem[]>(() => {
    if (!actionSnippet) return []
    const snippetId = actionSnippet.id
    return [
      {
        id: 'edit-snippet',
        label: 'スニペットを編集',
        description: '既存の編集フォームで内容を更新します',
        onSelect: () => {
          setActionSnippet(null)
          setViewMode('edit')
        },
      },
      {
        id: 'delete-snippet',
        label: 'スニペットを削除',
        description: '削除後は検索ビューに戻ります',
        onSelect: async () => {
          setActionSnippet(null)
          await handleDeleteSnippet(snippetId)
        },
      },
    ]
  }, [actionSnippet, handleDeleteSnippet])

  const isSecondaryView = viewMode !== 'search'
  const containerClass = viewMode === 'search' ? 'command-surface' : 'command-surface command-surface--panel'
  const viewLabel = viewMode === 'search' ? '' : VIEW_LABELS[viewMode]

  return (
    <>
      <div className='app-shell'>
        <div className={containerClass}>
          {isSecondaryView ? (
            <div className='view-toolbar'>
              <button className='back-button' type='button' onClick={exitToSearch} aria-label='検索画面に戻る'>
                ←
              </button>
              <span className='view-label'>{viewLabel}</span>
            </div>
          ) : null}

          {viewMode === 'search' ? (
            <>
              <SearchInput
                ref={searchInputRef}
                value={query}
                onChange={handleSearchInputChange}
                placeholder='スニペットを検索 / /create / /list / /settings'
              />

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
            </>
          ) : null}

          {viewMode === 'create' ? (
            <div className='command-body'>
              <SnippetForm
                libraries={libraries}
                defaultLibraryId={defaultWritableLibraryId}
                onSubmit={handleCreateSnippet}
              />
            </div>
          ) : null}

          {viewMode === 'edit' ? (
            <div className='command-body'>
              <SnippetEditor
                snippet={selectedSnippet}
                libraries={libraries}
                onSubmit={handleUpdateSnippet}
                onDelete={handleDeleteSnippet}
              />
            </div>
          ) : null}

          {viewMode === 'list' ? (
            <div className='command-body command-body--list'>
              <div className='filter-toolbar'>
                <FilterGroup label='ライブラリ'>
                  <div className='filter-group__chips'>
                    <FilterChip active={selectedLibraryIds.length === 0} onClick={handleSelectAllLibraries}>
                      すべて
                    </FilterChip>
                    {libraries.map(library => (
                      <FilterChip
                        key={library.id}
                        active={selectedLibraryIds.includes(library.id)}
                        onClick={() => handleSelectLibraryChip(library.id)}
                      >
                        {library.name}
                      </FilterChip>
                    ))}
                  </div>
                </FilterGroup>

                <FilterGroup label='タグ'>
                  {availableTags.length === 0 ? (
                    <span className='filter-group__empty'>タグが登録されていません</span>
                  ) : (
                    <div className='filter-group__chips'>
                      <FilterChip active={selectedTags.length === 0} onClick={handleClearTagFilters}>
                        すべて
                      </FilterChip>
                      {availableTags.map(tag => (
                        <FilterChip key={tag} active={selectedTags.includes(tag)} onClick={() => handleToggleTag(tag)}>
                          {tag}
                        </FilterChip>
                      ))}
                    </div>
                  )}
                </FilterGroup>
              </div>
              <div className='snippet-panel snippet-panel--list'>
                <SnippetList
                  snippets={filteredSnippets}
                  selectedSnippetId={selectedSnippet?.id ?? null}
                  copiedSnippetId={copiedSnippetId}
                  onSelect={handleCopySnippet}
                  onHover={index => setSelectedIndex(index)}
                  mode='search'
                  emptyMessage='一致するスニペットがありません'
                />
              </div>
            </div>
          ) : null}

          {viewMode === 'settings' ? (
            <div className='command-body'>
              <SettingsPanel />
            </div>
          ) : null}
        </div>
      </div>
      {isActionPaletteOpen && actionSnippet ? (
        <SnippetActionPalette
          isOpen={isActionPaletteOpen}
          snippetTitle={actionSnippet.title}
          actions={snippetActions}
          onClose={closeActionPalette}
        />
      ) : null}
      <NotificationCenter notifications={notifications} />
    </>
  )
}

export default App

type TauriWindow = typeof window & {
  __TAURI__?: unknown
  __TAURI_INTERNALS__?: unknown
}

const isTauriRuntime = () => {
  if (typeof window === 'undefined') return false
  const tauriWindow = window as unknown as TauriWindow
  return Boolean(tauriWindow.__TAURI_INTERNALS__ || tauriWindow.__TAURI__)
}

const shouldUseInMemoryStorage = () => {
  if (import.meta.env.MODE === 'test') return true
  if (import.meta.env.VITE_USE_IN_MEMORY_SNIPPETS === 'true') return true
  return !isTauriRuntime()
}

const seedInitialSnippets = async (
  gateway: SnippetDataAccessAdapter,
  seeds: Snippet[]
): Promise<void> => {
  for (const snippet of seeds) {
    await gateway.save(snippet)
  }
}
