// src/utils/notifications.js
// Handles native push notifications using Capacitor Local Notifications, failing gracefully in browsers.
import { LocalNotifications } from '@capacitor/local-notifications'
import { getTodayKey } from './storage.js'
import { isRecurringTask, isTaskActiveOnDay, isTaskDoneOnDay } from './recurring.js'

/** Stable numeric ID for Capacitor (entity id + type salt → unique int). */
export function notificationId(entityId, salt = '') {
  const str = `forge:${salt}:${entityId}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  const id = Math.abs(hash) % 2147483647
  return id || 1
}

function resolveTaskScheduleDate(task, dateKey) {
  const todayKey = getTodayKey()
  if (dateKey) return dateKey
  if (task.deferredUntil && task.deferredUntil > todayKey) return task.deferredUntil
  return todayKey
}

export function eventTimingKey(ev) {
  if (!ev) return ''
  return JSON.stringify({
    dateKey: ev.dateKey || null,
    hour: ev.hour,
    repeatDays: ev.repeatDays?.length ? [...ev.repeatDays].sort() : null,
  })
}

export const notifications = {
  /** Request permission when the user first enables a reminder. */
  async ensurePermission() {
    try {
      const status = await LocalNotifications.checkPermissions()
      if (status.display !== 'granted') {
        await LocalNotifications.requestPermissions()
      }
    } catch (e) {
      console.warn('[Forge Notifications] System notifications not supported in this environment:', e)
    }
  },

  async scheduleTask(task, dateKey = null) {
    if (!task.reminderTime) return null
    try {
      await this.ensurePermission()
      const [hours, minutes] = task.reminderTime.split(':').map(Number)
      const scheduleKey = resolveTaskScheduleDate(task, dateKey)
      const trigger = new Date(`${scheduleKey}T00:00:00`)
      trigger.setHours(hours, minutes, 0, 0)

      if (trigger < new Date()) return null

      const nId = notificationId(task.id, 'task')

      await LocalNotifications.schedule({
        notifications: [
          {
            id: nId,
            title: 'Task Reminder',
            body: task.text,
            schedule: { at: trigger },
            extra: { type: 'task', id: task.id },
          },
        ],
      })
      return nId
    } catch (e) {
      console.warn('[Forge Notifications] Failed to schedule task reminder:', e)
      return null
    }
  },

  async cancel(id) {
    if (!id) return
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] })
    } catch (e) {
      console.warn('[Forge Notifications] Failed to cancel notification:', e)
    }
  },

  async scheduleRitual(ritual) {
    if (!ritual.reminderTime || !ritual.days || ritual.days.length === 0) return []
    try {
      await this.ensurePermission()
      const [hours, minutes] = ritual.reminderTime.split(':').map(Number)
      const scheduledIds = []

      const notificationConfigs = ritual.days.map(jsDay => {
        const capDay = jsDay + 1
        const nId = notificationId(ritual.id, `ritual-${jsDay}`)
        scheduledIds.push(nId)

        return {
          id: nId,
          title: 'Daily Ritual',
          body: `Time for your daily ritual: ${ritual.name}`,
          schedule: {
            on: { weekday: capDay, hour: hours, minute: minutes },
            every: 'week',
          },
          extra: { type: 'ritual', id: ritual.id },
        }
      })

      await LocalNotifications.schedule({ notifications: notificationConfigs })
      return scheduledIds
    } catch (e) {
      console.warn('[Forge Notifications] Failed to schedule ritual alerts:', e)
      return []
    }
  },

  async cancelMultiple(ids) {
    if (!ids || ids.length === 0) return
    try {
      await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) })
    } catch (e) {
      console.warn('[Forge Notifications] Failed to cancel multiple notifications:', e)
    }
  },

  async scheduleRecurringEvent(event) {
    if (!event.repeatDays?.length) return []
    try {
      await this.ensurePermission()
      const scheduledIds = []
      const [hours, minutes] = [event.hour, 0]
      const notificationConfigs = event.repeatDays.map(jsDay => {
        const capDay = jsDay + 1
        const nId = notificationId(event.id, `event-${jsDay}`)
        scheduledIds.push(nId)
        const reminderMinute = minutes >= 15 ? minutes - 15 : 45
        const reminderHour = minutes >= 15 ? hours : (hours === 0 ? 23 : hours - 1)
        return {
          id: nId,
          title: `Upcoming: ${event.name}`,
          body: 'Starts in 15 minutes',
          schedule: {
            on: { weekday: capDay, hour: reminderHour, minute: reminderMinute },
            every: 'week',
          },
          extra: { type: 'event', id: event.id },
        }
      })
      await LocalNotifications.schedule({ notifications: notificationConfigs })
      return scheduledIds
    } catch (e) {
      console.warn('[Forge Notifications] Failed to schedule recurring event:', e)
      return []
    }
  },

  async scheduleCalendarEvent(event) {
    if (event.repeatDays?.length) {
      return this.scheduleRecurringEvent(event)
    }
    try {
      await this.ensurePermission()
      const eventDate = new Date(`${event.dateKey}T00:00:00`)
      eventDate.setHours(event.hour, 0, 0, 0)
      const reminderTime = new Date(eventDate.getTime() - 15 * 60 * 1000)
      if (reminderTime < new Date()) return null

      const nId = notificationId(event.id, 'event')

      await LocalNotifications.schedule({
        notifications: [
          {
            id: nId,
            title: `Upcoming Event: ${event.name}`,
            body: `Starts in 15 minutes at ${event.hour % 12 || 12} ${event.hour >= 12 ? 'PM' : 'AM'}`,
            schedule: { at: reminderTime },
            extra: { type: 'event', id: event.id },
          },
        ],
      })
      return nId
    } catch (e) {
      console.warn('[Forge Notifications] Failed to schedule event reminder:', e)
      return null
    }
  },

  async cancelEventNotifications(event) {
    if (event.notificationIds?.length) {
      await this.cancelMultiple(event.notificationIds)
      return
    }
    if (event.notificationId) {
      await this.cancel(event.notificationId)
    }
  },

  async cancelAllFromState({ tasks, events, rituals }) {
    for (const t of tasks || []) await this.cancel(t.notificationId)
    for (const e of events || []) await this.cancelEventNotifications(e)
    for (const r of rituals || []) await this.cancelMultiple(r.notificationIds)
  },

  async scheduleTaskIfNeeded(task, todayKey) {
    if (!task.reminderTime) return { ...task, notificationId: null }

    if (isRecurringTask(task)) {
      if (!isTaskActiveOnDay(task, todayKey) || isTaskDoneOnDay(task, todayKey)) {
        return { ...task, notificationId: null }
      }
    } else {
      if (task.done) return { ...task, notificationId: null }
      if (task.deferredUntil && task.deferredUntil > todayKey) {
        const nId = await this.scheduleTask(task, task.deferredUntil)
        return { ...task, notificationId: nId }
      }
    }

    const nId = await this.scheduleTask(task, todayKey)
    return { ...task, notificationId: nId }
  },

  async resyncAfterImport(snap, todayKey) {
    const tasks = []
    for (const t of snap.tasks || []) {
      await this.cancel(t.notificationId)
      tasks.push(await this.scheduleTaskIfNeeded({ ...t, notificationId: null }, todayKey))
    }

    const events = []
    for (const e of snap.events || []) {
      await this.cancelEventNotifications(e)
      const nResult = await this.scheduleCalendarEvent({ ...e, notificationId: null, notificationIds: null })
      events.push(
        Array.isArray(nResult)
          ? { ...e, notificationIds: nResult, notificationId: null }
          : { ...e, notificationId: nResult, notificationIds: null },
      )
    }

    const rituals = []
    for (const r of snap.rituals || []) {
      await this.cancelMultiple(r.notificationIds)
      const nIds = await this.scheduleRitual({ ...r, notificationIds: null })
      rituals.push({ ...r, notificationIds: nIds })
    }

    return { ...snap, tasks, events, rituals }
  },
}
