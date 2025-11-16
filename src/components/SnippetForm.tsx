import { useEffect, useMemo, useState, type FormEvent } from 'react'

import type { LibraryId, SnippetLibrary, TagName } from '../core/domain/snippet'

export type SnippetFormValues = {
  title: string
  body: string
  shortcut?: string
  description?: string
  language?: string
  tags: TagName[]
  libraryId: LibraryId
  isFavorite: boolean
}

type SnippetFormProps = {
  libraries: SnippetLibrary[]
  defaultLibraryId?: LibraryId
  onSubmit: (values: SnippetFormValues) => Promise<void>
}

const normalizeTags = (raw: string): TagName[] => {
  return raw
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
}

export function SnippetForm({ libraries, defaultLibraryId, onSubmit }: SnippetFormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [language, setLanguage] = useState('')
  const [shortcut, setShortcut] = useState('')
  const [description, setDescription] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [libraryId, setLibraryId] = useState<LibraryId | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableLibraries = useMemo(() => libraries, [libraries])

  useEffect(() => {
    if (libraryId || availableLibraries.length === 0) {
      return
    }
    const preferred =
      defaultLibraryId ??
      availableLibraries.find(library => !library.isReadOnly)?.id ??
      availableLibraries[0]?.id
    if (preferred) {
      setLibraryId(preferred)
    }
  }, [availableLibraries, defaultLibraryId, libraryId])

  const librariesReady = availableLibraries.length > 0 && Boolean(libraryId)

  const resetForm = () => {
    setTitle('')
    setBody('')
    setTagsInput('')
    setLanguage('')
    setShortcut('')
    setDescription('')
    setIsFavorite(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!title.trim() || !body.trim()) {
      setError('タイトルと本文は必須です')
      return
    }

    if (!libraryId) {
      setError('ライブラリを選択してください')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        body,
        tags: normalizeTags(tagsInput),
        language: language.trim() || undefined,
        shortcut: shortcut.trim() || undefined,
        description: description.trim() || undefined,
        libraryId,
        isFavorite,
      })
      resetForm()
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'スニペットの追加に失敗しました'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className='snippet-form' onSubmit={handleSubmit}>
      <div className='snippet-form__header'>
        <div>
          <div className='snippet-form__title'>新規スニペットを追加</div>
          <p className='snippet-form__caption'>タイトル・本文を入力して即座にライブラリへ保存できます。</p>
        </div>
        <button className='snippet-form__submit' type='submit' disabled={!librariesReady || submitting}>
          {submitting ? '保存中…' : 'スニペットを追加'}
        </button>
      </div>

      <div className='snippet-form__grid'>
        <label className='snippet-form__field'>
          <span>タイトル *</span>
          <input
            type='text'
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder='例) GitHub Issue テンプレ'
          />
        </label>

        <label className='snippet-form__field'>
          <span>ライブラリ *</span>
          <select value={libraryId} onChange={event => setLibraryId(event.target.value as LibraryId)}>
            <option value='' disabled>
              選択してください
            </option>
            {availableLibraries.map(library => (
              <option key={library.id} value={library.id} disabled={library.isReadOnly}>
                {library.name}
                {library.isReadOnly ? '（読み取り専用）' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className='snippet-form__field'>
        <span>本文 *</span>
        <textarea
          value={body}
          onChange={event => setBody(event.target.value)}
          rows={5}
          placeholder='コードやコマンドなどの本体を入力'
        />
      </label>

      <div className='snippet-form__grid'>
        <label className='snippet-form__field'>
          <span>タグ (カンマ区切り)</span>
          <input
            type='text'
            value={tagsInput}
            onChange={event => setTagsInput(event.target.value)}
            placeholder='react, hooks'
          />
        </label>

        <label className='snippet-form__field'>
          <span>言語</span>
          <input
            type='text'
            value={language}
            onChange={event => setLanguage(event.target.value)}
            placeholder='typescript'
          />
        </label>

        <label className='snippet-form__field'>
          <span>ショートカット</span>
          <input
            type='text'
            value={shortcut}
            onChange={event => setShortcut(event.target.value)}
            placeholder='ghissue'
          />
        </label>

        <label className='snippet-form__field'>
          <span>説明</span>
          <input
            type='text'
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder='使用例などのメモ'
          />
        </label>
      </div>

      <label className='snippet-form__checkbox'>
        <input
          type='checkbox'
          checked={isFavorite}
          onChange={event => setIsFavorite(event.target.checked)}
        />
        <span>お気に入りに登録する</span>
      </label>

      {error ? (
        <div className='snippet-form__error' role='alert'>
          {error}
        </div>
      ) : null}
    </form>
  )
}
