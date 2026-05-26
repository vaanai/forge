import { isTaskActiveOnDay, isTaskDoneOnDay, isRecurringTask, ritualMatchesDay, alloyMatchesDay, eventMatchesDay, DOW_LABELS } from './recurring.js'

export function formatBadgeCount(n) {
  if (n > 9) return '9+'
  return String(n)
}

export function formatShortDate(dateKey) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function getDayPlanSummary(tasks, rituals, events, dateKey, alloys = []) {
  const dayTasks = (tasks || []).filter(t => isTaskActiveOnDay(t, dateKey))
  const dayAlloys = (alloys || []).filter(a => alloyMatchesDay(a, dateKey))
  const dayEvents = (events || []).filter(e => eventMatchesDay(e, dateKey))
  const alloyRitualIds = new Set()
  dayAlloys.forEach(a => (a.ritualIds || []).forEach(id => alloyRitualIds.add(id)))
  const dayRituals = (rituals || [])
    .filter(r => ritualMatchesDay(r, dateKey))
    .filter(r => !alloyRitualIds.has(r.id))
  return {
    tasks: dayTasks,
    rituals: dayRituals,
    alloys: dayAlloys,
    events: dayEvents,
    total: dayTasks.length + dayRituals.length + dayAlloys.length + dayEvents.length,
  }
}

export function getSnoozedTasks(tasks, todayKey) {
  return (tasks || []).filter(t =>
    !isRecurringTask(t) &&
    !t.done &&
    t.deferredUntil &&
    t.deferredUntil > todayKey
  )
}

export function getTaskSearchSubtitle(task, todayKey) {
  if (isRecurringTask(task)) {
    return `Repeats · ${task.repeatDays.map(d => DOW_LABELS[d]).join(', ')}`
  }
  if (task.deferredUntil && task.deferredUntil > todayKey) {
    return `Snoozed until ${formatShortDate(task.deferredUntil)}`
  }
  if (task.deferredUntil && task.deferredUntil <= todayKey && !task.done) {
    return `Due · ${formatShortDate(task.deferredUntil)}`
  }
  if (isTaskDoneOnDay(task, todayKey)) {
    return 'Completed · Task'
  }
  return 'Today · Task'
}

export function formatRitualDays(ritual) {
  return (ritual.days || []).map(d => DOW_LABELS[d]).join(', ')
}
