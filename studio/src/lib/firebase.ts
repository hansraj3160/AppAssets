import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "appassets-studio",
  appId: "1:523551846634:web:c0abef607a5d8694ee2793",
  storageBucket: "appassets-studio.firebasestorage.app",
  apiKey: "AIzaSyBm91WFynsiWMVknIJTMkcnbb90J9RZ4ZU",
  authDomain: "appassets-studio.firebaseapp.com",
  messagingSenderId: "523551846634",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
