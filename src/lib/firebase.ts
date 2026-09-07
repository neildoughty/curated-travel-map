/*
  Firebase init — Firestore is the data layer decision from docs/build-plan.md
  ("Technical decisions to lock before Epic 0"). Reads config from Vite env
  vars so the actual project keys never get committed to the repo.

  To activate this (Epic 0, Story 0.2):
    1. Create a free Firebase project at https://console.firebase.google.com
    2. Add a Web App inside it — Firebase gives you a config object
    3. Copy .env.example to .env.local and fill in the values from that config
    4. Enable Firestore (Build > Firestore Database > Create database)
    5. Set security rules scoped to a trip's shareToken (not done yet — see
       docs/build-plan.md, Epic 0 Story 0.2, "no accounts" access model)

  Until .env.local exists, `db` below is still created but calls against it
  will fail — that's expected; nothing in the app calls it yet.
*/
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
