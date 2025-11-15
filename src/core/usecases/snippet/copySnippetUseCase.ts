import type {
  ClipboardGateway,
  Snippet,
  SnippetDataAccessAdapter,
  SnippetId,
} from '../../domain/snippet'
import { SnippetNotFoundError } from '../../domain/snippet'

export type CopySnippetUseCaseInput = {
  snippetId: SnippetId
}

export type CopySnippetUseCaseDependencies = {
  snippetGateway: SnippetDataAccessAdapter
  clipboardGateway: ClipboardGateway
  now?: () => Date
}

/**
 * Snippet をクリップボードへコピーし、使用履歴を更新するユースケース。
 * UI 層からは `execute` のみを呼び出し、クリップボードや永続化の詳細は依存注入で隠蔽する。
 */
export class CopySnippetUseCase {
  private readonly snippetGateway: SnippetDataAccessAdapter
  private readonly clipboardGateway: ClipboardGateway
  private readonly now: () => Date

  constructor(deps: CopySnippetUseCaseDependencies) {
    this.snippetGateway = deps.snippetGateway
    this.clipboardGateway = deps.clipboardGateway
    this.now = deps.now ?? (() => new Date())
  }

  async execute(input: CopySnippetUseCaseInput): Promise<Snippet> {
    const snippet = await this.snippetGateway.getById(input.snippetId)
    if (!snippet) {
      throw new SnippetNotFoundError(input.snippetId)
    }

    await this.clipboardGateway.copyText(snippet.body)

    const timestamp = this.now()
    const updatedSnippet: Snippet = {
      ...snippet,
      usageCount: snippet.usageCount + 1,
      lastUsedAt: timestamp,
      updatedAt: timestamp,
    }

    await this.snippetGateway.save(updatedSnippet)
    return updatedSnippet
  }
}
