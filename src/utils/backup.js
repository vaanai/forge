// Export / import full app data as JSON (local backup)
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'

export const BACKUP_VERSION = 2

export function buildBackupPayload(state) {
  return {
    version: BACKUP_VERSION,
    app: 'forge',
    exportedAt: new Date().toISOString(),
    data: {
      tasks: state.tasks,
      sparks: state.sparks,
      projects: state.projects,
      events: state.events,
      rituals: state.rituals,
      ritualLog: state.ritualLog,
      alloys: state.alloys,
      theme: state.theme,
      dailyNotes: state.dailyNotes,
      upcoming: state.upcoming,
      settings: state.settings,
    },
  }
}

function validateBackupData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Backup data is missing or invalid.')
  }
  const arrayFields = ['tasks', 'sparks', 'projects', 'events', 'rituals', 'alloys', 'upcoming']
  for (const field of arrayFields) {
    if (data[field] !== undefined && !Array.isArray(data[field])) {
      throw new Error(`Backup field "${field}" must be a list.`)
    }
  }
  const objectFields = ['ritualLog', 'dailyNotes', 'settings']
  for (const field of objectFields) {
    if (data[field] !== undefined && (typeof data[field] !== 'object' || Array.isArray(data[field]))) {
      throw new Error(`Backup field "${field}" must be an object.`)
    }
  }
  if (data.theme !== undefined && typeof data.theme !== 'string') {
    throw new Error('Backup theme must be a string.')
  }
}

async function shareBackupNative(json, filename) {
  await Filesystem.writeFile({
    path: filename,
    data: json,
    directory: Directory.Cache,
    encoding: 'utf8',
  })
  const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: filename })
  await Share.share({
    title: 'Forge backup',
    url: uri,
    dialogTitle: 'Save Forge backup',
  })
}

export async function downloadBackup(payload) {
  const json = JSON.stringify(payload, null, 2)
  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `forge-backup-${stamp}.json`

  if (Capacitor.isNativePlatform()) {
    try {
      await shareBackupNative(json, filename)
      return
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([json], filename, { type: 'application/json' })
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Forge backup' })
        return
      }
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function parseBackupFile(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Could not read this file — it is not valid JSON.')
  }
  if (!parsed || parsed.app !== 'forge' || !parsed.data) {
    throw new Error('Not a valid Forge backup file.')
  }
  if (parsed.version > BACKUP_VERSION) {
    throw new Error('This backup was made with a newer version of Forge.')
  }
  validateBackupData(parsed.data)
  return parsed.data
}
