import {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signOut as authSignOut,
  onAuthChange,
  getCurrentUserDoc,
} from '../services/auth';
import type { UserDoc, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

// Dev-only auth bypass. Gated by BOTH import.meta.env.DEV (stripped in prod builds)
// AND an explicit env var, so a prod bundle can never accidentally ship a bypass.
const DEV_SKIP_AUTH =
  import.meta.env.DEV && import.meta.env.VITE_DEV_SKIP_AUTH === 'true';

const DEV_FAKE_USER: UserDoc = {
  id: 'dev-admin',
  email: 'dev@localhost',
  displayName: 'Dev Admin',
  photoURL: '',
  role: 'admin',
  createdAt: new Date(),
  lastLogin: new Date(),
} as UserDoc;

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserDoc | null>(DEV_SKIP_AUTH ? DEV_FAKE_USER : null);
  const [loading, setLoading] = useState(!DEV_SKIP_AUTH);

  useEffect(() => {
    if (DEV_SKIP_AUTH) {
      // eslint-disable-next-line no-console
      console.warn('[useAuth] VITE_DEV_SKIP_AUTH is enabled — signed in as fake admin.');
      return;
    }

    let cancelled = false;
    const unsubscribe = onAuthChange(async (firebaseUser: User | null) => {
      if (firebaseUser) {
        // Get the full user doc from Firestore
        const userDoc = await getCurrentUserDoc();
        if (cancelled) return;
        setUser(userDoc);
      } else {
        if (cancelled) return;
        setUser(null);
      }
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signIn = async () => {
    if (DEV_SKIP_AUTH) {
      setUser(DEV_FAKE_USER);
      return;
    }
    setLoading(true);
    try {
      const userDoc = await signInWithGoogle();
      setUser(userDoc);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (DEV_SKIP_AUTH) {
      setUser(null);
      return;
    }
    await authSignOut();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to check if user is admin
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === 'admin';
}

// Hook to check if user can create passwords
export function useCanCreatePasswords(): boolean {
  const { user } = useAuth();
  return user?.role === 'admin' || user?.role === 'technician';
}
