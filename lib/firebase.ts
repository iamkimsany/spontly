// Firebase — initialized with BOTH modular SDK and compat SDK.
// expo-firebase-recaptcha uses firebase/compat internally on web,
// so we must call initializeApp on the compat namespace too.

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithCredential, PhoneAuthProvider, Auth } from 'firebase/auth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

export const firebaseConfig = {
  apiKey: 'AIzaSyBP9gZ3o9b57fU7pz4wD757E7v-mS4hlmE',
  authDomain: 'labs-f936a.firebaseapp.com',
  projectId: 'labs-f936a',
  storageBucket: 'labs-f936a.firebasestorage.app',
  messagingSenderId: '106149870332',
  appId: '1:106149870332:ios:dcc7660337b7d9de1cb579',
};

// Initialize modular SDK
let _modularApp: FirebaseApp;
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    _modularApp = initializeApp(firebaseConfig);
  } else {
    _modularApp = getApp();
  }
  return _modularApp;
}

// Initialize compat SDK (required by expo-firebase-recaptcha on web)
if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

export { firebase };

// ---- Auth helpers ----

let _auth: Auth;
export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

// ---- Phone Auth ----

let verificationIdStore: string | null = null;

export function getStoredVerificationId(): string | null {
  return verificationIdStore;
}

export function setStoredVerificationId(id: string) {
  verificationIdStore = id;
}

export async function confirmOTP(verificationId: string, code: string): Promise<string> {
  const auth = getFirebaseAuth();
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const result = await signInWithCredential(auth, credential);
  return result.user.uid;
}

export async function signOutFirebase() {
  await getFirebaseAuth().signOut();
}
