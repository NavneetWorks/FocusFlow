import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDzX3TRC-9QGHOuPO8Y6U69JIsadeCBUck",
  authDomain: "flowfocus-ai.firebaseapp.com",
  projectId: "flowfocus-ai",
  storageBucket: "flowfocus-ai.firebasestorage.app",
  messagingSenderId: "853070965991",
  appId: "1:853070965991:web:8dac5028f3a508e77a0642",
  measurementId: "G-G8V2HWFBCV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
