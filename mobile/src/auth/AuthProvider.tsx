import { getAuth, onAuthStateChanged, type User } from "@react-native-firebase/auth";
import { doc, getDoc, getFirestore, setDoc, Timestamp } from "@react-native-firebase/firestore";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isValidE164 } from "../utils/phone";

export interface AppAuthUser {
  uid: string;
  phoneNumber: string | null;
}

export interface AuthContextValue {
  /** null while signed out (and during the first tick before auth state arrives). */
  user: AppAuthUser | null;
  /** True until the first onAuthStateChanged callback decides signed-in or signed-out. */
  initialising: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside an AuthProvider");
  return value;
}

/** Create users/{uid} on first sign-in, if missing (self-writable per the access-control spec). */
async function ensureUserDoc(firebaseUser: User): Promise<void> {
  try {
    const phone = firebaseUser.phoneNumber;
    if (!phone || !isValidE164(phone)) return;
    const db = getFirestore();
    const ref = doc(db, "users", firebaseUser.uid);
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) return;
    await setDoc(ref, { displayName: "", phone, fcmTokens: [], createdAt: Timestamp.now() });
  } catch (error) {
    // Ids and statuses only in logs (hard rule 6).
    const code = (error as { code?: string } | null)?.code ?? "unknown";
    console.warn(`users doc provisioning failed code=${code}`);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (firebaseUser) => {
      setUser(
        firebaseUser ? { uid: firebaseUser.uid, phoneNumber: firebaseUser.phoneNumber } : null,
      );
      setInitialising(false);
      if (firebaseUser) void ensureUserDoc(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, initialising }}>{children}</AuthContext.Provider>;
}
