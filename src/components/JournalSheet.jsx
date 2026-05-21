import { useState, useEffect } from 'react'
import LinkifiedText from './LinkifiedText.jsx'
import { getLabels } from '../utils/copy.js'

function formatJournalDate(dateKey) {
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function JournalSheet({ dailyNotes, onClose, onSaveDayNote, highlightDateKey, plainLanguage = false }) {
  const labels = getLabels(plainLanguage)
  const entries = Object.entries(dailyNotes || {})
    .filter(([, note]) => note?.trim())
    .sort(([a], [b]) => b.localeCompare(a))

  const [expandedKey, setExpandedKey] = useState(highlightDateKey || null)
  const [editingKey, setEditingKey] = useState(null)
  const [editDraft, setEditDraft] = useState('')

  useEffect(() => {
    if (highlightDateKey) setExpandedKey(highlightDateKey)
  }, [highlightDateKey])

  function startEdit(dateKey, text) {
    setEditingKey(dateKey)
    setEditDraft(text)
    setExpandedKey(dateKey)
  }

  function saveEdit(dateKey) {
    onSaveDayNote(dateKey, editDraft)
    setEditingKey(null)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet journal-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">{labels.pastNotes}</h2>

        {entries.length === 0 ? (
          <p className="journal-empty">{labels.journalEmpty}</p>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {entries.map(([dateKey, note]) => {
              const expanded = expandedKey === dateKey
              const editing = editingKey === dateKey
              return (
                <div
                  key={dateKey}
                  className="journal-entry"
                  id={highlightDateKey === dateKey ? 'journal-highlight' : undefined}
                >
                  <button
                    type="button"
                    className="journal-entry__header"
                    onClick={() => setExpandedKey(expanded ? null : dateKey)}
                  >
                    <div>
                      <div className="journal-entry__date">{formatJournalDate(dateKey)}</div>
                      {!expanded && (
                        <div className="journal-entry__preview">
                          {note.slice(0, 80)}{note.length > 80 ? '…' : ''}
                        </div>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
                  </button>
                  {expanded && (
                    <div className="journal-entry__body">
                      {editing ? (
                        <>
                          <textarea
                            className="journal-entry__edit"
                            value={editDraft}
                            onChange={e => setEditDraft(e.target.value)}
                            autoFocus
                          />
                          <div className="journal-entry__actions">
                            <button type="button" className="sheet-btn" style={{ flex: 1, marginTop: 0 }} onClick={() => saveEdit(dateKey)}>
                              Save
                            </button>
                            <button type="button" className="sheet-btn secondary-btn" style={{ flex: 1, marginTop: 0 }} onClick={() => setEditingKey(null)}>
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="journal-entry__content">
                            <LinkifiedText text={note} />
                          </div>
                          <button
                            type="button"
                            className="upcoming-action-btn upcoming-action-btn--primary"
                            onClick={() => startEdit(dateKey, note)}
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button type="button" className="sheet-btn secondary-btn" style={{ marginTop: 12 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
