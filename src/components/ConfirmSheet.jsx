export default function ConfirmSheet({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger = false }) {
  return (
    <div className="sheet-backdrop confirm-sheet-backdrop" onClick={onCancel}>
      <div className="sheet confirm-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">{title}</h2>
        <p className="confirm-sheet__message">{message}</p>
        <div className="confirm-sheet__actions">
          <button type="button" className={`sheet-btn ${danger ? 'confirm-sheet__btn--danger' : ''}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="sheet-btn secondary-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
