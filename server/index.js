import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import reportsRouter from "./routes/reports.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/reports", reportsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API de Ledger escuchando en http://localhost:${PORT}`));
