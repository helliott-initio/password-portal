import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import type { UserDoc } from '../types';

// Sign in with Google
export async function signInWithGoogle(): Promise<UserDoc | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check/create user document
    const userDoc = await getOrCreateUser(user);
    return userDoc;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('Sign in error:', firebaseError);

    // Handle specific errors
    if (firebaseError.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized for sign-in');
    }
    if (firebaseError.code === 'auth/popup-closed-by-user') {
      return null; // User cancelled
    }

    throw error;
  }
}

// Sign out
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// Get or create user document in Firestore
async function getOrCreateUser(firebaseUser: User): Promise<UserDoc> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // Update last login
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
    });

    return {
      id: userSnap.id,
      ...userSnap.data(),
      lastLogin: new Date(),
    } as UserDoc;
  }

  // Create new user (default role: technician)
  // First user could be made admin via Firestore console
  const newUser: Omit<UserDoc, 'id'> = {
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || '',
    role: 'technician',
    createdAt: new Date(),
    lastLogin: new Date(),
  };

  await setDoc(userRef, {
    ...newUser,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  });

  return {
    id: firebaseUser.uid,
    ...newUser,
  };
}

// Get current user document
export async function getCurrentUserDoc(): Promise<UserDoc | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return null;

  return {
    id: userSnap.id,
    ...userSnap.data(),
  } as UserDoc;
}

// Subscribe to auth state changes
export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

// Check if user has admin role
export function isAdmin(user: UserDoc | null): boolean {
  return user?.role === 'admin';
}

// Check if user has technician or admin role
export function canCreatePasswords(user: UserDoc | null): boolean {
  return user?.role === 'admin' || user?.role === 'technician';
}
