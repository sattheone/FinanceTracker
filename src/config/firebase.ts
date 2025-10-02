import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;