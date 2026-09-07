import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from './lib/firebase'
import './App.css'

// TEMPORARY — Epic 0 Story 0.2 connectivity check. Delete this block (and the
// import above) once Epic 1 replaces this placeholder with the real trip-home
// screen; it's only here so we can confirm Firestore + rules work from an
// actual browser, since sandboxed shells can't reach Firestore to test it.
function FirestoreCheck() {
  const [result, setResult] = useState('checking...')

  useEffect(() => {
    const testId = 'verify-' + Date.now()
    async function run() {
      const lines: string[] = []
      try {
        await setDoc(doc(db, 'trips', testId), { name: 'verification test', createdAt: new Date().toISOString() })
        lines.push('write: OK')
        const snap = await getDoc(doc(db, 'trips', testId))
        lines.push(snap.exists() ? 'read: OK' : 'read: FAILED (no data)')
        await deleteDoc(doc(db, 'trips', testId))
        lines.push('delete: OK')
      } catch (e) {
        lines.push('read/write: FAILED — ' + (e as Error).message)
      }
      try {
        const snap = await getDocs(collection(db, 'trips'))
        lines.push(`list trips (should be BLOCKED): unexpectedly succeeded, ${snap.size} docs — rules need fixing`)
      } catch {
        lines.push('list trips (should be BLOCKED): correctly rejected ✓')
      }
      setResult(lines.join(' · '))
    }
    run()
  }, [])

  return (
    <div className="scaffold-note" style={{ marginTop: 16 }}>
      Firestore check: {result}
    </div>
  )
}

function App() {
  return (
    <div className="masthead">
      <p className="masthead__eyebrow">Curated · shared link</p>
      <h1 className="masthead__title">Curated Travel Map</h1>
      <p className="masthead__standfirst">nothing here yet — this is the empty scaffold</p>

      <div className="scaffold-note">
        Epic 0 checkpoint: PWA shell, design tokens, and installability are in place.
        No trip data, map, or import flow yet — those are Epics&nbsp;1&ndash;4. If you can
        see this styled screen (serif title, cobalt eyebrow) from <code>npm run dev</code>,
        step&nbsp;1 worked.
      </div>
      <FirestoreCheck />
    </div>
  )
}

export default App
