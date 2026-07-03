// ------------------------------------------------------------------
// Verifica el ID token de Firebase enviado por el cliente en el
// header Authorization: Bearer <token>, para proteger las rutas
// de este backend con la misma identidad usada en el frontend.
// ------------------------------------------------------------------
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Falta token de autenticación." });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // { uid, email, ... }
    next();
  } catch (err) {
    res.status(401).json({ error: "Token inválido o expirado." });
  }
}
