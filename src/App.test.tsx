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
})
