// src/utils/notifications.js
// Handles native push notifications using Capacitor Local Notifications, failing gracefully in browsers.
import { LocalNotifications } from '@capacitor/local-notifications'

export const notifications = {
  /**
   * Request native permission to show push/local notifications.
   */
  async requestPermission() {
    try {
      const status = await LocalNotifications.checkPermissions()
      if (status.display !== 'granted') {
        await LocalNotifications.requestPermissions()
      }
    } catch (e) {
      console.warn('[Forge Notifications] System notifications not supported in this environment:', e)
    }
  },

  /**
   * Schedule a one-time reminder for a specific task.
   */
  async scheduleTask(task) {
    if (!task.reminderTime) return null
    try {
      const [hours, minutes] = task.reminderTime.split(':').map(Number)
      const trigger = new Date()
      trigger.setHours(hours, minutes, 0, 0)
      
      // If time has already passed today, schedule it for tomorrow
      if (trigger < new Date()) {
        trigger.setDate(trigger.getDate() + 1)
      }

      // Convert a segment of task.id into a numeric ID for Capacitor
      const nId = parseInt(task.id.slice(0, 6), 36) || Math.floor(Math.random() * 1000000)

      await LocalNotifications.schedule({
        notifications: [
          {
            id: nId,
            title: "Task Reminder",
            body: task.text,
            schedule: { at: trigger },
            extra: { type: 'task', id: task.id }
          }
        ]
      })
      console.log(`[Forge Notifications] Scheduled task reminder for ${task.text} at ${trigger.toLocaleTimeString()}`)
      return nId
    } catch (e) {
      console.warn('[Forge Notifications] Failed to schedule task reminder:', e)
      return null
    }
  },

  /**
   * Cancel a scheduled notification.
   */
  async cancel(id) {
    if (!id) return
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] })
      console.log(`[Forge Notifications] Canceled notification ${id}`)
    } catch (e) {
      console.warn('[Forge Notifications] Failed to cancel notification:', e)
    }
  },

  /**
   * Schedule recurring local alerts for a Daily Ritual based on selected weekdays.
   */
  async scheduleRitual(ritual) {
    if (!ritual.reminderTime || !ritual.days || ritual.days.length === 0) return []
    try {
      const [hours, minutes] = ritual.reminderTime.split(':').map(Number)
      const scheduledIds = []

      const notificationConfigs = ritual.days.map(jsDay => {
        // Map Javascript Sunday=0..Saturday=6 to Capacitor Sunday=1..Saturday=7
        const capDay = jsDay + 1
        const nId = parseInt(ritual.id.slice(0, 5) + jsDay, 36) || Math.floor(Math.random() * 1000000)
        scheduledIds.push(nId)

        return {
          id: nId,
          title: "Daily Ritual",
          body: `Time for your daily ritual: ${ritual.name}`,
          schedule: {
            on: {
              weekday: capDay,
              hour: hours,
              minute: minutes
            },
            every: 'week'
          },
          extra: { type: 'ritual', id: ritual.id }
        }
      })

      await LocalNotifications.schedule({ notifications: notificationConfigs })
      console.log(`[Forge Notifications] Scheduled ritual alerts for ${ritual.name} on days ${ritual.days}`)
      return scheduledIds
    } catch (e) {
      console.warn('[Forge Notifications] Failed to schedule ritual alerts:', e)
      return []
    }
  },

  /**
   * Cancel multiple notification IDs (e.g. for a deleted ritual's recurring alerts).
   */
  async cancelMultiple(ids) {
    if (!ids || ids.length === 0) return
    try {
      await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) })
    } catch (e) {
      console.warn('[Forge Notifications] Failed to cancel multiple notifications:', e)
    }
  },

  /**
   * Schedule a one-time reminder for a Calendar Event 15 minutes before start.
   */
  async scheduleCalendarEvent(event) {
    try {
      // Parse event dateKey 'YYYY-MM-DD'
      const eventDate = new Date(`${event.dateKey}T00:00:00`)
      eventDate.setHours(event.hour, 0, 0, 0)
      
      // Calculate reminder date (15 minutes prior)
      const reminderTime = new Date(eventDate.getTime() - 15 * 60 * 1000)
      
      // If event reminder is already in the past, do not schedule
      if (reminderTime < new Date()) return null

      const nId = parseInt(event.id.slice(0, 6), 36) || Math.floor(Math.random() * 1000000)

      await LocalNotifications.schedule({
        notifications: [
          {
            id: nId,
            title: `Upcoming Event: ${event.name}`,
            body: `Starts in 15 minutes at ${event.hour % 12 || 12} ${event.hour >= 12 ? 'PM' : 'AM'}`,
            schedule: { at: reminderTime },
            extra: { type: 'event', id: event.id }
          }
        ]
      })
      console.log(`[Forge Notifications] Scheduled calendar event alert for ${event.name} at ${reminderTime.toLocaleTimeString()}`)
      return nId
    } catch (e) {
      console.warn('[Forge Notifications] Failed to schedule event reminder:', e)
      return null
    }
  }
}
