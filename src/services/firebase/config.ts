import { getApp, getApps, initializeApp } from 'firebase/app';
import {
    createUserWithEmailAndPassword,
    User as FirebaseUser,
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile
} from 'firebase/auth';
import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    DocumentData,
    DocumentReference,
    getDoc,
    getDocs,
    getFirestore,
    increment,
    limit,
    orderBy,
    query,
    QueryConstraint,
    QueryDocumentSnapshot,
    serverTimestamp,
    setDoc,
    startAfter,
    Timestamp,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import {
    deleteObject,
    getDownloadURL,
    getStorage,
    ref,
    uploadBytes
} from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export all Firebase services and methods
export {
    addDoc,
    // App
    app, arrayRemove, arrayUnion,
    // Auth
    auth, collection, createUserWithEmailAndPassword,
    // Firestore
    db, deleteDoc, deleteObject, doc,
    getDoc,
    getDocs, getDownloadURL, GoogleAuthProvider, increment, limit, onAuthStateChanged, orderBy, query, ref, sendPasswordResetEmail, serverTimestamp, setDoc, signInWithEmailAndPassword, signInWithPopup, signOut, startAfter,
    // Storage
    storage, Timestamp, updateDoc, updateProfile, uploadBytes, where, writeBatch
};

// Export types
    export type { DocumentData, DocumentReference, FirebaseUser, QueryConstraint, QueryDocumentSnapshot };

