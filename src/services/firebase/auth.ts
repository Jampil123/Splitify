import {
    FirebaseUser,
    GoogleAuthProvider,
    auth,
    createUserWithEmailAndPassword,
    db,
    doc,
    getDoc,
    onAuthStateChanged,
    sendPasswordResetEmail,
    serverTimestamp,
    setDoc, // ✅ ADD THIS - db was missing
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
} from './config';

import { LoginData, RegisterData, User } from '@/types';

// ============ Authentication Methods ============

// Email/Password Login
export async function loginWithEmail({ email, password }: LoginData) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update last login
    await updateUserLastLogin(user.uid);
    
    return { success: true, user, error: null };
  } catch (error: any) {
    let message = 'Login failed';
    switch (error.code) {
      case 'auth/user-not-found':
        message = 'User not found';
        break;
      case 'auth/wrong-password':
        message = 'Invalid password';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email format';
        break;
      case 'auth/user-disabled':
        message = 'Account disabled';
        break;
      default:
        message = error.message;
    }
    return { success: false, user: null, error: message };
  }
}

// Email/Password Registration
export async function registerWithEmail({ email, password, fullName }: RegisterData) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update display name
    await updateProfile(user, { displayName: fullName });
    
    // Create user document in Firestore
    await createUserDocument(user.uid, {
      email,
      fullName,
      photoURL: null,
    });
    
    return { success: true, user, error: null };
  } catch (error: any) {
    let message = 'Registration failed';
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Email already in use';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email format';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters';
        break;
      default:
        message = error.message;
    }
    return { success: false, user: null, error: message };
  }
}

// Google Sign In
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if user document exists
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // Create new user document for first-time Google sign-in
      await createUserDocument(user.uid, {
        email: user.email!,
        fullName: user.displayName || '',
        photoURL: user.photoURL,
      });
    } else {
      // Update last login
      await updateUserLastLogin(user.uid);
    }
    
    return { success: true, user, error: null };
  } catch (error: any) {
    return { success: false, user: null, error: error.message };
  }
}

// Logout
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Password Reset
export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error: any) {
    let message = 'Password reset failed';
    switch (error.code) {
      case 'auth/user-not-found':
        message = 'No user found with this email';
        break;
      default:
        message = error.message;
    }
    return { success: false, error: message };
  }
}

// ============ User Document Management ============

// Create user document in Firestore
export async function createUserDocument(
  userId: string,
  userData: {
    email: string;
    fullName: string;
    photoURL: string | null;
  }
) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = {
      id: userId,
      email: userData.email,
      fullName: userData.fullName,
      photoURL: userData.photoURL,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      friends: [],
      groups: [],
      notificationsEnabled: true,
      emailNotifications: true,
      totalOwed: 0,
      totalToReceive: 0,
    };
    
    await setDoc(userRef, userDoc);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Update user's last login timestamp
export async function updateUserLastLogin(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get current user data from Firestore
export async function getCurrentUserData(userId: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(userId: string, data: Partial<User>) {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, data, { merge: true });
    
    // Also update Firebase Auth display name if provided
    if (data.fullName && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: data.fullName });
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============ Auth State Listener ============

// Hook-friendly auth state observer
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Get current auth token for Cloud Function calls
export async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}