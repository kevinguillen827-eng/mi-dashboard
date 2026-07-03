import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  subscribeOperations,
  addOperation,
  deleteOperation,
  bulkAddOperations,
} from "../services/firestoreService";
import { syncOperationsToFile, getActiveFileName, restoreSyncedFile } from "../services/excelSyncService";
import { calcResultado } from "../utils/trading";

/**
 * Fuente única de verdad para las operaciones del usuario.
 * - Se suscribe a Firestore en tiempo real (onSnapshot).
 * - Al iniciar sesión, intenta restaurar automáticamente la conexión
 *   con el archivo Excel guardada en IndexedDB (si existe), para que
 *   la sincronización sobreviva a cerrar sesión o recargar la página.
 * - Cada vez que hay un cambio, si hay un archivo Excel conectado,
 *   lo vuelve a escribir automáticamente (sincronización en tiempo real).
 */
export function useOperations() {
  const { user } = useAuth();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncedFile, setSyncedFile] = useState(null);
  const firstLoad = useRef(true);
  const restoreAttempted = useRef(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Restaura la conexión con el archivo Excel una sola vez por sesión,
    // sin bloquear la carga de operaciones (corre en paralelo).
    if (!restoreAttempted.current) {
      restoreAttempted.current = true;
      restoreSyncedFile().then((fileName) => {
        if (fileName) setSyncedFile(fileName);
      });
    }

    const unsub = subscribeOperations(user.uid, async (ops) => {
      setOperations(ops);
      setLoading(false);
      const fileName = getActiveFileName();
      if (fileName) {
        setSyncedFile(fileName);
        try {
          await syncOperationsToFile(ops, calcResultado);
        } catch (err) {
          console.error("Error sincronizando con Excel:", err);
        }
      }
      firstLoad.current = false;
    });
    return unsub;
  }, [user]);

  const create = (op) => addOperation(user.uid, op);
  const remove = (opId) => deleteOperation(user.uid, opId);
  const bulkCreate = (ops) => bulkAddOperations(user.uid, ops);

  return { operations, loading, create, remove, bulkCreate, syncedFile, setSyncedFile };
}
