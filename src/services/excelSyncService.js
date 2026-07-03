// ------------------------------------------------------------------
// Sincronización en tiempo real con un archivo .xlsx real en disco.
//
// Estrategia (File System Access API - Chrome / Edge / Opera):
//   1. El usuario elige o crea un archivo .xlsx una sola vez
//      (showSaveFilePicker). El "file handle" resultante se guarda
//      en IndexedDB (si es serializable ahi, a diferencia de
//      localStorage/sessionStorage), para que la conexion persista
//      entre recargas, cierres de sesion y reinicios del navegador.
//   2. Cada vez que la lista de operaciones cambia (Firestore onSnapshot
//      dispara), volcamos el estado completo a ese archivo automaticamente.
//   3. El usuario tambien puede "Importar" un .xlsx existente en cualquier
//      momento (input file clasico + SheetJS) para traer datos hacia la app.
//   4. La conexion solo se elimina si el usuario pulsa "Desconectar".
//
// En navegadores sin soporte para File System Access API (Firefox, Safari)
// se hace fallback automatico a exportar/importar manual (descarga + input).
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
