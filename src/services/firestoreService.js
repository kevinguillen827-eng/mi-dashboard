// ------------------------------------------------------------------
// Capa de acceso a datos: colección /users/{uid}/operations
// Usa onSnapshot para que cualquier cambio (propio, de otra pestaña,
// o importado desde Excel) se refleje al instante en toda la app.
// ------------------------------------------------------------------
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";

const opsCollection = (uid) => collection(db, "users", uid, "operations");

/**
 * Suscribe a las operaciones del usuario en tiempo real.
 * @param {string} uid
 * @param {(ops: object[]) => void} callback
 * @returns {() => void} función para cancelar la suscripción
 */
export function subscribeOperations(uid, callback) {
  const q = query(opsCollection(uid), orderBy("fecha", "desc"));
  return onSnapshot(q, (snap) => {
    const ops = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(ops);
  });
}

export async function addOperation(uid, operation) {
  return addDoc(opsCollection(uid), {
    ...operation,
    createdAt: serverTimestamp(),
  });
}

export async function deleteOperation(uid, opId) {
  return deleteDoc(doc(db, "users", uid, "operations", opId));
}

/**
 * Inserta muchas operaciones a la vez (usado en la importación de Excel),
 * en lotes de 450 para respetar el límite de 500 escrituras por batch.
 */
export async function bulkAddOperations(uid, operations) {
  const chunks = [];
  for (let i = 0; i < operations.length; i += 450) {
    chunks.push(operations.slice(i, i + 450));
  }
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((op) => {
      const ref = doc(opsCollection(uid));
      batch.set(ref, { ...op, createdAt: serverTimestamp() });
    });
    await batch.commit();
  }
}
