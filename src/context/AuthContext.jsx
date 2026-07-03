import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider, ADMIN_UIDS } from "../firebase/config";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // IMPORTANTE: todo el trabajo async va dentro de try/catch/finally.
      // Si Firestore falla (reglas no publicadas, sin conexión, etc.),
      // el finally garantiza que loading siempre se apague y la app
      // nunca se quede congelada en "Cargando...".
      try {
        if (firebaseUser) {
          const ref = doc(db, "users", firebaseUser.uid);
          let profile;
          try {
            const snap = await getDoc(ref);
            if (!snap.exists()) {
              const newProfile = {
                name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
                email: firebaseUser.email,
                role: ADMIN_UIDS.includes(firebaseUser.uid) ? "admin" : "trader",
                createdAt: serverTimestamp(),
              };
              await setDoc(ref, newProfile);
              profile = newProfile;
            } else {
              profile = snap.data();
            }
          } catch (firestoreErr) {
            // Si Firestore falla (p. ej. reglas de seguridad no publicadas
            // o permission-denied), no bloqueamos el login: usamos un
            // perfil mínimo basado solo en Firebase Auth.
            console.error("Error leyendo/creando perfil en Firestore:", firestoreErr);
            profile = {
              name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
              email: firebaseUser.email,
              role: ADMIN_UIDS.includes(firebaseUser.uid) ? "admin" : "trader",
            };
          }
          setUser({ uid: firebaseUser.uid, ...profile });
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const loginEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const registerEmail = async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    return cred;
  };

  const loginGoogle = () => signInWithPopup(auth, googleProvider);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{ user, loading, loginEmail, registerEmail, loginGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
