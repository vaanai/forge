export function parseTimeString(value) {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return { hour: 8, minute: 0 }
  const [h, m] = value.split(':').map(Number)
  return {
    hour: Math.min(23, Math.max(0, h)),
    minute: Math.min(59, Math.max(0, m)),
  }
}

export function formatTimeString(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function formatDisplay12(hour, minute) {
  const h12 = hour % 12 || 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${String(h12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`
}
