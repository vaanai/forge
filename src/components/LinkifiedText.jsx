import { linkifyText } from '../utils/textFormat.js'

export default function LinkifiedText({ text, className = '' }) {
  if (!text) return null
  const segments = linkifyText(text)
  return (
    <span className={`linkified-text ${className}`.trim()}>
      {segments.map((seg, i) =>
        seg.type === 'link' ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="linkified-text__link"
            onClick={e => e.stopPropagation()}
          >
            {seg.value}
          </a>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </span>
  )
}
