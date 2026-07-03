// ------------------------------------------------------------------
// Sincronización en tiempo real con un archivo .xlsx real en disco.
// ------------------------------------------------------------------
import * as XLSX from "xlsx";

export const supportsFileSystemAccess = () =>
  typeof window !== "undefined" && "showSaveFilePicker" in window;

let activeFileHandle = null;

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
 * Revisa si hay un archivo guardado en IndexedDB de una sesión anterior,
 * SIN pedir permiso (queryPermission no requiere interacción del usuario,
 * a diferencia de requestPermission). Sirve para mostrar en la interfaz
 * "tenías X.xlsx conectado" y decidir si hace falta reconectar con un click.
 */
export async function checkStoredConnection() {
  if (!supportsFileSystemAccess()) return null;
  try {
    const handle = await loadHandleFromDb();
    if (!handle) return null;
    const permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission === "granted") {
      activeFileHandle = handle;
      return { name: handle.name, granted: true };
    }
    return { name: handle.name, granted: false };
  } catch (err) {
    console.error("No se pudo revisar la conexión guardada:", err);
    return null;
  }
}

/**
 * Reconecta el archivo guardado pidiendo el permiso explícitamente.
 * DEBE llamarse directamente desde un manejador de click (onClick),
 * porque los navegadores exigen un gesto del usuario para requestPermission
 * cuando el permiso no está ya concedido.
 */
export async function reconnectStoredFile() {
  const handle = await loadHandleFromDb();
  if (!handle) throw new Error("No hay ningún archivo guardado para reconectar.");
  const permission = await handle.requestPermission({ mode: "readwrite" });
  if (permission !== "granted") throw new Error("Permiso denegado para el archivo.");
  activeFileHandle = handle;
  return handle.name;
}

/**
 * Intenta restaurar la conexión con el archivo Excel guardado
 * en un inicio de sesión anterior (o antes de recargar la página),
 * SOLO si el navegador ya tiene el permiso concedido (sin pedirlo).
 * Devuelve el nombre del archivo si se restauró, o null si no había
 * ninguno guardado o el permiso no está activo (requiere reconnectStoredFile).
 */
export async function restoreSyncedFile() {
  if (!supportsFileSystemAccess()) return null;
  try {
    const handle = await loadHandleFromDb();
    if (!handle) return null;

    const permission = await handle.queryPermission({ mode: "readwrite" });
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

export async function disconnectFile() {
  activeFileHandle = null;
  await clearHandleFromDb();
}

export async function chooseSyncFile() {
  if (!supportsFileSystemAccess()) {
    throw new Error(
      "Tu navegador no soporta sincronizacion directa con archivos. Usa Chrome, Edge u Opera, o utiliza Importar/Exportar manual."
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
    "Comision": o.comision,
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
  XLSX.utils.book_append_sheet(wb, ws, "Operaciones");
  return wb;
}

export async function syncOperationsToFile(operations, calcResultado) {
  if (!activeFileHandle) return false;
  const wb = operationsToWorkbook(operations, calcResultado);
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const writable = await activeFileHandle.createWritable();
  await writable.write(out);
  await writable.close();
  return true;
}

export function downloadOperationsAsExcel(operations, calcResultado) {
  const wb = operationsToWorkbook(operations, calcResultado);
  XLSX.writeFile(wb, `ledger_operaciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        resolve(json.map(normalizeRow));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

function findKey(row, keys) {
  for (const k of keys) {
    const found = Object.keys(row).find((kk) => kk.trim().toLowerCase() === k.toLowerCase());
    if (found) return row[found];
  }
  return "";
}

function normalizeRow(row) {
  let fecha = findKey(row, ["Fecha"]);
  if (typeof fecha === "number") {
    const d = XLSX.SSF.parse_date_code(fecha);
    fecha = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return {
    fecha: fecha || new Date().toISOString().slice(0, 10),
    activo: findKey(row, ["Activo"]) || "N/D",
    tipo: findKey(row, ["Tipo"]) === "Venta" ? "Venta" : "Compra",
    cantidad: Number(findKey(row, ["Cantidad"])) || 0,
    precioEntrada: Number(findKey(row, ["Precio Entrada", "PrecioEntrada"])) || 0,
    precioSalida: Number(findKey(row, ["Precio Salida", "PrecioSalida"])) || 0,
    comision: Number(findKey(row, ["Comision"])) || 0,
    estrategia: findKey(row, ["Estrategia"]) || "",
    mercado: findKey(row, ["Par/Mercado", "Mercado"]) || "",
    riesgoPct: Number(findKey(row, ["Riesgo (%)", "Riesgo"])) || "",
    notas: findKey(row, ["Notas"]) || "",
  };
}
