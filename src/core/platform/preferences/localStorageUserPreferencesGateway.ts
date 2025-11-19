import type { UserPreferences, UserPreferencesGateway } from '../../domain/snippet'

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultLibraryId: null,
  theme: 'system',
  globalShortcut: null,
}

type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const createMemoryStorage = (): StorageLike => {
  let value: string | null = null
  return {
    getItem() {
      return value
    },
    setItem(_, next) {
      value = next
    },
  }
}

const PREFERENCES_STORAGE_KEY = 'codespark.preferences'

export class LocalStorageUserPreferencesGateway implements UserPreferencesGateway {
  private readonly storage: StorageLike
  private cache: UserPreferences | null = null

  constructor(options?: { storage?: StorageLike }) {
    if (options?.storage) {
      this.storage = options.storage
      return
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage
      return
    }

    this.storage = createMemoryStorage()
  }

  async getPreferences(): Promise<UserPreferences | null> {
    if (this.cache) {
      return this.cache
    }

    try {
      const raw = this.storage.getItem(PREFERENCES_STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<UserPreferences>
      const normalized: UserPreferences = {
        defaultLibraryId: parsed.defaultLibraryId ?? DEFAULT_PREFERENCES.defaultLibraryId,
        theme: parsed.theme ?? DEFAULT_PREFERENCES.theme,
        globalShortcut: parsed.globalShortcut ?? DEFAULT_PREFERENCES.globalShortcut ?? null,
      }
      this.cache = normalized
      return normalized
    } catch {
      return null
    }
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    const next: UserPreferences = {
      defaultLibraryId: preferences.defaultLibraryId ?? null,
      theme: preferences.theme ?? DEFAULT_PREFERENCES.theme,
      globalShortcut: preferences.globalShortcut ?? null,
    }

    try {
      this.storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(next))
      this.cache = next
    } catch {
      // ignore storage failures, keep cache best-effort
      this.cache = next
    }
  }
}
