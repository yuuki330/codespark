import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  it('allows adding a snippet via the creation form', async () => {
    const user = userEvent.setup()
    render(<App />)

    const searchInput = screen.getByPlaceholderText(/スニペットを検索/)
    await user.type(searchInput, '/create')

    const titleInput = await screen.findByLabelText('タイトル *')

    await user.type(titleInput, 'Env loader snippet')
    await user.type(screen.getByLabelText('本文 *'), 'echo "ENV=prod"')
    await user.type(screen.getByLabelText('タグ (カンマ区切り)'), 'shell, env')

    await user.click(screen.getByRole('button', { name: 'スニペットを追加' }))

    await screen.findByText('スニペットを追加しました: Env loader snippet')

    const searchInputAfter = screen.getByPlaceholderText(/スニペットを検索/)
    await user.clear(searchInputAfter)
    await user.type(searchInputAfter, 'Env loader snippet')

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

    const paletteButton = await screen.findByTestId('test-open-action-palette')
    fireEvent.click(paletteButton)
    await screen.findByRole('dialog', { name: 'アクションパレット' })
    await user.keyboard('{Enter}')

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

  it('allows deleting the selected snippet from the action palette', async () => {
    const user = userEvent.setup()
    render(<App />)

    const paletteButton = await screen.findByTestId('test-open-action-palette')
    fireEvent.click(paletteButton)
    await screen.findByRole('dialog', { name: 'アクションパレット' })
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    await screen.findByText('スニペットを削除しました: ログ出力（Python）')

    const searchInput = screen.getByPlaceholderText(/スニペットを検索/)
    await user.type(searchInput, 'ログ出力')

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /ログ出力（Python）/ })).not.toBeInTheDocument()
    })
  })

  it('closes the action palette with Escape', async () => {
    const user = userEvent.setup()
    render(<App />)

    const paletteButton = await screen.findByTestId('test-open-action-palette')
    fireEvent.click(paletteButton)
    await screen.findByRole('dialog', { name: 'アクションパレット' })

    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'アクションパレット' })).not.toBeInTheDocument()
    )
  })

  it('navigates to the create view with /create and returns with Escape', async () => {
    const user = userEvent.setup()
    render(<App />)

    const searchInput = screen.getByPlaceholderText(/スニペットを検索/)
    await user.type(searchInput, '/create')

    await screen.findByLabelText('タイトル *')

    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/スニペットを検索/)).toBeInTheDocument()
    )
  })

  it('navigates to the list view with /list and returns with the back button', async () => {
    const user = userEvent.setup()
    render(<App />)

    const searchInput = screen.getByPlaceholderText(/スニペットを検索/)
    await user.type(searchInput, '/list')

    await screen.findByText('ライブラリ')
    const filterButtons = await screen.findAllByRole('button', { name: 'すべて' })
    expect(filterButtons.length).toBeGreaterThan(0)

    const backButton = screen.getByRole('button', { name: '検索画面に戻る' })
    await user.click(backButton)

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/スニペットを検索/)).toBeInTheDocument()
    )
  })

  it('navigates to the settings view with /settings and returns with Escape', async () => {
    const user = userEvent.setup()
    render(<App />)

    const searchInput = screen.getByPlaceholderText(/スニペットを検索/)
    await user.type(searchInput, '/settings')

    await screen.findByText('ショートカット設定')

    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/スニペットを検索/)).toBeInTheDocument()
    )
  })

  it('updates the action shortcut preference from settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    const searchInput = screen.getByPlaceholderText(/スニペットを検索/)
    await user.type(searchInput, '/settings')

    const manualInput = await screen.findByLabelText('ショートカット文字列を直接入力')
    await user.clear(manualInput)
    await user.type(manualInput, 'Ctrl+Shift+K')
    await user.click(screen.getByRole('button', { name: 'ショートカットを保存' }))

    await waitFor(() => {
      const stored = window.localStorage.getItem('codespark.preferences')
      expect(stored).not.toBeNull()
      expect(stored).toContain('Ctrl+Shift+K')
    })
  })

  it('saves a custom data directory path', async () => {
    const user = userEvent.setup()
    render(<App />)

    const searchInput = screen.getByPlaceholderText(/スニペットを検索/)
    await user.type(searchInput, '/settings')

    const folderInput = await screen.findByLabelText('保存フォルダパス')
    await user.clear(folderInput)
    await user.type(folderInput, '/tmp/codespark-data')
    await user.click(screen.getByRole('button', { name: 'パスを保存' }))

    const stored = window.localStorage.getItem('codespark.preferences')
    expect(stored).toContain('/tmp/codespark-data')
  })
})
