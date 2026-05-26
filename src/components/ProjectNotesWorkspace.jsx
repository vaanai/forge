import { useState, useEffect } from 'react'
import { uid } from '../utils/storage.js'
import { getLabels } from '../utils/copy.js'
import { Icons } from './Icons.jsx'
import ScratchpadPreview from './ScratchpadPreview.jsx'
import ConfirmSheet from './ConfirmSheet.jsx'

export default function ProjectNotesWorkspace({ project, onBack, onUpdate, plainLanguage = false }) {
  const labels = getLabels(plainLanguage)
  const pages = project.notebook || []
  const [activePageId, setActivePageId] = useState(pages[0]?.id || null)
  const [mode, setMode] = useState('edit')
  const [draft, setDraft] = useState('')
  const [titleDraft, setTitleDraft] = useState('')
  const [search, setSearch] = useState('')
  const [confirmDeletePageId, setConfirmDeletePageId] = useState(null)

  const activePage = pages.find(p => p.id === activePageId) || pages[0]

  useEffect(() => {
    if (activePage) {
      setDraft(activePage.content || '')
      setTitleDraft(activePage.title || '')
    }
  }, [activePage?.id, activePage?.content, activePage?.title])

  function savePage(content, title) {
    if (!activePage) return
    const updatedPages = pages.map(p =>
      p.id === activePage.id
        ? { ...p, content, title: title.trim() || 'Untitled', updatedAt: Date.now() }
        : p
    )
    const scratchpad = updatedPages.map(p => p.content).filter(Boolean).join('\n\n')
    onUpdate({
      ...project,
      notebook: updatedPages,
      scratchpad,
      lastTouchedAt: Date.now(),
    })
  }

  function addPage() {
    const page = { id: uid(), title: 'New page', content: '', updatedAt: Date.now() }
    onUpdate({
      ...project,
      notebook: [page, ...pages],
      lastTouchedAt: Date.now(),
    })
    setActivePageId(page.id)
    setMode('edit')
  }

  function deletePage(pageId) {
    if (pages.length <= 1) return
    const updatedPages = pages.filter(p => p.id !== pageId)
    const scratchpad = updatedPages.map(p => p.content).filter(Boolean).join('\n\n')
    onUpdate({
      ...project,
      notebook: updatedPages,
      scratchpad,
      lastTouchedAt: Date.now(),
    })
    setActivePageId(updatedPages[0]?.id || null)
    setConfirmDeletePageId(null)
  }

  function handleBlur() {
    savePage(draft, titleDraft)
  }

  const filteredPages = search.trim()
    ? pages.filter(p =>
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.content?.toLowerCase().includes(search.toLowerCase())
      )
    : pages

  const sortedPages = [...filteredPages].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  return (
    <div className="notes-workspace">
      <header className="notes-workspace__header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to project">
          <Icons.ChevronLeft />
        </button>
        <div className="notes-workspace__header-text">
          <h1 className="notes-workspace__title">{project.name}</h1>
          <p className="notes-workspace__subtitle">Notebook · {pages.length} {pages.length === 1 ? 'page' : 'pages'}</p>
        </div>
        <button type="button" className="notes-workspace__add-btn" onClick={addPage} aria-label="New page">
          <Icons.Plus size={16} />
        </button>
      </header>

      <div className="notes-workspace__search">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search pages..."
          autoComplete="off"
        />
      </div>

      <div className="notes-workspace__layout">
        <aside className="notes-workspace__sidebar">
          {sortedPages.map(page => (
            <button
              key={page.id}
              type="button"
              className={`notes-page-card ${page.id === activePageId ? 'active' : ''}`}
              onClick={() => { setActivePageId(page.id); setMode('edit') }}
            >
              <span className="notes-page-card__title">{page.title || 'Untitled'}</span>
              <span className="notes-page-card__preview">
                {(page.content || '').trim().slice(0, 60) || 'Empty page'}
              </span>
            </button>
          ))}
          {sortedPages.length === 0 && (
            <p className="notes-workspace__empty-sidebar">No pages match your search.</p>
          )}
        </aside>

        <main className="notes-workspace__editor">
          {activePage ? (
            <>
              <div className="notes-workspace__editor-toolbar">
                <input
                  className="notes-workspace__page-title"
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Page title"
                />
                <div className="notes-workspace__mode-tabs">
                  <button
                    type="button"
                    className={`notes-mode-tab ${mode === 'edit' ? 'active' : ''}`}
                    onClick={() => setMode('edit')}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    className={`notes-mode-tab ${mode === 'preview' ? 'active' : ''}`}
                    onClick={() => { savePage(draft, titleDraft); setMode('preview') }}
                  >
                    Preview
                  </button>
                </div>
                {pages.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn notes-workspace__delete-page"
                    onClick={() => setConfirmDeletePageId(activePage.id)}
                    aria-label="Delete page"
                  >
                    <Icons.Trash size={14} />
                  </button>
                )}
              </div>

              {mode === 'edit' ? (
                <>
                  <textarea
                    className="notes-workspace__textarea"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="Write notes, dimensions, links, checklists (- [ ] item)..."
                    autoFocus
                  />
                  <p className="scratchpad-hint">Use &quot;- [ ] item&quot; for checklists. Links become tappable in Preview.</p>
                </>
              ) : (
                <ScratchpadPreview
                  text={draft}
                  onChange={next => {
                    setDraft(next)
                    savePage(next, titleDraft)
                  }}
                />
              )}
            </>
          ) : (
            <div className="notes-workspace__no-page">
              <p>No pages yet.</p>
              <button type="button" className="sheet-btn" onClick={addPage}>Create first page</button>
            </div>
          )}
        </main>
      </div>

      {confirmDeletePageId && (
        <ConfirmSheet
          title={labels.deletePageTitle}
          message="This page and its contents will be permanently removed."
          confirmLabel="Delete page"
          danger
          onConfirm={() => deletePage(confirmDeletePageId)}
          onCancel={() => setConfirmDeletePageId(null)}
        />
      )}
    </div>
  )
}
