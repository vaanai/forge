// Android share intent listener — receives text shared into Forge
import { Preferences } from '@capacitor/preferences'

const SHARE_EVENT = 'shareReceived'
const PENDING_KEY = 'forge_pending_share'

export function normalizeShareText(subject, text) {
  const parts = [subject?.trim(), text?.trim()].filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts[1].includes(parts[0])) return parts[1]
  return `${parts[0]}\n${parts[1]}`
}

export function registerShareListener(callback) {
  const handler = (event) => {
    try {
      const detail = event.detail || {}
      const text = normalizeShareText(detail.subject, detail.text)
      if (text) callback(text)
    } catch (e) {
      console.warn('[Forge Share] Failed to parse share payload:', e)
    }
  }
  window.addEventListener(SHARE_EVENT, handler)
  return () => window.removeEventListener(SHARE_EVENT, handler)
}

export async function consumePendingShare() {
  try {
    const { value } = await Preferences.get({ key: PENDING_KEY })
    if (!value) return null
    await Preferences.remove({ key: PENDING_KEY })
    const parsed = JSON.parse(value)
    return normalizeShareText(parsed.subject, parsed.text) || null
  } catch {
    return null
  }
}
