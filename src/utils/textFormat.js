// Linkify + markdown-style checklist helpers for plain-text notes

const URL_RE = /(?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)\]"']/gi

const CHECKLIST_RE = /^-\s*\[([ xX])\]\s*(.*)$/

export function linkifyText(text) {
  if (!text) return [{ type: 'text', value: '' }]
  const segments = []
  let lastIndex = 0
  const re = new RegExp(URL_RE.source, URL_RE.flags)
  let match
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    let url = match[0]
    const href = url.startsWith('www.') ? `https://${url}` : url
    segments.push({ type: 'link', value: url, href })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return segments.length ? segments : [{ type: 'text', value: text }]
}

export function parseChecklistLines(text) {
  if (!text) return { lines: [], checklistItems: [] }
  const lines = text.split('\n')
  const checklistItems = []
  lines.forEach((line, index) => {
    const m = line.match(CHECKLIST_RE)
    if (m) {
      checklistItems.push({
        lineIndex: index,
        checked: m[1].toLowerCase() === 'x',
        label: m[2],
      })
    }
  })
  return { lines, checklistItems }
}

export function toggleChecklistLine(text, lineIndex) {
  const lines = (text || '').split('\n')
  if (lineIndex < 0 || lineIndex >= lines.length) return text
  const m = lines[lineIndex].match(CHECKLIST_RE)
  if (!m) return text
  const checked = m[1].toLowerCase() === 'x'
  const mark = checked ? '[ ]' : '[x]'
  lines[lineIndex] = lines[lineIndex].replace(CHECKLIST_RE, `- ${mark} ${m[2]}`)
  return lines.join('\n')
}

export function isChecklistLine(line) {
  return CHECKLIST_RE.test(line)
}
