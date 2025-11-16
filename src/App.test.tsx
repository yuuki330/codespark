import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('allows adding a snippet via the creation form', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for form to become ready
    const titleInput = await screen.findByLabelText('タイトル *')

    await user.type(titleInput, 'Env loader snippet')
    await user.type(screen.getByLabelText('本文 *'), 'echo "ENV=prod"')
    await user.type(screen.getByLabelText('タグ (カンマ区切り)'), 'shell, env')

    await user.click(screen.getByRole('button', { name: 'スニペットを追加' }))

    await screen.findByText('スニペットを追加しました: Env loader snippet')

    const searchInput = screen.getByPlaceholderText('Search snippets…')
    await user.clear(searchInput)
    await user.type(searchInput, 'Env loader snippet')

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: /Env loader snippet/,
        })
      ).toBeInTheDocument()
    )
  })

  it('allows editing an existing snippet from the editor form', async () => {
    const user = userEvent.setup()
    render(<App />)

    const editTitle = await screen.findByLabelText('タイトル (編集) *')
    await waitFor(() => expect(editTitle).toHaveValue('ログ出力（Python）'))
    await user.clear(editTitle)
    await user.type(editTitle, 'ログ出力（更新版）')

    const editBody = screen.getByLabelText('本文 (編集) *')
    await user.clear(editBody)
    await user.type(editBody, 'print("updated")')

    await user.click(screen.getByRole('button', { name: 'スニペットを更新' }))

    await waitFor(() => expect(editTitle).toHaveValue('ログ出力（更新版）'))
  })

  it('allows deleting the selected snippet from the editor', async () => {
    const user = userEvent.setup()
    render(<App />)

    const deleteButton = await screen.findByRole('button', { name: 'スニペットを削除' })
    await user.click(deleteButton)

    await screen.findByText('スニペットを削除しました: ログ出力（Python）')

    const searchInput = screen.getByPlaceholderText('Search snippets…')
    await user.type(searchInput, 'ログ出力')

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /ログ出力（Python）/ })).not.toBeInTheDocument()
    })
  })
})
