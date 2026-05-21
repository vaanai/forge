// Upcoming / deadline helpers

import { toDateKey } from './storage.js'

export function upcomingOnDay(upcoming, dateKey) {
  return (upcoming || []).filter(i => !i.done && i.dueDate === dateKey)
}

export function getComingUpItems(upcoming, todayKey, days = 14) {
  const end = new Date(`${todayKey}T12:00:00`)
  end.setDate(end.getDate() + days)
  const endKey = toDateKey(end)
  return (upcoming || [])
    .filter(i => !i.done && i.dueDate <= endKey)
    .sort((a, b) => {
      const aOver = a.dueDate < todayKey
      const bOver = b.dueDate < todayKey
      if (aOver !== bOver) return aOver ? -1 : 1
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      return (a.createdAt || 0) - (b.createdAt || 0)
    })
}

export function formatDueLabel(dueDate, todayKey) {
  if (dueDate === todayKey) return 'Today'
  if (dueDate < todayKey) return 'Overdue'
  const d = new Date(`${dueDate}T12:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function daysWithUpcoming(upcoming) {
  const set = new Set()
  ;(upcoming || []).forEach(i => {
    if (!i.done) set.add(i.dueDate)
  })
  return set
}
