import { parseChecklistLines, toggleChecklistLine } from '../utils/textFormat.js'
import LinkifiedText from './LinkifiedText.jsx'

export default function ScratchpadPreview({ text, onChange }) {
  const { lines } = parseChecklistLines(text || '')

  function handleToggle(lineIndex) {
    onChange(toggleChecklistLine(text, lineIndex))
  }

  if (!text?.trim()) {
    return (
      <p className="scratchpad-preview-empty">
        Nothing here yet. Switch to Edit to add notes, checklists, or links.
      </p>
    )
  }

  return (
    <div className="scratchpad-preview">
      {lines.map((line, i) => {
        const m = line.match(/^-\s*\[([ xX])\]\s*(.*)$/)
        if (m) {
          const checked = m[1].toLowerCase() === 'x'
          return (
            <button
              key={i}
              type="button"
              className={`scratchpad-checklist-row ${checked ? 'checked' : ''}`}
              onClick={() => handleToggle(i)}
            >
              <span className={`scratchpad-check ${checked ? 'checked' : ''}`} aria-hidden="true">
                {checked ? '✓' : ''}
              </span>
              <span className={`scratchpad-checklist-label ${checked ? 'done' : ''}`}>
                {m[2] || '(empty)'}
              </span>
            </button>
          )
        }
        if (!line.trim()) {
          return <div key={i} className="scratchpad-preview-spacer" />
        }
        return (
          <p key={i} className="scratchpad-preview-line">
            <LinkifiedText text={line} />
          </p>
        )
      })}
    </div>
  )
}
