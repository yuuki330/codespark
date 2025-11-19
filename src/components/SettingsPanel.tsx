export function SettingsPanel() {
  return (
    <div className='settings-panel'>
      <section className='settings-panel__section'>
        <h2 className='settings-panel__heading'>ショートカット設定</h2>
        <p className='settings-panel__description'>
          Cmd+Enter などのキーバインドをここで調整できるようにする予定です。現在は既定値の確認のみ可能です。
        </p>
        <div className='settings-panel__field'>
          <label className='settings-panel__label' htmlFor='settings-shortcut'>
            検索起動ショートカット
          </label>
          <input id='settings-shortcut' type='text' value='Cmd+Shift+Space' readOnly />
          <small className='settings-panel__note'>ショートカットの録画・保存は後続タスクで実装します。</small>
        </div>
      </section>

      <section className='settings-panel__section'>
        <h2 className='settings-panel__heading'>データ保存フォルダ</h2>
        <p className='settings-panel__description'>
          Tauri のファイルダイアログを利用して任意フォルダを選択できるようにする計画です。
        </p>
        <div className='settings-panel__folder'>
          <span className='settings-panel__folder-path'>~/Library/Application Support/codespark</span>
          <button type='button' disabled>
            フォルダを選択 (近日対応)
          </button>
        </div>
      </section>
    </div>
  )
}
