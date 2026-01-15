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
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
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
    // User already exists with their Firebase UID - update last login
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      pending: false,
    });

    return {
      id: userSnap.id,
      ...userSnap.data(),
      lastLogin: new Date(),
    } as UserDoc;
  }

  // Check if there's a pre-added user with this email
  const usersRef = collection(db, 'users');
  const emailQuery = query(
    usersRef,
    where('email', '==', firebaseUser.email?.toLowerCase())
  );
  const emailSnap = await getDocs(emailQuery);

  if (!emailSnap.empty) {
    // Found a pre-added user - migrate to their Firebase UID
    const preAddedDoc = emailSnap.docs[0];
    const preAddedData = preAddedDoc.data();

    // Create new document with Firebase UID
    await setDoc(userRef, {
      ...preAddedData,
      displayName: firebaseUser.displayName || preAddedData.displayName,
      photoURL: firebaseUser.photoURL || '',
      lastLogin: serverTimestamp(),
      pending: false,
    });

    // Delete the old placeholder document
    await deleteDoc(preAddedDoc.ref);

    return {
      id: firebaseUser.uid,
      email: preAddedData.email,
      displayName: firebaseUser.displayName || preAddedData.displayName,
      photoURL: firebaseUser.photoURL || '',
      role: preAddedData.role,
      createdAt: preAddedData.createdAt,
      lastLogin: new Date(),
    } as UserDoc;
  }

  // No user exists - deny access
  // Sign them out and throw an error
  await firebaseSignOut(auth);
  throw new Error('Access denied. Your account has not been added to this system. Please contact an administrator.');
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
