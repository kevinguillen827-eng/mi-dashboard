import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  subscribeOperations,
  addOperation,
  deleteOperation,
  bulkAddOperations,
} from "../services/firestoreService";
import { syncOperationsToFile, getActiveFileName, checkStoredConnection } from "../services/excelSyncService";
import { calcResultado } from "../utils/trading";

export function useOperations() {
  const { user } = useAuth();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncedFile, setSyncedFile] = useState(null);
  const [needsReconnect, setNeedsReconnect] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const restoreAttempted = useRef(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    if (!restoreAttempted.current) {
      restoreAttempted.current = true;
      checkStoredConnection().then((result) => {
        if (!result) return;
        if (result.granted) {
          setSyncedFile(result.name);
          setNeedsReconnect(null);
        } else {
          setNeedsReconnect(result.name);
        }
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
          setSyncError(null);
        } catch (err) {
          console.error("Error sincronizando con Excel:", err);
          setSyncError("No se pudo escribir en el archivo Excel conectado.");
        }
      }
    });
    return unsub;
  }, [user]);

  const create = (op) => addOperation(user.uid, op);
  const remove = (opId) => deleteOperation(user.uid, opId);
  const bulkCreate = (ops) => bulkAddOperations(user.uid, ops);

  return {
    operations, loading, create, remove, bulkCreate,
    syncedFile, setSyncedFile, needsReconnect, setNeedsReconnect, syncError,
  };
}
