// Helpers for recurring tasks and calendar events

import { toDateKey } from './storage.js'

export function dayOfWeekFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`).getDay()
}

export function isRecurringTask(task) {
  return Array.isArray(task.repeatDays) && task.repeatDays.length > 0
}

export function isRecurringEvent(event) {
  return Array.isArray(event.repeatDays) && event.repeatDays.length > 0
}

export function isTaskDoneOnDay(task, dateKey) {
  if (isRecurringTask(task)) {
    return (task.completedDates || []).includes(dateKey)
  }
  return !!task.done
}

export function isTaskActiveOnDay(task, dateKey) {
  if (task.deferredUntil && task.deferredUntil > dateKey) return false
  if (isRecurringTask(task)) {
    return task.repeatDays.includes(dayOfWeekFromKey(dateKey))
  }
  return true
}

export function isTaskVisibleInActiveList(task, dateKey) {
  if (!isTaskActiveOnDay(task, dateKey)) return false
  return !isTaskDoneOnDay(task, dateKey)
}

export function isTaskVisibleInCompletedList(task, dateKey) {
  if (!isTaskActiveOnDay(task, dateKey)) return false
  return isTaskDoneOnDay(task, dateKey)
}

export function toggleTaskForDay(task, dateKey) {
  if (isRecurringTask(task)) {
    const dates = task.completedDates || []
    const done = dates.includes(dateKey)
    const completedDates = done
      ? dates.filter(d => d !== dateKey)
      : [...dates, dateKey]
    return {
      ...task,
      completedDates,
      lastCompletedAt: done ? task.lastCompletedAt : Date.now(),
    }
  }
  const nextDone = !task.done
  return {
    ...task,
    done: nextDone,
    completedAt: nextDone ? Date.now() : null,
  }
}

export function countTasksCompletedOnDay(tasks, dateKey, todayKey) {
  return tasks.filter(t => {
    if (!isTaskActiveOnDay(t, dateKey)) return false
    if (isRecurringTask(t)) {
      return (t.completedDates || []).includes(dateKey)
    }
    if (t.completedAt) {
      const key = `${new Date(t.completedAt).getFullYear()}-${String(new Date(t.completedAt).getMonth() + 1).padStart(2, '0')}-${String(new Date(t.completedAt).getDate()).padStart(2, '0')}`
      return key === dateKey
    }
    return t.done && dateKey === todayKey
  }).length
}

export function countTasksScheduledOnDay(tasks, dateKey) {
  return tasks.filter(t => isTaskActiveOnDay(t, dateKey)).length
}

export function eventMatchesDay(event, dateKey) {
  if (isRecurringEvent(event)) {
    return event.repeatDays.includes(dayOfWeekFromKey(dateKey))
  }
  return event.dateKey === dateKey
}

export const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** True if the user completed at least one scheduled habit or task on this day. */
export function dayHadActivity(tasks, rituals, ritualLog, dateKey) {
  const dayOfWeek = dayOfWeekFromKey(dateKey)
  const activeRituals = rituals.filter(r => r.days.includes(dayOfWeek))
  if (activeRituals.some(r => ritualLog[dateKey]?.[r.id])) return true

  return tasks.some(t => isTaskActiveOnDay(t, dateKey) && isTaskDoneOnDay(t, dateKey))
}

/** Consecutive days with activity, counting back from today (today skipped if still empty). */
export function computeCurrentStreak(tasks, rituals, ritualLog, todayKey, maxDays = 365) {
  let streak = 0
  const checkDate = new Date(`${todayKey}T12:00:00`)

  for (let d = 0; d < maxDays; d++) {
    const key = toDateKey(checkDate)
    const isToday = key === todayKey

    if (dayHadActivity(tasks, rituals, ritualLog, key)) {
      streak++
    } else if (!isToday) {
      break
    }

    checkDate.setDate(checkDate.getDate() - 1)
  }

  return streak
}
