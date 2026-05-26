import { uid, toDateKey } from './storage.js'

export function extractIdeasFromScratchpad(scratchpad = '') {
  if (!scratchpad?.trim()) return []
  const ideas = []
  const regex = /\[Spark Captured[^\]]*\]:\s*\n([\s\S]*?)(?=\n\n\[Spark Captured|$)/g
  let match
  while ((match = regex.exec(scratchpad)) !== null) {
    const text = match[1]?.trim()
    if (text) ideas.push({ id: uid(), text, createdAt: Date.now(), source: 'spark' })
  }
  return ideas
}

export function normalizeProject(project) {
  const p = { ...project }
  if (p.description === undefined) p.description = ''
  if (p.dueDate === undefined) p.dueDate = null
  if (p.lastTouchedAt === undefined) p.lastTouchedAt = Date.now()
  if (!Array.isArray(p.ideas)) {
    p.ideas = extractIdeasFromScratchpad(p.scratchpad)
  }
  if (!Array.isArray(p.notebook) || p.notebook.length === 0) {
    const content = p.scratchpad?.trim() || ''
    p.notebook = [{ id: uid(), title: 'General', content, updatedAt: Date.now() }]
  }
  p.tasks = (p.tasks || []).map(t => ({
    dueDate: null,
    ...t,
    dueDate: t.dueDate ?? null,
  }))
  return p
}

export function normalizeProjects(projects = []) {
  return projects.map(normalizeProject)
}

export function createProject({ name, tag = '' }) {
  return normalizeProject({
    id: uid(),
    name,
    tag: tag.trim(),
    description: '',
    dueDate: null,
    tasks: [],
    scratchpad: '',
    notebook: [],
    ideas: [],
    pinned: false,
    archived: false,
    lastTouchedAt: Date.now(),
  })
}

export function touchProject(project) {
  return { ...project, lastTouchedAt: Date.now() }
}

export function getProjectMetrics(project, todayKey = toDateKey(new Date())) {
  const tasks = project.tasks || []
  const done = tasks.filter(t => t.done).length
  const total = tasks.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const lastTouched = project.lastTouchedAt || Date.now()
  const daysSinceTouch = Math.floor((Date.now() - lastTouched) / (1000 * 60 * 60 * 24))

  const overdueTasks = tasks.filter(t => !t.done && t.dueDate && t.dueDate < todayKey).length
  const projectOverdue = project.dueDate && project.dueDate < todayKey && progress < 100

  const pages = project.notebook || []
  const noteCount = pages.length
  const ideaCount = (project.ideas || []).length

  return {
    done,
    total,
    progress,
    daysSinceTouch,
    overdueTasks,
    projectOverdue,
    noteCount,
    ideaCount,
    lastTouched,
  }
}

export function formatDueLabel(dueDate) {
  if (!dueDate) return null
  const today = toDateKey(new Date())
  if (dueDate === today) return 'Due today'
  if (dueDate < today) return 'Overdue'
  const d = new Date(dueDate + 'T12:00:00')
  return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function getNotebookPreview(project) {
  const pages = project.notebook || []
  if (pages.length === 0) return ''
  const sorted = [...pages].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  const latest = sorted[0]
  const snippet = (latest.content || '').trim().split('\n').find(l => l.trim()) || ''
  return snippet.slice(0, 80)
}
