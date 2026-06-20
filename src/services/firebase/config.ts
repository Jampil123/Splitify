import { getApp, getApps, initializeApp } from 'firebase/app';
import {
    createUserWithEmailAndPassword,
    User as FirebaseUser,
    getAuth,
    getReactNativePersistence,
    GoogleAuthProvider,
    initializeAuth,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithCredential,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
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
    FirebaseStorage,
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

// Initialize Auth with AsyncStorage persistence so sessions survive app restarts
let auth: ReturnType<typeof getAuth>;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
} catch {
    // initializeAuth throws on hot reload — fall back to existing instance
    auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage with error handling (optional feature)
let storage: FirebaseStorage | null = null;
let isStorageAvailable: boolean = false;  // ✅ This is a boolean, NOT a function

try {
    // Only try to initialize storage if storageBucket is provided
    if (firebaseConfig.storageBucket && firebaseConfig.storageBucket !== '') {
        storage = getStorage(app);
        isStorageAvailable = true;
        console.log('✅ Firebase Storage initialized');
    } else {
        console.log('⚠️ Firebase Storage bucket not configured - storage features disabled');
    }
} catch (error) {
    console.warn('⚠️ Firebase Storage initialization failed - storage features will be disabled:', error);
    storage = null;
    isStorageAvailable = false;
}

// Export all Firebase services
export {
    addDoc,
    // App
    app, arrayRemove,
    arrayUnion,
    // Auth
    auth, collection, createUserWithEmailAndPassword,
    // Firestore
    db, deleteDoc, deleteObject, doc,
    getDoc,
    getDocs, getDownloadURL, GoogleAuthProvider, increment,
    // Storage helper (boolean value)
    isStorageAvailable, limit, onAuthStateChanged, orderBy,
    query, ref, sendPasswordResetEmail, serverTimestamp,
    setDoc, signInWithCredential,
    signInWithEmailAndPassword,
    signOut, startAfter,
    // Storage (may be null)
    storage, Timestamp,
    updateDoc, updateProfile, uploadBytes, where,
    writeBatch
};

// Export types separately
export type {
    DocumentData,
    DocumentReference, FirebaseStorage, FirebaseUser,
    QueryConstraint,
    QueryDocumentSnapshot
};
