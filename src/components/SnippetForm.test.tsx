import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { SnippetLibrary } from '../core/domain/snippet'
import { SnippetForm } from './SnippetForm'

const personalLibrary: SnippetLibrary = {
  id: 'personal',
  name: 'Personal',
  description: '個人',
  isReadOnly: false,
  category: 'PERSONAL',
}

describe('SnippetForm', () => {
  it('submits normalized values and resets the form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<SnippetForm libraries={[personalLibrary]} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('タイトル *'), '  New snippet ')
    await user.type(screen.getByLabelText('本文 *'), 'console.log("hi")')
    await user.type(screen.getByLabelText('タグ (カンマ区切り)'), 'react , hooks')
    await user.type(screen.getByLabelText('言語'), 'typescript')
    await user.type(screen.getByLabelText('ショートカット'), '  nsh  ')
    await user.type(screen.getByLabelText('説明'), ' sample ')
    const checkbox = screen.getByLabelText('お気に入りに登録する')
    await user.click(checkbox)

    await user.click(screen.getByRole('button', { name: 'スニペットを追加' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New snippet',
          body: 'console.log("hi")',
          tags: ['react', 'hooks'],
          language: 'typescript',
          shortcut: 'nsh',
          description: 'sample',
          libraryId: 'personal',
          isFavorite: true,
        })
      )
    )

    expect(screen.getByLabelText('タイトル *')).toHaveValue('')
    expect(screen.getByLabelText('本文 *')).toHaveValue('')
    expect(screen.getByLabelText('タグ (カンマ区切り)')).toHaveValue('')
  })

  it('shows an error when required fields are missing', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<SnippetForm libraries={[personalLibrary]} onSubmit={onSubmit} />)

    const submitButton = screen.getByRole('button', { name: 'スニペットを追加' })
    await waitFor(() => expect(submitButton).not.toBeDisabled())
    await user.click(submitButton)

    expect(await screen.findByRole('alert')).toHaveTextContent('タイトルと本文は必須です')
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
