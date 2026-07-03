# LEDGER — Diario de Trading Profesional

Aplicación completa para registrar operaciones de trading, con autenticación,
base de datos en tiempo real, dashboard con métricas avanzadas, panel de
administración y **sincronización en tiempo real con un archivo Excel real**.

---

## 1. Arquitectura

```
ledger-trading/
├── src/                        # Frontend (React + Vite)
│   ├── main.jsx                 # Punto de entrada
│   ├── App.jsx                  # Rutas (React Router)
│   ├── firebase/config.js       # Inicialización de Firebase
│   ├── context/AuthContext.jsx  # Estado global de sesión (login/registro/roles)
│   ├── hooks/useOperations.js   # Suscripción en tiempo real + sync a Excel
│   ├── services/
│   │   ├── firestoreService.js  # CRUD de operaciones en Firestore
│   │   └── excelSyncService.js  # Lectura/escritura de archivos .xlsx
│   ├── utils/trading.js         # Cálculos financieros (PnL, drawdown, etc.)
│   ├── components/              # Componentes reutilizables (Sidebar, StatCard, charts…)
│   └── pages/                   # Dashboard, NuevaOperacion, Historial, ExcelSync, Admin, Login
├── firestore.rules              # Reglas de seguridad de Firestore
├── .env.example                 # Variables de entorno del frontend
└── server/                      # Backend OPCIONAL (Node.js + Express + PostgreSQL)
    ├── index.js
    ├── config/db.js
    ├── middleware/auth.js       # Verifica tokens de Firebase en el backend
    ├── routes/reports.js        # API REST de reportes agregados
    └── .env.example
```

### ¿Por qué esta arquitectura?

- **Firebase Auth + Firestore** cubre el 100% de la app principal: login,
  roles, y CRUD de operaciones con **actualizaciones en tiempo real**
  (`onSnapshot`) sin necesidad de un servidor propio.
- El **backend Node/Express + PostgreSQL es opcional**: solo lo necesitas si
  quieres reportes agregados pesados, archivado histórico a largo plazo fuera
  de Firestore, o integraciones que no deban vivir en el cliente. Se conecta
  verificando el mismo token de Firebase (`firebase-admin`), así que ambos
  sistemas comparten la misma identidad de usuario.

---

## 2. Sincronización en tiempo real con Excel

Esto es lo más particular del proyecto. Funciona así:

1. En la pestaña **"Sincronización Excel"**, el usuario pulsa **"Conectar
   archivo Excel"**. El navegador (Chrome/Edge/Opera, vía *File System
   Access API*) permite elegir o crear un `.xlsx` en el disco del usuario.
2. A partir de ahí, el hook `useOperations` escucha Firestore en tiempo real.
   Cada vez que cambia algo (nueva operación, eliminación, importación), se
   vuelve a escribir automáticamente ese mismo archivo con `SheetJS`.
3. También puedes hacer el camino inverso: **Importar Excel** desde
   Historial, que lee cualquier `.xlsx`/`.csv` y crea las operaciones
   correspondientes en Firestore (lo que dispara de nuevo el paso 2).

> **Nota de compatibilidad:** la File System Access API solo existe en
> navegadores basados en Chromium. En Firefox/Safari, la app cae
> automáticamente al modo manual (botones de Exportar/Importar), que
> funciona en cualquier navegador pero sin la escritura automática al vuelo.

---

## 3. Instalación

### Requisitos
- Node.js 18+
- Una cuenta de Firebase (gratis) con Authentication y Firestore habilitados
- (Opcional) PostgreSQL si usarás el backend REST

### Frontend

```bash
cd ledger-trading
npm install
cp .env.example .env      # completa con tus credenciales de Firebase
npm run dev                # http://localhost:5173
```

### Configurar Firebase

1. Crea un proyecto en https://console.firebase.google.com
2. Habilita **Authentication** → métodos "Correo/contraseña" y "Google"
3. Habilita **Firestore Database** (modo producción)
4. Copia las credenciales del SDK web a tu `.env`
5. Publica las reglas de seguridad:
   ```bash
   firebase deploy --only firestore:rules
   ```
   (o pega el contenido de `firestore.rules` manualmente en la consola)
6. Para el panel de administración, agrega tu propio UID a
   `VITE_ADMIN_UIDS` en `.env` (lo obtienes en Authentication → Usuarios).

### Backend opcional (API REST)

```bash
cd server
npm install
cp .env.example .env       # completa DATABASE_URL y credenciales de Firebase Admin
npm run dev                 # http://localhost:4000
```

Crea la tabla SQL sugerida en `server/config/db.js` (comentario al final del archivo)
antes de usar `/api/reports`.

---

## 4. Build de producción

```bash
npm run build      # genera /dist listo para Firebase Hosting, Vercel, Netlify, etc.
npm run preview    # sirve /dist localmente para probarlo
```

Despliegue rápido a Firebase Hosting:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # elige "dist" como carpeta pública, SPA: sí
firebase deploy
```

---

## 5. Funcionalidades del Dashboard

- Balance total, resultado mensual y semanal
- Win rate, profit factor, expectancy (esperanza matemática)
- Máximo drawdown y rachas de victorias/pérdidas
- Curva de capital (equity curve) interactiva
- Desglose de resultado por activo y por estrategia
- Mejor y peor operación
- Registro de operaciones con: mercado, timeframe, stop loss, take profit,
  riesgo %, estado emocional y notas — para análisis conductual, no solo numérico

---

## 6. Seguridad

- Cada usuario solo puede leer/escribir sus propias operaciones
  (`firestore.rules`, sección `users/{uid}/operations/{opId}`).
- El rol `admin` se controla desde el propio Firestore y solo un admin
  puede modificar el rol de otro usuario.
- El backend opcional valida el mismo token de Firebase en cada request
  (`middleware/auth.js`), evitando mantener un sistema de sesiones paralelo.
- Nunca subas tu `.env` ni `serviceAccountKey.json` a un repositorio público
  (ambos están cubiertos por `.gitignore`).

---

## 7. Roadmap sugerido

- [ ] Exportar reportes en PDF
- [ ] Notificaciones cuando se alcanza un stop loss / take profit planeado
- [ ] Etiquetas personalizadas por operación
- [ ] Vista de calendario de resultados diarios
- [ ] Sincronización bidireccional automática (detectar cambios externos en el Excel sin recargar)
