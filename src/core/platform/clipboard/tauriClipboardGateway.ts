import { invoke } from '@tauri-apps/api/core'

import type { ClipboardGateway } from '../../domain/snippet'

const COPY_COMMAND = 'copy_snippet_to_clipboard'

export class TauriClipboardGateway implements ClipboardGateway {
  async copyText(text: string): Promise<void> {
    await invoke<void>(COPY_COMMAND, { text })
  }
}
