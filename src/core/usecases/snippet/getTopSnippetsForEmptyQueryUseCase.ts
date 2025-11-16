import type {
  LibraryId,
  SnippetDataAccessAdapter,
  TagName,
} from '../../domain/snippet'
import type { SearchSnippetsUseCaseOutput } from './searchSnippetsUseCase'
import {
  buildDefaultEmptyQueryResults,
  filterSnippetsByConditions,
} from './searchSnippetsUseCase'

export type GetTopSnippetsForEmptyQueryUseCaseInput = {
  libraryIds?: LibraryId[]
  tags?: TagName[]
  limit?: number
}

export type GetTopSnippetsForEmptyQueryUseCaseDependencies = {
  snippetGateway: SnippetDataAccessAdapter
  now?: () => Date
}

/**
 * 空クエリ時に表示する候補（お気に入り + 最近利用）を算出するユースケース。
 * `SearchSnippetsUseCase` の `emptyQueryStrategy` として委譲できるよう独立させている。
 */
export class GetTopSnippetsForEmptyQueryUseCase {
  private readonly snippetGateway: SnippetDataAccessAdapter
  private readonly now: () => Date

  constructor(deps: GetTopSnippetsForEmptyQueryUseCaseDependencies) {
    this.snippetGateway = deps.snippetGateway
    this.now = deps.now ?? (() => new Date())
  }

  async execute(
    input: GetTopSnippetsForEmptyQueryUseCaseInput
  ): Promise<SearchSnippetsUseCaseOutput> {
    const snippets = await this.snippetGateway.getAll()
    const filtered = filterSnippetsByConditions(snippets, input.libraryIds, input.tags)
    return buildDefaultEmptyQueryResults({ snippets: filtered, now: this.now, limit: input.limit })
  }
}
