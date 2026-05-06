import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Using initializeFirestore to set experimentalForceLongPolling which often fixes "offline" issues
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') ? firebaseConfig.firestoreDatabaseId : undefined);

export const auth = getAuth(app);
auth.languageCode = 'pt';
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Connectivity check
async function testConnection() {
  if (typeof window === 'undefined') return;
  
  try {
    await getDocFromServer(doc(db, 'test', 'connection')).catch(err => {
      if (err.message.includes('the client is offline')) {
         console.warn("Firestore reports client is offline.");
      }
    });
    console.log("Firestore reachability test completed.");
  } catch (error) {
    console.debug("Firebase connection test failed:", error);
  }
}

testConnection();
