// Merge calendar deadlines with project / project-task due dates
import { normalizeProject, getProjectMetrics } from './projects.js'
import { upcomingOnDay, getComingUpItems, daysWithUpcoming } from './upcoming.js'

export function collectProjectDueItems(projects = [], todayKey) {
  const items = []
  for (const raw of projects) {
    const p = normalizeProject(raw)
    if (p.archived) continue

    const metrics = getProjectMetrics(p, todayKey)
    if (p.dueDate && metrics.progress < 100) {
      items.push({
        id: `project-deadline-${p.id}`,
        text: `${p.name} deadline`,
        dueDate: p.dueDate,
        done: false,
        source: 'project',
        projectId: p.id,
      })
    }

    for (const t of p.tasks || []) {
      if (!t.done && t.dueDate) {
        items.push({
          id: `project-task-${p.id}-${t.id}`,
          text: t.text,
          dueDate: t.dueDate,
          done: false,
          source: 'project-task',
          projectId: p.id,
          taskId: t.id,
        })
      }
    }
  }
  return items
}

export function mergeDueItems(upcoming = [], projects = [], todayKey) {
  const calendar = (upcoming || []).filter(i => !i.done)
  const projectItems = collectProjectDueItems(projects, todayKey)
  return [...calendar, ...projectItems]
}

export function allDueOnDay(upcoming, projects, dateKey, todayKey) {
  return mergeDueItems(upcoming, projects, todayKey).filter(i => i.dueDate === dateKey)
}

export function daysWithAllDue(upcoming, projects, todayKey) {
  const set = new Set(daysWithUpcoming(upcoming))
  for (const item of collectProjectDueItems(projects, todayKey)) {
    set.add(item.dueDate)
  }
  return set
}

export function getAllComingUpItems(upcoming, projects, todayKey, days = 14) {
  return getComingUpItems(mergeDueItems(upcoming, projects, todayKey), todayKey, days)
}

export { upcomingOnDay }
