import { useRef, useState } from 'react'
import { parseBackupFile } from '../utils/backup.js'
import PrivacySheet from './PrivacySheet.jsx'

export default function SettingsSheet({
  onClose,
  plainLanguage,
  onPlainLanguageChange,
  onExport,
  onImport,
}) {
  const fileRef = useRef(null)
  const [importError, setImportError] = useState(null)
  const [pendingImport, setPendingImport] = useState(null)
  const [showPrivacy, setShowPrivacy] = useState(false)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = parseBackupFile(reader.result)
        setImportError(null)
        setPendingImport(data)
      } catch (err) {
        setImportError(err.message || 'Could not read backup file.')
        setPendingImport(null)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function runImport() {
    if (!pendingImport) return
    setImportError(null)
    Promise.resolve(onImport(pendingImport))
      .then(() => {
        setPendingImport(null)
        onClose()
      })
      .catch(err => {
        setImportError(err?.message || 'Import failed. Please try again or restore from a backup.')
        setPendingImport(null)
      })
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet settings-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">Settings</h2>

        <div className="settings-row">
          <div>
            <div className="settings-row__label">Plain language</div>
            <div className="settings-row__hint">Use everyday labels instead of forge terms in the app.</div>
          </div>
          <button
            type="button"
            className={`toggle-switch ${plainLanguage ? 'on' : ''}`}
            onClick={() => onPlainLanguageChange(!plainLanguage)}
            aria-pressed={plainLanguage}
            aria-label="Toggle plain language"
          />
        </div>

        <div className="settings-section-label">Your data</div>
        <p className="settings-privacy-note">
          Everything stays on this device. Export a backup before switching phones or clearing app data.
        </p>

        <button type="button" className="sheet-btn" onClick={() => onExport()?.catch?.(() => {})}>
          Export backup (JSON)
        </button>
        <button
          type="button"
          className="sheet-btn secondary-btn"
          onClick={() => fileRef.current?.click()}
        >
          Import backup
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={handleFile} />

        {importError && (
          <p className="settings-error">{importError}</p>
        )}

        {pendingImport && !importError && (
          <div className="settings-import-confirm">
            <p>Replace all current data with this backup? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" className="sheet-btn" onClick={runImport}>Replace data</button>
              <button type="button" className="sheet-btn secondary-btn" onClick={() => setPendingImport(null)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="settings-section-label" style={{ marginTop: 20 }}>Privacy</div>
        <button
          type="button"
          className="settings-link-btn"
          onClick={() => setShowPrivacy(true)}
        >
          Privacy policy
        </button>

        {showPrivacy && <PrivacySheet onClose={() => setShowPrivacy(false)} />}

        <button type="button" className="sheet-btn secondary-btn" style={{ marginTop: 16 }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
