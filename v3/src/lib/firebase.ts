'use client';

// Firebase configuration and initialization
// Note: In production, use environment variables for these values

const firebaseConfig = {
  apiKey: "AIzaSyAMBh6lsa4Fm_rXmyyOWwDxSkKaTki8vvc",
  authDomain: "magpie-talk.firebaseapp.com",
  projectId: "magpie-talk",
  storageBucket: "magpie-talk.firebasestorage.app",
  messagingSenderId: "974959011662",
  appId: "1:974959011662:web:11ce94d351ef1d9edea01f"
};

// Lazy load Firebase to avoid SSR issues
let firebaseApp: any = null;
let auth: any = null;
let db: any = null;

export async function initializeFirebase() {
  if (typeof window === 'undefined') return null;

  if (firebaseApp) return { app: firebaseApp, auth, db };

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } = await import('firebase/auth');
    const { getFirestore, enableIndexedDbPersistence } = await import('firebase/firestore');

    // Initialize Firebase only if not already initialized
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }

    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);

    // Enable offline persistence (best effort)
    try {
      await enableIndexedDbPersistence(db);
    } catch (err: any) {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence unavailable: multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not supported in this browser');
      }
    }

    return { app: firebaseApp, auth, db };
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return null;
  }
}

export async function signInWithGoogle(): Promise<any> {
  const firebase = await initializeFirebase();
  if (!firebase?.auth) {
    throw new Error('Firebase not initialized');
  }

  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();

  // Use popup for desktop, redirect for mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  try {
    if (isMobile) {
      await signInWithRedirect(firebase.auth, provider);
      return null; // Will be handled on redirect back
    } else {
      const result = await signInWithPopup(firebase.auth, provider);
      return result.user;
    }
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      return null; // User cancelled
    }
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  const firebase = await initializeFirebase();
  if (!firebase?.auth) return;

  const { signOut } = await import('firebase/auth');
  await signOut(firebase.auth);
}

export async function onAuthStateChange(callback: (user: any) => void): Promise<() => void> {
  const firebase = await initializeFirebase();
  if (!firebase?.auth) {
    callback(null);
    return () => {};
  }

  const { onAuthStateChanged } = await import('firebase/auth');
  return onAuthStateChanged(firebase.auth, callback);
}

// Firestore helpers for stats sync
export async function saveStatsToCloud(userId: string, stats: any): Promise<void> {
  const firebase = await initializeFirebase();
  if (!firebase?.db) return;

  const { doc, setDoc } = await import('firebase/firestore');
  const ref = doc(firebase.db, 'users', userId, 'progress', 'stats');
  await setDoc(ref, stats, { merge: true });
}

export async function loadStatsFromCloud(userId: string): Promise<any> {
  const firebase = await initializeFirebase();
  if (!firebase?.db) return null;

  const { doc, getDoc } = await import('firebase/firestore');
  const ref = doc(firebase.db, 'users', userId, 'progress', 'stats');
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return snapshot.data();
  }
  return null;
}
