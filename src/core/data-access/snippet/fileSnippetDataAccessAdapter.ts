import { invoke } from '@tauri-apps/api/core'

import type {
  LibraryId,
  Snippet,
  SnippetDataAccessAdapter,
  SnippetId,
  SnippetLibrary,
  SnippetLibraryDataAccessAdapter,
} from '../../domain/snippet'

const STORE_VERSION = 1
const DEFAULT_SCOPE = 'appData'
const DEFAULT_FILE_PATH = 'codespark/snippets.json'
const DEFAULT_LIBRARIES: SnippetLibrary[] = [
  {
    id: 'personal',
    name: 'Personal',
    description: '個人用ライブラリ',
    isReadOnly: false,
    category: 'PERSONAL',
  },
  {
    id: 'team',
    name: 'Team',
    description: 'チーム共有ライブラリ',
    isReadOnly: true,
    category: 'TEAM',
  },
]

type SerializedSnippet = Omit<Snippet, 'createdAt' | 'updatedAt' | 'lastUsedAt'> & {
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
}

type SnippetFileSchema = {
  version: number
  snippets: SerializedSnippet[]
  libraries: SnippetLibrary[]
}

type FileSystemPathArgs = {
  path: string
  scope?: string
}

type FileSystemWriteArgs = FileSystemPathArgs & {
  contents: string
}

type FileSystemOperator = {
  readFile(args: FileSystemPathArgs): Promise<string>
  writeFile(args: FileSystemWriteArgs): Promise<void>
  exists(args: FileSystemPathArgs): Promise<boolean>
  ensureDir(args: FileSystemPathArgs): Promise<void>
}

const SNIPPET_STORE_COMMANDS = {
  read: 'read_snippet_store',
  write: 'write_snippet_store',
  exists: 'snippet_store_exists',
  ensureDir: 'ensure_snippet_store_dir',
} as const

const defaultFsOperator: FileSystemOperator = {
  readFile: ({ path, scope }) =>
    invoke<string>(SNIPPET_STORE_COMMANDS.read, { path, scope: scope ?? DEFAULT_SCOPE }),
  writeFile: ({ path, scope, contents }) =>
    invoke<void>(SNIPPET_STORE_COMMANDS.write, { path, scope: scope ?? DEFAULT_SCOPE, contents }),
  exists: ({ path, scope }) =>
    invoke<boolean>(SNIPPET_STORE_COMMANDS.exists, { path, scope: scope ?? DEFAULT_SCOPE }),
  ensureDir: ({ path, scope }) =>
    invoke<void>(SNIPPET_STORE_COMMANDS.ensureDir, { path, scope: scope ?? DEFAULT_SCOPE }),
}

export class ReadOnlyLibraryError extends Error {
  constructor(libraryId: LibraryId) {
    super(`library ${libraryId} is read-only`)
    this.name = 'ReadOnlyLibraryError'
  }
}

export type FileSnippetDataAccessAdapterOptions = {
  filePath?: string
  scope?: string
  libraries?: SnippetLibrary[]
  fs?: FileSystemOperator
}

