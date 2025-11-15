import type {
  LibraryId,
  Snippet,
  SnippetDataAccessAdapter,
  TagName,
} from '../../domain/snippet'

const SCORE = {
  shortcutExact: 100,
  titlePrefix: 60,
  titlePartial: 30,
  tagMatch: 20,
  bodyMatch: 10,
  favoriteBonus: 15,
  usageNormalized: 10,
  recencyNormalized: 15,
} as const

export type SearchSnippetsUseCaseInput = {
  query: string
  libraryIds?: LibraryId[]
  tags?: TagName[]
  limit?: number
}

export type SearchSnippetsUseCaseResult = {
  snippet: Snippet
  score: number
}

export type SearchSnippetsUseCaseOutput = SearchSnippetsUseCaseResult[]

export type EmptyQueryStrategy = (input: SearchSnippetsUseCaseInput) => Promise<SearchSnippetsUseCaseOutput>

export type SearchSnippetsUseCaseDependencies = {
  snippetGateway: SnippetDataAccessAdapter
  now?: () => Date
  emptyQueryStrategy?: EmptyQueryStrategy
}

type UsageNormalizer = (usageCount: number) => number
type RecencyNormalizer = (timestamp: Date | null | undefined) => number

export class SearchSnippetsUseCase {
  private readonly snippetGateway: SnippetDataAccessAdapter
  private readonly now: () => Date
  private readonly emptyQueryStrategy?: EmptyQueryStrategy

  constructor(deps: SearchSnippetsUseCaseDependencies) {
    this.snippetGateway = deps.snippetGateway
    this.now = deps.now ?? (() => new Date())
    this.emptyQueryStrategy = deps.emptyQueryStrategy
  }

  async execute(input: SearchSnippetsUseCaseInput): Promise<SearchSnippetsUseCaseOutput> {
    const normalizedQuery = input.query.trim().toLowerCase()
    const snippets = await this.snippetGateway.getAll()
    const filtered = this.filterByConditions(snippets, input.libraryIds, input.tags)

    if (!normalizedQuery) {
      if (this.emptyQueryStrategy) {
        return this.emptyQueryStrategy(input)
      }
      return this.buildDefaultResults(filtered, input.limit)
    }

    const usageNormalizer = this.createUsageNormalizer(filtered)
    const recencyNormalizer = this.createRecencyNormalizer(filtered)

    const scored = filtered
      .map(snippet => ({
        snippet,
        score: this.calculateScore({
          snippet,
          query: normalizedQuery,
          usageNormalizer,
          recencyNormalizer,
        }),
      }))
      .filter(result => result.score > 0)
      .sort((a, b) => this.compareResults(a, b))

    if (input.limit && input.limit > 0) {
      return scored.slice(0, input.limit)
    }

    return scored
  }

  private filterByConditions(
    snippets: Snippet[],
    libraryIds?: LibraryId[],
    tags?: TagName[]
  ): Snippet[] {
    let result = snippets

    if (libraryIds && libraryIds.length > 0) {
      const librarySet = new Set(libraryIds)
      result = result.filter(snippet => librarySet.has(snippet.libraryId))
    }

    if (tags && tags.length > 0) {
      const normalizedTags = tags.map(tag => tag.trim().toLowerCase()).filter(Boolean)
      if (normalizedTags.length > 0) {
        result = result.filter(snippet => {
          const snippetTags = snippet.tags.map(tag => tag.toLowerCase())
          return normalizedTags.every(tag => snippetTags.includes(tag))
        })
      }
    }

    return result
  }

  private calculateScore(input: {
    snippet: Snippet
    query: string
    usageNormalizer: UsageNormalizer
    recencyNormalizer: RecencyNormalizer
  }): number {
    const { snippet, query, usageNormalizer, recencyNormalizer } = input
    const title = snippet.title.toLowerCase()
    const body = snippet.body.toLowerCase()
    const tags = snippet.tags.map(tag => tag.toLowerCase())
    const shortcut = snippet.shortcut?.toLowerCase() ?? null

    let score = 0

    if (shortcut && shortcut === query) {
      score += SCORE.shortcutExact
    }

    if (title.startsWith(query)) {
      score += SCORE.titlePrefix
    } else if (title.includes(query)) {
      score += SCORE.titlePartial
    }

    if (tags.some(tag => tag.includes(query))) {
      score += SCORE.tagMatch
    }

    if (body.includes(query)) {
      score += SCORE.bodyMatch
    }

    if (snippet.isFavorite) {
      score += SCORE.favoriteBonus
    }

    score += usageNormalizer(snippet.usageCount)
    score += recencyNormalizer(snippet.lastUsedAt)

    return score
  }

  private createUsageNormalizer(snippets: Snippet[]): UsageNormalizer {
    const maxUsage = snippets.reduce((max, snippet) => Math.max(max, snippet.usageCount), 0)
    if (maxUsage <= 0) {
      return () => 0
    }
    return usageCount => (usageCount / maxUsage) * SCORE.usageNormalized
  }

  private createRecencyNormalizer(snippets: Snippet[]): RecencyNormalizer {
    const hasRecencyData = snippets.some(snippet => snippet.lastUsedAt)
    if (!hasRecencyData) {
      return () => 0
    }

    const now = this.now().getTime()
    const recencyWindowMs = 1000 * 60 * 60 * 24 * 30 // 30 日分をボーナス対象とする

    return timestamp => {
      if (!timestamp) return 0
      const diff = now - timestamp.getTime()
      if (diff <= 0) return SCORE.recencyNormalized
      if (diff >= recencyWindowMs) return 0
      return ((recencyWindowMs - diff) / recencyWindowMs) * SCORE.recencyNormalized
    }
  }

  private buildDefaultResults(
    snippets: Snippet[],
    limit?: number
  ): SearchSnippetsUseCaseOutput {
    const usageNormalizer = this.createUsageNormalizer(snippets)
    const recencyNormalizer = this.createRecencyNormalizer(snippets)

    const scored = snippets
      .map(snippet => {
        let score = 0
        if (snippet.isFavorite) {
          score += SCORE.favoriteBonus
        }
        score += usageNormalizer(snippet.usageCount)
        score += recencyNormalizer(snippet.lastUsedAt)
        return { snippet, score }
      })
      .sort((a, b) => this.compareResults(a, b))

    if (limit && limit > 0) {
      return scored.slice(0, limit)
    }
    return scored
  }

  private compareResults(a: SearchSnippetsUseCaseResult, b: SearchSnippetsUseCaseResult): number {
    if (b.score !== a.score) {
      return b.score - a.score
    }

    if (a.snippet.isFavorite !== b.snippet.isFavorite) {
      return a.snippet.isFavorite ? -1 : 1
    }

    if (b.snippet.usageCount !== a.snippet.usageCount) {
      return b.snippet.usageCount - a.snippet.usageCount
    }

    const aTime = a.snippet.updatedAt.getTime()
    const bTime = b.snippet.updatedAt.getTime()
    if (bTime !== aTime) {
      return bTime - aTime
    }

    return a.snippet.title.localeCompare(b.snippet.title)
  }
}
