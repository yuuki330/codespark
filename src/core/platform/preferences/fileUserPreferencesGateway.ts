import { invoke } from '@tauri-apps/api/core'

import type { UserPreferences, UserPreferencesGateway } from '../../domain/snippet'
import { createDefaultPreferences } from './defaultPreferences'

const DEFAULT_SCOPE = 'appData'
const DEFAULT_FILE_PATH = 'codespark/preferences.json'

type FileSystemPathArgs = {
  path: string
  scope?: string
}

type FileSystemWriteArgs = FileSystemPathArgs & {
  contents: string
}

type FileSystemOperator = {
  readFile(args: FileSystemPathArgs): Promise<string>
  writeFile(args: FileSystemWriteArgs): Promise<void>
  exists(args: FileSystemPathArgs): Promise<boolean>
}

const FILE_COMMANDS = {
  read: 'read_snippet_store',
  write: 'write_snippet_store',
  exists: 'snippet_store_exists',
} as const

const defaultFsOperator: FileSystemOperator = {
  readFile: ({ path, scope }) =>
    invoke<string>(FILE_COMMANDS.read, { path, scope: scope ?? DEFAULT_SCOPE }),
  writeFile: ({ path, scope, contents }) =>
    invoke<void>(FILE_COMMANDS.write, { path, scope: scope ?? DEFAULT_SCOPE, contents }),
  exists: ({ path, scope }) =>
    invoke<boolean>(FILE_COMMANDS.exists, { path, scope: scope ?? DEFAULT_SCOPE }),
}

const DEFAULT_PREFERENCES: UserPreferences = createDefaultPreferences()

export type FileUserPreferencesGatewayOptions = {
  filePath?: string
  scope?: string
  fs?: FileSystemOperator
}

export class FileUserPreferencesGateway implements UserPreferencesGateway {
  private readonly filePath: string
  private readonly scope: string
  private readonly fs: FileSystemOperator
  private cache: UserPreferences | null = null

  constructor(options: FileUserPreferencesGatewayOptions = {}) {
    this.filePath = options.filePath ?? DEFAULT_FILE_PATH
    this.scope = options.scope ?? DEFAULT_SCOPE
    this.fs = options.fs ?? defaultFsOperator
  }

  async getPreferences(): Promise<UserPreferences | null> {
    if (this.cache) {
      return this.cache
    }

    const exists = await this.fs.exists({ path: this.filePath, scope: this.scope })
    if (!exists) {
      return DEFAULT_PREFERENCES
    }

    try {
      const raw = await this.fs.readFile({ path: this.filePath, scope: this.scope })
      const parsed = JSON.parse(raw) as Partial<UserPreferences>
      const normalized: UserPreferences = {
        defaultLibraryId: parsed.defaultLibraryId ?? DEFAULT_PREFERENCES.defaultLibraryId,
        theme: parsed.theme ?? DEFAULT_PREFERENCES.theme,
        globalShortcut: parsed.globalShortcut ?? DEFAULT_PREFERENCES.globalShortcut ?? null,
        commandPaletteShortcut:
          parsed.commandPaletteShortcut ?? DEFAULT_PREFERENCES.commandPaletteShortcut ?? null,
        dataDirectory: parsed.dataDirectory ?? DEFAULT_PREFERENCES.dataDirectory ?? null,
      }
      this.cache = normalized
      return normalized
    } catch (error) {
      console.error('failed to read preferences store', error)
      return DEFAULT_PREFERENCES
    }
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    const next: UserPreferences = {
      defaultLibraryId: preferences.defaultLibraryId ?? null,
      theme: preferences.theme ?? DEFAULT_PREFERENCES.theme,
      globalShortcut: preferences.globalShortcut ?? null,
      commandPaletteShortcut: preferences.commandPaletteShortcut ?? DEFAULT_PREFERENCES.commandPaletteShortcut ?? null,
      dataDirectory: preferences.dataDirectory ?? null,
    }

    await this.fs.writeFile({
      path: this.filePath,
      scope: this.scope,
      contents: JSON.stringify(next),
    })
    this.cache = next
  }
}
