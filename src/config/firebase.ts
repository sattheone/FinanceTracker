import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  disableNetwork,
  enableNetwork,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB3iPF9zVqLetH50OKs4tWNR96-JzeEpcg",
  authDomain: "financetracker-b00a6.firebaseapp.com",
  projectId: "financetracker-b00a6",
  storageBucket: "financetracker-b00a6.firebasestorage.app",
  messagingSenderId: "896037855341",
  appId: "1:896037855341:web:3fcebf0bf1e9db72f35f64"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

/** Go offline — all reads from IndexedDB cache, writes queued locally */
export const goOffline = () => disableNetwork(db);

/** Go online — flush queued writes and read from server */
export const goOnline = () => enableNetwork(db);

export const auth = getAuth(app);

// Local emulator wiring — opt-in via `VITE_USE_EMULATORS=true` (e.g. `npm run dev:emulators`).
// Never runs against production: guarded by the env flag, which is only set in
// the emulator dev script. Ports match firebase.json.
if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  // eslint-disable-next-line no-console
  console.warn("🔧 Firebase EMULATORS active (auth:9099, firestore:8080)");
}

export default app;