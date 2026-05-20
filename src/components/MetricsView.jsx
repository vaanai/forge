// src/components/MetricsView.jsx
// Zen analytics, daily consistency heatmap, habit streaks, and Procrastination Audit (avoiding-list).
import { Icons } from './Icons.jsx'
import { toDateKey } from '../utils/storage.js'

export default function MetricsView({ tasks = [], events = [], rituals = [], ritualLog = {} }) {
  // ── Calculate 7-Day Consistency Heatmap ───────────────────
  const today = new Date()
  const weekDays = []
  
  // Get start of the current week (Sunday)
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(sunday)
    day.setDate(sunday.getDate() + i)
    const key = toDateKey(day)
    
    // Filter tasks completed on or scheduled for this day
    // (If tasks are completed, they might not have a dateKey, but we assume active daily tasks completed count towards today)
    const completedTasksOnDay = key === toDateKey(today) 
      ? tasks.filter(t => t.done).length 
      : 0 // LocalStorage doesn't store historic done tasks with completion dates, so we blend logs and active states
      
    const totalTasksOnDay = key === toDateKey(today)
      ? tasks.length
      : 0

    // Filter rituals scheduled for this day of week
    const dayOfWeek = day.getDay()
    const activeRituals = rituals.filter(r => r.days.includes(dayOfWeek))
    const totalRituals = activeRituals.length
    
    const completedRituals = activeRituals.filter(r => ritualLog[key]?.[r.id]).length
    
    const totalItems = totalTasksOnDay + totalRituals
    const completedItems = completedTasksOnDay + completedRituals
    const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    
    weekDays.push({
      date: day,
      key,
      pct,
      isToday: key === toDateKey(today),
      totalItems,
      completedItems,
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: day.getDate()
    })
  }

  // ── Calculate Active Streaks ──────────────────────────────
  // We check the ritualLog and count consecutive days in the past with completions
  let currentStreak = 0
  let checkingDate = new Date(today)
  
  while (true) {
    const key = toDateKey(checkingDate)
    const logged = ritualLog[key]
    const dayOfWeek = checkingDate.getDay()
    const activeRituals = rituals.filter(r => r.days.includes(dayOfWeek))
    
    // Check if anything was completed on this day (task completed or ritual done)
    const ritualDone = activeRituals.length > 0 && activeRituals.some(r => logged?.[r.id])
    
    // If it's today, we check if today is still in progress, but we don't break streak yet if not completed
    const isToday = key === toDateKey(today)
    
    if (ritualDone || (isToday && tasks.some(t => t.done))) {
      currentStreak++
    } else {
      if (!isToday) break // break if past day has no activity
    }
    
    checkingDate.setDate(checkingDate.getDate() - 1)
  }

  // ── Calculate Procrastination Audit (Tasks Snoozed Most) ──
  const avoidedTasks = [...tasks]
    .filter(t => t.deferCount > 0)
    .sort((a, b) => (b.deferCount || 0) - (a.deferCount || 0))
    .slice(0, 4)

  return (
    <div className="animate-in" style={{ paddingBottom: '32px' }}>
      {/* Header */}
      <div className="section-header">
        <h1 className="section-title">Metrics</h1>
        <p className="section-subtitle">A mindful reflection of your energy & consistency.</p>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 20px' }}>
        
        {/* Streak & Consistency Card */}
        <div className="card glass-card" style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{
            background: 'var(--accent-gold-bg)',
            color: 'var(--accent-gold)',
            borderRadius: '50%',
            width: '64px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            flexShrink: 0
          }}>
            🔥
          </div>
          <div>
            <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Current Streak
            </div>
            <div style={{ font: '700 28px var(--font-sans)', color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              {currentStreak} <span style={{ font: '500 14px var(--font-sans)', color: 'var(--text-secondary)' }}>days consistent</span>
            </div>
          </div>
        </div>

        {/* 7-Day Consistency Heatmap Grid */}
        <div className="card glass-card" style={{ padding: '20px' }}>
          <h3 style={{ font: '600 14px var(--font-sans)', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icons.Calendar size={16} /> 7-Day Consistency Grid
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
            {weekDays.map(day => {
              // Interpolate heat color
              let bg = 'var(--border)'
              let border = 'transparent'
              if (day.pct > 0) {
                if (day.pct <= 30) bg = 'rgba(176, 125, 53, 0.2)'
                else if (day.pct <= 70) bg = 'rgba(176, 125, 53, 0.5)'
                else bg = 'var(--accent-gold)'
              }
              if (day.isToday) {
                border = '1.5px solid var(--accent-blue)'
              }

              return (
                <div key={day.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {day.label}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      background: bg,
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      font: '600 13px var(--font-sans)',
                      color: day.pct > 50 ? '#fff' : 'var(--text-primary)',
                      border: border,
                      position: 'relative'
                    }}
                    title={`${day.completedItems}/${day.totalItems} completed (${day.pct}%)`}
                  >
                    {day.dayNum}
                  </div>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                    {day.pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Procrastination Audit (Avoided Tasks) */}
        <div className="card glass-card" style={{ padding: '20px' }}>
          <h3 style={{ font: '600 14px var(--font-sans)', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⏳ Procrastination Audit
          </h3>
          <p style={{ font: '400 12px var(--font-sans)', color: 'var(--text-muted)', marginBottom: '16px' }}>
            These are tasks you've deferred/snoozed the most. Acknowledging them is the first step!
          </p>

          {avoidedTasks.length === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🍃</div>
              <p style={{ font: '500 13px var(--font-sans)', color: 'var(--text-secondary)' }}>No avoided tasks on your radar!</p>
              <p style={{ font: '400 11px var(--font-sans)', color: 'var(--text-muted)', marginTop: '2px' }}>Your slate flows forward effortlessly.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {avoidedTasks.map(task => (
                <div key={task.id} style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, paddingRight: '8px' }}>
                    <span style={{ font: '500 13px var(--font-sans)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.text}
                    </span>
                    {task.deferCount >= 3 && (
                      <span style={{ font: '600 9px var(--font-sans)', color: 'var(--danger)', textTransform: 'uppercase', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        ⚠️ Highly Snoozed
                      </span>
                    )}
                  </div>
                  <div style={{
                    background: 'var(--accent-gold-bg)',
                    color: 'var(--accent-gold)',
                    font: '600 11px var(--font-sans)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)'
                  }}>
                    Deferred {task.deferCount}x
                  </div>
                </div>
              ))}
              
              {/* Insightful Zen Tip */}
              <div style={{
                marginTop: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-blue-bg)',
                borderLeft: '3px solid var(--accent-blue)',
                font: '400 12px var(--font-sans)',
                color: 'var(--text-secondary)',
                lineHeight: '1.4'
              }}>
                <strong>💡 Zen Tip:</strong> Try breaking highly deferred tasks down into tiny, actionable <em>Sparks</em>. Micro-steps bypass the brain's natural avoidance signals!
              </div>
            </div>
          )}
        </div>

        {/* Task vs Ritual Volume */}
        <div className="card glass-card" style={{ padding: '20px' }}>
          <h3 style={{ font: '600 14px var(--font-sans)', color: 'var(--text-primary)', marginBottom: '14px' }}>
            📊 Productivity Inventory
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ font: '700 24px var(--font-sans)', color: 'var(--accent-blue)' }}>{tasks.length}</div>
              <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>Total Tasks</div>
            </div>
            <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
            <div>
              <div style={{ font: '700 24px var(--font-sans)', color: 'var(--accent-gold)' }}>{rituals.length}</div>
              <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>Active Rituals</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
