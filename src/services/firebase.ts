import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC8XuV90IqFlQbUp_eOkSHAkvM09nyodjg",
  authDomain: "trophia-5ed6c.firebaseapp.com",
  projectId: "trophia-5ed6c",
  storageBucket: "trophia-5ed6c.firebasestorage.app",
  messagingSenderId: "432560806530",
  appId: "1:432560806530:web:dd18d1b2d82d56e33ef29b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Apply custom parameters to Google Provider if needed
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export default app;
