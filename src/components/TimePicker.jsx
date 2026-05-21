import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { parseTimeString, formatTimeString, formatDisplay12 } from '../utils/timeFormat.js'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

export { parseTimeString, formatTimeString } from '../utils/timeFormat.js'

function ScrollColumn({ items, value, onChange, formatItem }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const item = el.querySelector(`[data-value="${value}"]`)
    if (item) item.scrollIntoView({ block: 'center', behavior: 'auto' })
  }, [value])

  return (
    <div className="time-picker-column" ref={ref}>
      {items.map(item => (
        <button
          key={item}
          type="button"
          data-value={item}
          className={`time-picker-column__item ${item === value ? 'selected' : ''}`}
          onClick={() => onChange(item)}
        >
          {formatItem(item)}
        </button>
      ))}
    </div>
  )
}

function TimePickerModal({ hour, minute, onConfirm, onClose }) {
  const [h, setH] = useState(hour)
  const [m, setM] = useState(minute)

  useEffect(() => {
    setH(hour)
    setM(minute)
  }, [hour, minute])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev || '' }
  }, [])

  return createPortal(
    <div className="time-picker-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Select time">
      <div className="time-picker-modal" onClick={e => e.stopPropagation()}>
        <h3 className="time-picker-modal__title">Select time</h3>
        <p className="time-picker-modal__preview">{formatDisplay12(h, m)}</p>

        <div className="time-picker-modal__wheels">
          <div className="time-picker-wheel">
            <div className="time-picker-wheel__label">Hour</div>
            <ScrollColumn
              items={HOURS}
              value={h}
              onChange={setH}
              formatItem={v => String(v).padStart(2, '0')}
            />
          </div>
          <div className="time-picker-wheel">
            <div className="time-picker-wheel__label">Minute</div>
            <ScrollColumn
              items={MINUTES}
              value={m}
              onChange={setM}
              formatItem={v => String(v).padStart(2, '0')}
            />
          </div>
        </div>

        <div className="time-picker-modal__actions">
          <button type="button" className="time-picker-modal__btn time-picker-modal__btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="time-picker-modal__btn time-picker-modal__btn--primary"
            onClick={() => onConfirm(formatTimeString(h, m))}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/** Clickable HH:MM display that opens the picker popup */
export function TimePickerField({
  value,
  onChange,
  disabled = false,
  placeholder = '00:00',
}) {
  const [open, setOpen] = useState(false)
  const { hour, minute } = parseTimeString(value || '08:00')
  const display = value ? formatTimeString(hour, minute) : placeholder

  return (
    <>
      <button
        type="button"
        className={`time-picker-field ${disabled ? 'disabled' : ''} ${value ? 'has-value' : ''}`}
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        aria-label="Choose time"
      >
        <span className="time-picker-field__digits">{display}</span>
      </button>

      {open && (
        <TimePickerModal
          hour={hour}
          minute={minute}
          onClose={() => setOpen(false)}
          onConfirm={(t) => {
            onChange(t)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

/** Notification toggle (default off) + time field when enabled */
export function NotificationTimeField({
  enabled,
  onEnabledChange,
  time,
  onTimeChange,
  label = 'Notification',
}) {
  function handleToggle(next) {
    onEnabledChange(next)
    if (next && !time) {
      onTimeChange('08:00')
    }
    if (!next) {
      onTimeChange(null)
    }
  }

  return (
    <div className="notification-time-field">
      <div className="notification-time-field__row">
        <span className="notification-time-field__label">{label}</span>
        <button
          type="button"
          className={`toggle-switch ${enabled ? 'on' : ''}`}
          onClick={() => handleToggle(!enabled)}
          aria-pressed={enabled}
          aria-label={`${label} ${enabled ? 'on' : 'off'}`}
        />
      </div>
      {enabled && (
        <div className="notification-time-field__time-row animate-in">
          <TimePickerField value={time} onChange={onTimeChange} />
        </div>
      )}
    </div>
  )
}
