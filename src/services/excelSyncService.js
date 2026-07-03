// ------------------------------------------------------------------
// Sincronización en tiempo real con un archivo .xlsx real en disco.
//
// Estrategia (File System Access API — Chrome / Edge / Opera):
//   1. El usuario elige o crea un archivo .xlsx una sola vez
//      (showSaveFilePicker). El "file handle" resultante se guarda
//      en IndexedDB (sí es serializable ahí, a diferencia de
//      localStorage/sessionStorage), para que la conexión persista
//      entre recargas, cierres de sesión y reinicios del navegador.
//   2. Cada vez que la lista de operaciones cambia (Firestore onSnapshot
//      dispara), volcamos el estado completo a ese archivo automáticamente.
//   3. El usuario también puede "Importar" un .xlsx existente en cualquier
//      momento (input file clásico + SheetJS) para traer datos hacia la app.
//   4. La conexión solo se elimina si el usuario pulsa "Desconectar".
//
// En navegadores sin soporte para File System Access API (Firefox, Safari)
// se hace fallback automático a exportar/importar manual (descarga + input).
// ------------------------------------------------------------------
import * as XLSX from "xlsx";

export const supportsFileSystemAccess = () =>
  typeof window !== "undefined" && "showSaveFilePicker" in window;

let activeFileHandle = null;

// ---- Persistencia del handle en IndexedDB ----
const DB_NAME = "ledger-excel-sync";
const STORE_NAME = "handles";
const HANDLE_KEY = "activeFileHandle";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandleToDb(handle) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadHandleFromDb() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function clearHandleFromDb() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Intenta restaurar la conexión con el archivo Excel guardado
 * en un inicio de sesión anterior (o antes de recargar la página).
 * Si el navegador requiere confirmar el permiso de nuevo (por
 * seguridad, luego de cerrar la pestaña), lo solicita automáticamente.
 * Devuelve el nombre del archivo si se restauró, o null si no había
 * ninguno guardado o el usuario negó el permiso.
 */
export async function restoreSyncedFile() {
  if (!supportsFileSystemAccess()) return null;
  try {
    const handle = await loadHandleFromDb();
    if (!handle) return null;

    let permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      permission = await handle.requestPermission({ mode: "readwrite" });
    }
    if (permission !== "granted") return null;

    activeFileHandle = handle;
    return handle.name;
  } catch (err) {
    console.error("No se pudo restaurar el archivo Excel sincronizado:", err);
    return null;
  }
}

export function getActiveFileName() {
  return activeFileHandle ? activeFileHandle.name : null;
}

/** Desconecta el archivo por completo (acción explícita del usuario). */
export async function disconnectFile() {
  activeFileHandle = null;
  await clearHandleFromDb();
}

/** Abre el selector para crear/elegir el archivo Excel que se mantendrá sincronizado. */
export async function chooseSyncFile() {
  if (!supportsFileSystemAccess()) {
    throw new Error(
      "Tu navegador no soporta sincronización directa con archivos. Usa Chrome, Edge u Opera, o utiliza Importar/Exportar manual."
    );
  }
  const handle = await window.showSaveFilePicker({
    suggestedName: `ledger_operaciones_${new Date().toISOString().slice(0, 10)}.xlsx`,
    types: [
      {
        description: "Libro de Excel",
        accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
      },
    ],
  });
  activeFileHandle = handle;
  await saveHandleToDb(handle);
  return handle.name;
}

function operationsToWorkbook(operations, calcResultado) {
  const rows = operations.map((o) => ({
    Fecha: o.fecha,
    Activo: o.activo,
    Tipo: o.tipo,
    Cantidad: o.cantidad,
    "Precio Entrada": o.precioEntrada,
    "Precio Salida": o.precioSalida,
    Comisión: o.comision,
    Estrategia: o.estrategia,
    "Par/Mercado": o.mercado || "",
    "Riesgo (%)": o.riesgoPct || "",
    Notas: o.notas,
    "Resultado ($)": Number(calcResultado(o).toFixed(2)),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 13 },
    { wch: 13 }, { wch: 11 }, { wch: 16 }, { wch: 12 }, { wch: 11 },
    { wch: 30 }, { wch: 13 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws,
