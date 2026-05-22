export default function PrivacySheet({ onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet privacy-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">Privacy Policy</h2>
        <p className="privacy-sheet__updated">Last updated: May 2026</p>

        <div className="privacy-sheet__body">
          <h3>Summary</h3>
          <p>
            Forge stores your tasks, projects, calendar events, habits, and notes{' '}
            <strong>only on your device</strong>. We do not operate servers that collect your personal data,
            and we do not sell your information.
          </p>

          <h3>What we collect</h3>
          <p>Forge does not require an account. The app does not send your planner data to our servers.</p>

          <h3>Where your data lives</h3>
          <p>
            Your content is saved in the app&apos;s private storage on your phone using Android&apos;s app-specific
            storage (via Capacitor Preferences). Uninstalling the app may delete this data unless you export a backup first.
          </p>

          <h3>Device backup</h3>
          <p>
            If you use your phone&apos;s system backup (e.g. Google backup), your device manufacturer may include app
            data in that backup according to their own policies. Forge does not control third-party backup services.
          </p>

          <h3>Notifications</h3>
          <p>
            If you enable reminders, Forge schedules local notifications on your device. No reminder content is
            transmitted to external servers for that feature.
          </p>

          <h3>Export</h3>
          <p>
            You can export a JSON backup from Settings at any time. You choose where that file is saved or shared.
          </p>

          <h3>Children</h3>
          <p>
            Forge is a general productivity tool and is not directed at children under 13 in a way that collects
            personal information online.
          </p>

          <h3>Changes</h3>
          <p>We may update this policy as the app evolves. Continued use after changes means you accept the updated policy.</p>

          <h3>Contact</h3>
          <p>Questions about privacy can be sent to the developer email listed on the Google Play store listing for Forge.</p>
        </div>

        <button type="button" className="sheet-btn secondary-btn" style={{ marginTop: 12 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