export class FileSnippetDataAccessAdapter
  implements SnippetDataAccessAdapter, SnippetLibraryDataAccessAdapter
{
  private readonly filePath: string
  private readonly scope: string
  private readonly fs: FileSystemOperator
  private readonly libraries: Map<LibraryId, SnippetLibrary>
  private readonly parentDir: string | null
  private cache: SnippetFileSchema | null = null

  constructor(options: FileSnippetDataAccessAdapterOptions = {}) {
    this.filePath = options.filePath ?? DEFAULT_FILE_PATH
    this.scope = options.scope ?? DEFAULT_SCOPE
    this.fs = options.fs ?? defaultFsOperator
    const providedLibraries =
      options.libraries && options.libraries.length > 0 ? options.libraries : DEFAULT_LIBRARIES
    this.libraries = new Map(providedLibraries.map((library) => [library.id, library]))
    this.parentDir = extractParentDir(this.filePath)
  }

  async getAll(): Promise<Snippet[]> {
    const store = await this.readStore()
    return store.snippets.map(deserializeSnippet)
  }

  async getById(id: SnippetId): Promise<Snippet | null> {
    const store = await this.readStore()
    const match = store.snippets.find((snippet) => snippet.id === id)
    return match ? deserializeSnippet(match) : null
  }

  async save(snippet: Snippet): Promise<void> {
    this.assertWritable(snippet.libraryId)
    const store = await this.readStore()
    const serialized = serializeSnippet(snippet)
    const nextSnippets = [...store.snippets]
    const index = nextSnippets.findIndex((record) => record.id === snippet.id)

    if (index === -1) {
      nextSnippets.push(serialized)
    } else {
      nextSnippets[index] = serialized
    }

    await this.writeStore({
      ...store,
      snippets: nextSnippets,
    })
  }

  async delete(id: SnippetId): Promise<void> {
    const store = await this.readStore()
    const index = store.snippets.findIndex((record) => record.id === id)
    if (index === -1) return

    const snippet = store.snippets[index]
    this.assertWritable(snippet.libraryId)

    const nextSnippets = [...store.snippets]
    nextSnippets.splice(index, 1)

    await this.writeStore({
      ...store,
      snippets: nextSnippets,
    })
  }

  async getLibraries(): Promise<SnippetLibrary[]> {
    return Array.from(this.libraries.values())
  }

  private async readStore(): Promise<SnippetFileSchema> {
    if (this.cache) return this.cache

    const store = await this.loadStoreFromDisk()
    this.cache = store
    return store
  }

  private async loadStoreFromDisk(): Promise<SnippetFileSchema> {
    const fileExistsResult = await this.fs.exists({ path: this.filePath, scope: this.scope })
    if (!fileExistsResult) {
      const emptyStore = this.createEmptyStore()
      await this.writeStore(emptyStore)
      return emptyStore
    }

    try {
      const raw = await this.fs.readFile({ path: this.filePath, scope: this.scope })
      const parsed = safeParse(raw)
      const normalized = this.normalizeStore(parsed)

      if (parsed?.version !== STORE_VERSION) {
        await this.writeStore(normalized)
      }

      return normalized
    } catch (error) {
      console.warn('failed to read snippet store, recreating file', error)
      const emptyStore = this.createEmptyStore()
      await this.writeStore(emptyStore)
      return emptyStore
    }
  }

  private async writeStore(store: SnippetFileSchema): Promise<void> {
    if (this.parentDir) {
      await this.fs.ensureDir({ path: this.parentDir, scope: this.scope })
    }

    await this.fs.writeFile({
      path: this.filePath,
      scope: this.scope,
      contents: JSON.stringify(store, null, 2),
    })

    this.cache = store
  }

  private normalizeStore(input?: Partial<SnippetFileSchema>): SnippetFileSchema {
    const snippets = this.normalizeSnippets(input?.snippets)
    const libraries = this.normalizeLibraries(input?.libraries)

    return {
      version: STORE_VERSION,
      snippets,
      libraries,
    }
  }

  private normalizeSnippets(records: unknown): SerializedSnippet[] {
    if (!Array.isArray(records)) return []
    return records.filter(isSerializedSnippet).map((record) => ({
      ...record,
      lastUsedAt: record.lastUsedAt ?? null,
    }))
  }

  private normalizeLibraries(records: unknown): SnippetLibrary[] {
    if (!Array.isArray(records)) {
      return Array.from(this.libraries.values())
    }

    const sanitized = records.filter(isSnippetLibrary)
    if (sanitized.length === 0) {
      return Array.from(this.libraries.values())
    }

    sanitized.forEach((library) => this.libraries.set(library.id, library))
    return Array.from(this.libraries.values())
  }

  private assertWritable(libraryId: LibraryId): void {
    const library = this.libraries.get(libraryId)
    if (library?.isReadOnly) {
      throw new ReadOnlyLibraryError(libraryId)
    }
  }

  private createEmptyStore(): SnippetFileSchema {
    return {
      version: STORE_VERSION,
      snippets: [],
      libraries: Array.from(this.libraries.values()),
    }
  }
}

const safeParse = (raw: string): Partial<SnippetFileSchema> | undefined => {
  try {
    const parsed = JSON.parse(raw) as Partial<SnippetFileSchema>
    return parsed
  } catch {
    return undefined
  }
}

const extractParentDir = (path: string): string | null => {
  const normalized = path.replace(/\+/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash <= 0) return null
  return normalized.slice(0, lastSlash)
}

const serializeSnippet = (snippet: Snippet): SerializedSnippet => ({
  ...snippet,
  createdAt: snippet.createdAt.toISOString(),
  updatedAt: snippet.updatedAt.toISOString(),
  lastUsedAt: snippet.lastUsedAt ? snippet.lastUsedAt.toISOString() : null,
})

const deserializeSnippet = (record: SerializedSnippet): Snippet => ({
  ...record,
  createdAt: new Date(record.createdAt),
  updatedAt: new Date(record.updatedAt),
  lastUsedAt: record.lastUsedAt ? new Date(record.lastUsedAt) : null,
})

const isSerializedSnippet = (record: unknown): record is SerializedSnippet => {
  if (!record || typeof record !== 'object') return false
  const candidate = record as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.body === 'string' &&
    Array.isArray(candidate.tags) &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.libraryId === 'string'
  )
}

const isSnippetLibrary = (record: unknown): record is SnippetLibrary => {
  if (!record || typeof record !== 'object') return false
  const candidate = record as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.category === 'string' &&
    typeof candidate.isReadOnly === 'boolean'
  )
}
