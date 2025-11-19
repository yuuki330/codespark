export type ShortcutDescriptor = {
  meta: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
  key: string | null
}

const MODIFIER_LIST = ['meta', 'ctrl', 'alt', 'shift'] as const
type ModifierKey = (typeof MODIFIER_LIST)[number]

const MODIFIER_TOKENS: Record<ModifierKey, string> = {
  meta: 'Cmd',
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
}

const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Shift', 'Alt'])

export const DEFAULT_SHORTCUT_DESCRIPTOR: ShortcutDescriptor = {
  meta: false,
  ctrl: false,
  alt: false,
  shift: false,
  key: null,
}

const normalizeKeyLabel = (key: string): string => {
  if (!key) return ''
  if (key.length === 1) {
    return key.toUpperCase()
  }
  const label = key.toLowerCase()
  if (label === ' ') return 'Space'
  if (label === 'arrowup') return 'ArrowUp'
  if (label === 'arrowdown') return 'ArrowDown'
  if (label === 'arrowleft') return 'ArrowLeft'
  if (label === 'arrowright') return 'ArrowRight'
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export const parseShortcutString = (shortcut: string | null | undefined): ShortcutDescriptor => {
  if (!shortcut) {
    return { ...DEFAULT_SHORTCUT_DESCRIPTOR }
  }
  const descriptor: ShortcutDescriptor = { ...DEFAULT_SHORTCUT_DESCRIPTOR }
  shortcut
    .split('+')
    .map(token => token.trim())
    .filter(Boolean)
    .forEach(token => {
      const lowered = token.toLowerCase()
      if (lowered === 'cmd' || lowered === 'command') {
        descriptor.meta = true
      } else if (lowered === 'ctrl' || lowered === 'control') {
        descriptor.ctrl = true
      } else if (lowered === 'alt' || lowered === 'option') {
        descriptor.alt = true
      } else if (lowered === 'shift') {
        descriptor.shift = true
      } else {
        descriptor.key = normalizeKeyLabel(token)
      }
    })
  return descriptor
}

export const formatShortcutDescriptor = (descriptor: ShortcutDescriptor): string | null => {
  const parts: string[] = []
  MODIFIER_LIST.forEach(modifier => {
    if (descriptor[modifier]) {
      parts.push(MODIFIER_TOKENS[modifier])
    }
  })
  if (descriptor.key) {
    parts.push(descriptor.key)
  }
  if (parts.length === 0) return null
  return parts.join('+')
}

export const eventToShortcutString = (event: KeyboardEvent | React.KeyboardEvent): string | null => {
  const descriptor: ShortcutDescriptor = {
    meta: event.metaKey,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    key: null,
  }
  if (!MODIFIER_KEYS.has(event.key)) {
    descriptor.key = normalizeKeyLabel(event.key)
  }
  return formatShortcutDescriptor(descriptor)
}

export const eventMatchesShortcut = (shortcut: string | null | undefined, event: KeyboardEvent) => {
  if (!shortcut) return false
  const descriptor = parseShortcutString(shortcut)
  if (descriptor.meta !== event.metaKey) return false
  if (descriptor.ctrl !== event.ctrlKey) return false
  if (descriptor.alt !== event.altKey) return false
  if (descriptor.shift !== event.shiftKey) return false
  if (!descriptor.key) return false
  return normalizeKeyLabel(event.key) === descriptor.key
}
