/**
 * バリデーションエラーや ReadOnly 例外など、
 * Snippet ドメイン専用のエラー型をここにまとめる。
 */

export type SnippetValidationIssueCode =
  | 'TITLE_EMPTY'
  | 'BODY_EMPTY'
  | 'TAGS_DUPLICATED'
  | 'UPDATED_AT_BEFORE_CREATED_AT'
  | 'INVALID_TIMESTAMP'

export type SnippetValidationIssueField =
  | 'title'
  | 'body'
  | 'tags'
  | 'timestamps'

export type SnippetValidationIssue = {
  code: SnippetValidationIssueCode
  field: SnippetValidationIssueField
  message: string
}

export class SnippetValidationError extends Error {
  readonly issues: SnippetValidationIssue[]

  constructor(issues: SnippetValidationIssue[]) {
    super(issues.map(issue => issue.message).join('\n'))
    this.name = 'SnippetValidationError'
    this.issues = issues
  }
}
