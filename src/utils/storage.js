// src/utils/storage.js
// Lightweight, durable native storage wrapper using Capacitor Preferences and synchronous in-memory cache.
import { Preferences } from '@capacitor/preferences'

const KEYS = {
  TASKS:      'forge_tasks',
  SPARKS:     'forge_sparks',
  PROJECTS:   'forge_projects',
  EVENTS:     'forge_events',
  RITUALS:    'forge_rituals',
  RITUAL_LOG: 'forge_ritual_log',
  THEME:      'forge_theme',
}

// In-memory cache for ultra-fast, synchronous React rendering
const cache = {
  tasks: [],
  sparks: [],
  projects: [],
  events: [],
  rituals: [],
  ritualLog: {},
  theme: 'light',
}

export const storage = {
  /**
   * Initializes the cache asynchronously on app startup by querying Capacitor Preferences.
   * Performs a one-time migration from localStorage if Preference data doesn't exist yet.
   */
  async init() {
    try {
      const keysArray = Object.values(KEYS)
      const fetches = keysArray.map(key => Preferences.get({ key }))
      const results = await Promise.all(fetches)

      // Helper to load value with fallback & localStorage migration
      const loadKey = (index, storageKey, fallbackValue) => {
        const prefVal = results[index].value
        if (prefVal !== null) {
          try {
            return JSON.parse(prefVal)
          } catch {
            return prefVal // handle string theme
          }
        }

        // Migration fallback: if no preferences, check localStorage
        const localVal = localStorage.getItem(storageKey)
        if (localVal !== null) {
          try {
            const parsed = JSON.parse(localVal)
            // Migrate to native preferences in the background
            Preferences.set({ key: storageKey, value: localVal })
            return parsed
          } catch {
            Preferences.set({ key: storageKey, value: localVal })
            return localVal
          }
        }

        return fallbackValue
      }

      cache.tasks = loadKey(0, KEYS.TASKS, [])
      cache.sparks = loadKey(1, KEYS.SPARKS, [])
      cache.projects = loadKey(2, KEYS.PROJECTS, [])
      cache.events = loadKey(3, KEYS.EVENTS, [])
      cache.rituals = loadKey(4, KEYS.RITUALS, [])
      cache.ritualLog = loadKey(5, KEYS.RITUAL_LOG, {})
      cache.theme = results[6].value !== null ? results[6].value : (localStorage.getItem(KEYS.THEME) || 'light')

      // Save initial theme to preference if migrated
      if (results[6].value === null && localStorage.getItem(KEYS.THEME)) {
        Preferences.set({ key: KEYS.THEME, value: cache.theme })
      }
    } catch (e) {
      console.error('[Forge Storage] Failed to initialize preferences:', e)
    }
  },

  // Tasks (The Day)
  getTasks: () => cache.tasks,
  saveTasks: (arr) => {
    cache.tasks = arr
    Preferences.set({ key: KEYS.TASKS, value: JSON.stringify(arr) })
  },

  // Sparks inbox
  getSparks: () => cache.sparks,
  saveSparks: (arr) => {
    cache.sparks = arr
    Preferences.set({ key: KEYS.SPARKS, value: JSON.stringify(arr) })
  },

  // Projects
  getProjects: () => cache.projects,
  saveProjects: (arr) => {
    cache.projects = arr
    Preferences.set({ key: KEYS.PROJECTS, value: JSON.stringify(arr) })
  },

  // Calendar Events
  getEvents: () => cache.events,
  saveEvents: (arr) => {
    cache.events = arr
    Preferences.set({ key: KEYS.EVENTS, value: JSON.stringify(arr) })
  },

  // Daily Rituals (Habits)
  getRituals: () => cache.rituals,
  saveRituals: (arr) => {
    cache.rituals = arr
    Preferences.set({ key: KEYS.RITUALS, value: JSON.stringify(arr) })
  },

  // Daily Ritual Log (Completion records by date key)
  getRitualLog: () => cache.ritualLog,
  saveRitualLog: (log) => {
    cache.ritualLog = log
    Preferences.set({ key: KEYS.RITUAL_LOG, value: JSON.stringify(log) })
  },

  // Theme
  getTheme: () => cache.theme,
  saveTheme: (t) => {
    cache.theme = t
    Preferences.set({ key: KEYS.THEME, value: t })
  },
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getTodayKey() {
  return toDateKey(new Date())
}

export function getTomorrowKey() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return toDateKey(tomorrow)
}
