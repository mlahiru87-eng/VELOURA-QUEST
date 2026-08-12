import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  enableMultiTabIndexedDbPersistence,
  setLogLevel
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Silence verbose internal firestore logs in favor of app context error handling
try {
  setLogLevel('error');
} catch (e) {
  // ignore
}

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Enable Firestore multi-tab offline persistence for instant local caching and PWA support
try {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore multi-tab persistence failed (multiple tabs open)');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence is not supported by current browser environment');
    }
  });
} catch (e) {
  console.info('Offline persistence initialized or handled silently.');
}
