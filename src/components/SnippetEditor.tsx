import { useEffect, useMemo, useState, type FormEvent } from 'react'

import type { Snippet, SnippetId, SnippetLibrary } from '../core/domain/snippet'
import type { SnippetFormValues } from './SnippetForm'

type SnippetEditorProps = {
  snippet: Snippet | null
  libraries: SnippetLibrary[]
  onSubmit: (params: { snippetId: SnippetId; values: SnippetFormValues }) => Promise<void>
  onDelete: (snippetId: SnippetId) => Promise<void>
}

const normalizeTags = (raw: string): string[] => {
  return raw
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
}

export function SnippetEditor({ snippet, libraries, onSubmit, onDelete }: SnippetEditorProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [language, setLanguage] = useState('')
  const [shortcut, setShortcut] = useState('')
  const [description, setDescription] = useState('')
  const [libraryId, setLibraryId] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!snippet) {
      setTitle('')
      setBody('')
      setTagsInput('')
      setLanguage('')
      setShortcut('')
      setDescription('')
      setLibraryId('')
      setIsFavorite(false)
      setError(null)
      setDeleting(false)
      return
    }

    setTitle(snippet.title)
    setBody(snippet.body)
    setTagsInput(snippet.tags.join(', '))
    setLanguage(snippet.language ?? '')
    setShortcut(snippet.shortcut ?? '')
    setDescription(snippet.description ?? '')
    setLibraryId(snippet.libraryId)
    setIsFavorite(snippet.isFavorite)
    setError(null)
  }, [snippet])

  const currentLibrary = useMemo(() => {
    if (!snippet) return null
    return libraries.find(library => library.id === snippet.libraryId) ?? null
  }, [libraries, snippet])

  const isReadOnly = currentLibrary?.isReadOnly ?? false
  const formDisabled = !snippet || isReadOnly || submitting || deleting

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!snippet || isReadOnly) return

    if (!title.trim() || !body.trim()) {
      setError('タイトルと本文は必須です')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({
        snippetId: snippet.id,
        values: {
          title: title.trim(),
          body,
          tags: normalizeTags(tagsInput),
          language: language.trim() || undefined,
          shortcut: shortcut.trim() || undefined,
          description: description.trim() || undefined,
          libraryId,
          isFavorite,
        },
      })
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'スニペットの更新に失敗しました'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!snippet || isReadOnly) return
    setDeleting(true)
    setError(null)
    try {
      await onDelete(snippet.id)
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'スニペットの削除に失敗しました'
      setError(message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className='snippet-editor'>
      <div className='snippet-form__header'>
        <div>
          <div className='snippet-form__title'>選択中のスニペットを編集</div>
          <p className='snippet-form__caption'>
            ライブラリや本文を更新し、{currentLibrary?.name ?? 'ライブラリ'} に保存します。
          </p>
        </div>
        <div className='snippet-editor__actions'>
          <button className='snippet-form__submit' type='submit' form='snippet-editor-form' disabled={formDisabled}>
            {isReadOnly ? '編集できません' : submitting ? '更新中…' : 'スニペットを更新'}
          </button>
          <button
            type='button'
            className='snippet-form__danger'
            disabled={!snippet || isReadOnly || deleting}
            onClick={handleDelete}
          >
            {deleting ? '削除中…' : 'スニペットを削除'}
          </button>
        </div>
      </div>

      {!snippet ? (
        <p className='snippet-editor__empty'>編集したいスニペットをリストから選択してください。</p>
      ) : null}

      {snippet && isReadOnly ? (
        <p className='snippet-editor__readonly'>
          {currentLibrary?.name ?? snippet.libraryId} ライブラリは読み取り専用のため編集できません。
        </p>
      ) : null}

      <form id='snippet-editor-form' className='snippet-form' onSubmit={handleSubmit}>
        <div className='snippet-form__grid'>
          <label className='snippet-form__field'>
            <span>タイトル (編集) *</span>
            <input
              type='text'
              value={title}
              onChange={event => setTitle(event.target.value)}
              disabled={formDisabled || !snippet}
            />
          </label>

          <label className='snippet-form__field'>
            <span>ライブラリ *</span>
            <select
              value={libraryId}
              onChange={event => setLibraryId(event.target.value)}
              disabled={formDisabled || !snippet}
            >
              {libraries.map(library => (
                <option key={library.id} value={library.id} disabled={library.isReadOnly}>
                  {library.name}
                  {library.isReadOnly ? '（読み取り専用）' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className='snippet-form__field'>
          <span>本文 (編集) *</span>
          <textarea
            value={body}
            onChange={event => setBody(event.target.value)}
            rows={4}
            disabled={formDisabled || !snippet}
          />
        </label>

        <div className='snippet-form__grid'>
          <label className='snippet-form__field'>
            <span>タグ (編集)</span>
            <input
              type='text'
              value={tagsInput}
              onChange={event => setTagsInput(event.target.value)}
              disabled={formDisabled || !snippet}
            />
          </label>

          <label className='snippet-form__field'>
            <span>言語 (編集)</span>
            <input
              type='text'
              value={language}
              onChange={event => setLanguage(event.target.value)}
              disabled={formDisabled || !snippet}
            />
          </label>

          <label className='snippet-form__field'>
            <span>ショートカット (編集)</span>
            <input
              type='text'
              value={shortcut}
              onChange={event => setShortcut(event.target.value)}
              disabled={formDisabled || !snippet}
            />
          </label>

          <label className='snippet-form__field'>
            <span>説明 (編集)</span>
            <input
              type='text'
              value={description}
              onChange={event => setDescription(event.target.value)}
              disabled={formDisabled || !snippet}
            />
          </label>
        </div>

        <label className='snippet-form__checkbox'>
          <input
            type='checkbox'
            checked={isFavorite}
            onChange={event => setIsFavorite(event.target.checked)}
            disabled={formDisabled || !snippet}
          />
          <span>お気に入りに登録する</span>
        </label>

        {error ? (
          <div className='snippet-form__error' role='alert'>
            {error}
          </div>
        ) : null}
      </form>
    </div>
  )
}
