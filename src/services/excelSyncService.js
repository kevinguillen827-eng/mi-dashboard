// ------------------------------------------------------------------
// Sincronización en tiempo real con un archivo .xlsx real en disco.
//
// Estrategia (File System Access API — Chrome / Edge / Opera):
//   1. El usuario elige o crea un archivo .xlsx una sola vez
//      (showSaveFilePicker). Guardamos el "file handle" en memoria
//      (no es serializable entre recargas por seguridad del navegador).
//   2. Cada vez que la lista de operaciones cambia (Firestore onSnapshot
//      dispara), volcamos el estado completo a ese archivo automáticamente.
//   3. El usuario también puede "Importar" un .xlsx existente en cualquier
//      momento (input file clásico + SheetJS) para traer datos hacia la app.
//
// En navegadores sin soporte para File System Access API (Firefox, Safari)
// se hace fallback automático a exportar/importar manual (descarga + input).
// ------------------------------------------------------------------
import * as XLSX from "xlsx";

export const supportsFileSystemAccess = () =>
  typeof window !== "undefined" && "showSaveFilePicker" in window;

let activeFileHandle = null;

export function getActiveFileName() {
  return activeFileHandle ? activeFileHandle.name : null;
}

export function disconnectFile() {
  activeFileHandle = null;
}

/** Abre el selector para crear/elegir el archivo Excel que se mantendrá sincronizado. */
export async function chooseSyncFile() {
  if (!supportsFileSystemAccess()) {
    throw new Error(
      "Tu navegador no soporta sincronización directa con archivos. Usa Chrome, Edge u Opera, o utiliza Importar/Exportar manual."
    );
  }
  activeFileHandle = await window.showSaveFilePicker({
    suggestedName: `ledger_operaciones_${new Date().toISOString().slice(0, 10)}.xlsx`,
    types: [
      {
        description: "Libro de Excel",
        accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
      },
    ],
  });
  return activeFileHandle.name;
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
  XLSX.utils.book_append_sheet(wb, ws, "Operaciones");
  return wb;
}

/**
 * Escribe el estado actual de operaciones directamente en el archivo
 * conectado (si existe). Se llama automáticamente en cada cambio de datos.
 */
export async function syncOperationsToFile(operations, calcResultado) {
  if (!activeFileHandle) return false;
  const wb = operationsToWorkbook(operations, calcResultado);
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const writable = await activeFileHandle.createWritable();
  await writable.write(out);
  await writable.close();
  return true;
}

/** Descarga manual (fallback universal, funciona en cualquier navegador). */
export function downloadOperationsAsExcel(operations, calcResultado) {
  const wb = operationsToWorkbook(operations, calcResultado);
  XLSX.writeFile(wb, `ledger_operaciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** Lee un archivo .xlsx/.csv (desde <input type="file">) y devuelve operaciones normalizadas. */
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
    comision: Number(findKey(row, ["Comisión", "Comision"])) || 0,
    estrategia: findKey(row, ["Estrategia"]) || "",
    mercado: findKey(row, ["Par/Mercado", "Mercado"]) || "",
    riesgoPct: Number(findKey(row, ["Riesgo (%)", "Riesgo"])) || "",
    notas: findKey(row, ["Notas"]) || "",
  };
}
