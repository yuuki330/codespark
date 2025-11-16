import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import App from './App'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve()),
}))

import { invoke } from '@tauri-apps/api/core'

const mockedInvoke = vi.mocked(invoke)

describe('App', () => {
  afterEach(() => {
    mockedInvoke.mockClear()
  })

  it('filters snippets by query keyword', async () => {
    render(<App />)

    const user = userEvent.setup()
    await screen.findByText('ログ出力（Python）')

    const input = screen.getByLabelText('スニペット検索入力')
    await user.type(input, 'git')

    await waitFor(() => {
      expect(screen.getByText('git pull (fast-forward)')).toBeInTheDocument()
    })
    expect(screen.queryByText('fetch wrapper（TypeScript）')).not.toBeInTheDocument()
  })

  it('copies highlighted snippet via keyboard', async () => {
    render(<App />)
    const user = userEvent.setup()
    await screen.findByText('ログ出力（Python）')

    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockedInvoke).toHaveBeenCalledWith('copy_snippet_to_clipboard', expect.any(Object))
    })
  })
})
