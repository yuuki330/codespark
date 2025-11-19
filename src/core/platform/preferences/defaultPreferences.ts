import type { UserPreferences } from '../../domain/snippet'

const detectDefaultCommandShortcut = (): string => {
  if (typeof navigator !== 'undefined') {
    const platform = navigator.platform ?? ''
    if (/Mac|iPhone|iPad/i.test(platform)) {
      return 'Cmd+Enter'
    }
  }
  return 'Ctrl+Enter'
}

export const createDefaultPreferences = (): UserPreferences => ({
  defaultLibraryId: null,
  theme: 'system',
  globalShortcut: null,
  commandPaletteShortcut: detectDefaultCommandShortcut(),
  dataDirectory: null,
})
