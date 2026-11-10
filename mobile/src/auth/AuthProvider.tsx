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
    if (!snapshot.exists()) {
      await setDoc(ref, { displayName: "", phone, fcmTokens: [], createdAt: Timestamp.now() });
      return;
    }
    // The rules only accept a write when all four fields are present, so a document that lost one
    // (for example edited by hand) would silently reject every push-token save. Put back what is
    // missing, never touching fields that exist.
    const existing = snapshot.data() as Record<string, unknown> | undefined;
    if (!existing) return;
    const missing: Record<string, unknown> = {};
    if (typeof existing.displayName !== "string") missing.displayName = "";
    if (typeof existing.phone !== "string" || !isValidE164(existing.phone)) missing.phone = phone;
    if (!Array.isArray(existing.fcmTokens)) missing.fcmTokens = [];
    if (existing.createdAt === undefined || existing.createdAt === null) missing.createdAt = Timestamp.now();
    if (Object.keys(missing).length > 0) await setDoc(ref, missing, { merge: true });
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
