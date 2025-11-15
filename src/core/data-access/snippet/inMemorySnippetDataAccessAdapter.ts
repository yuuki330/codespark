import type {
  LibraryId,
  Snippet,
  SnippetDataAccessAdapter,
  SnippetId,
  SnippetLibrary,
  SnippetLibraryDataAccessAdapter,
} from '../../domain/snippet'

const DEFAULT_PERSONAL_LIBRARY: SnippetLibrary = {
  id: 'personal',
  name: 'Personal',
  description: '個人向けのローカルライブラリ',
  isReadOnly: false,
  category: 'PERSONAL',
}

const DEFAULT_TEAM_LIBRARY: SnippetLibrary = {
  id: 'team',
  name: 'Team',
  description: '共有ライブラリのダミー定義',
  isReadOnly: true,
  category: 'TEAM',
}

type SnippetMap = Map<SnippetId, Snippet>

const cloneSnippet = (snippet: Snippet): Snippet => ({
  ...snippet,
  createdAt: new Date(snippet.createdAt),
  updatedAt: new Date(snippet.updatedAt),
  lastUsedAt: snippet.lastUsedAt ? new Date(snippet.lastUsedAt) : null,
})

export class InMemorySnippetDataAccessAdapter
  implements SnippetDataAccessAdapter, SnippetLibraryDataAccessAdapter
{
  private readonly snippets: SnippetMap
  private readonly libraries: Map<LibraryId, SnippetLibrary>

  constructor(initialSnippets: Snippet[] = [], initialLibraries?: SnippetLibrary[]) {
    this.snippets = new Map(initialSnippets.map(snippet => [snippet.id, cloneSnippet(snippet)]))
    const baseLibraries =
      initialLibraries && initialLibraries.length > 0
        ? initialLibraries
        : [DEFAULT_PERSONAL_LIBRARY, DEFAULT_TEAM_LIBRARY]
    this.libraries = new Map(baseLibraries.map(library => [library.id, library]))
  }

  async getAll(): Promise<Snippet[]> {
    return Array.from(this.snippets.values()).map(cloneSnippet)
  }

  async getById(id: SnippetId): Promise<Snippet | null> {
    const snippet = this.snippets.get(id)
    return snippet ? cloneSnippet(snippet) : null
  }

  async save(snippet: Snippet): Promise<void> {
    this.snippets.set(snippet.id, cloneSnippet(snippet))
  }

  async delete(id: SnippetId): Promise<void> {
    this.snippets.delete(id)
  }

  async getLibraries(): Promise<SnippetLibrary[]> {
    return Array.from(this.libraries.values())
  }
}
