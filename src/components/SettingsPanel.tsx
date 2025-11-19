import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'

import { eventToShortcutString } from '../utils/shortcut'

type SettingsPanelProps = {
  shortcut: string | null
  onShortcutChange: (value: string | null) => void
  dataDirectory: string | null
  onDataDirectoryChange: (path: string | null) => void
  onSelectDirectory: () => void
  isSelectingDirectory: boolean
  canUseNativeDialog: boolean
  defaultDirectoryLabel: string
}

export function SettingsPanel({
  shortcut,
  onShortcutChange,
  dataDirectory,
  onDataDirectoryChange,
  onSelectDirectory,
  isSelectingDirectory,
  canUseNativeDialog,
  defaultDirectoryLabel,
}: SettingsPanelProps) {
  const [directoryInput, setDirectoryInput] = useState(dataDirectory ?? '')
  const [manualShortcut, setManualShortcut] = useState(shortcut ?? '')

  useEffect(() => {
    setDirectoryInput(dataDirectory ?? '')
  }, [dataDirectory])

  useEffect(() => {
    setManualShortcut(shortcut ?? '')
  }, [shortcut])

  const handleShortcutKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const formatted = eventToShortcutString(event.nativeEvent)
    if (formatted) {
      onShortcutChange(formatted)
    }
  }

  const handleDirectorySubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = directoryInput.trim()
    onDataDirectoryChange(trimmed.length === 0 ? null : trimmed)
  }

  const handleResetDirectory = () => {
    setDirectoryInput('')
    onDataDirectoryChange(null)
  }

  return (
    <div className='settings-panel'>
      <section className='settings-panel__section'>
        <h2 className='settings-panel__heading'>ショートカット設定</h2>
        <p className='settings-panel__description'>
          Cmd+Enter などのキーバインドをカスタマイズできます。入力欄をフォーカスして目的のキーを押すと登録されます。
        </p>
        <div className='settings-panel__field'>
          <label className='settings-panel__label' htmlFor='command-shortcut-input'>
            アクションショートカット
          </label>
          <input
            id='command-shortcut-input'
            type='text'
            placeholder='Cmd+Enter'
            value={shortcut ?? ''}
            onKeyDown={handleShortcutKeyDown}
            readOnly
          />
          <div className='settings-panel__actions'>
            <button type='button' onClick={() => onShortcutChange(null)}>
              既定値に戻す
            </button>
          </div>
        </div>
        <div className='settings-panel__field'>
          <label className='settings-panel__label' htmlFor='command-shortcut-text'>
            ショートカット文字列を直接入力
          </label>
          <input
            id='command-shortcut-text'
            type='text'
            placeholder='Ctrl+Enter'
            value={manualShortcut}
            onChange={event => setManualShortcut(event.target.value)}
          />
          <div className='settings-panel__actions'>
            <button type='button' onClick={() => onShortcutChange(manualShortcut.trim() || null)}>
              ショートカットを保存
            </button>
          </div>
        </div>
      </section>

      <section className='settings-panel__section'>
        <h2 className='settings-panel__heading'>データ保存フォルダ</h2>
        <p className='settings-panel__description'>
          スニペットの JSON ストアを別フォルダへ移動できます。Tauri 実行時は OS ネイティブのダイアログからフォルダを選択できます。
        </p>
        <form className='settings-panel__folder' onSubmit={handleDirectorySubmit}>
          <label className='settings-panel__label' htmlFor='data-directory-input'>
            保存フォルダパス
          </label>
          <input
            id='data-directory-input'
            type='text'
            placeholder={defaultDirectoryLabel}
            value={directoryInput}
            onChange={event => setDirectoryInput(event.target.value)}
          />
          <div className='settings-panel__actions'>
            <button type='submit'>パスを保存</button>
            <button type='button' onClick={handleResetDirectory}>
              既定フォルダに戻す
            </button>
            <button
              type='button'
              onClick={onSelectDirectory}
              disabled={!canUseNativeDialog || isSelectingDirectory}
            >
              {isSelectingDirectory ? '選択中…' : 'ダイアログで選択'}
            </button>
          </div>
          {!canUseNativeDialog ? (
            <small className='settings-panel__note'>ダイアログ選択は Tauri 実行時のみ利用できます。</small>
          ) : null}
        </form>
      </section>
    </div>
  )
}
