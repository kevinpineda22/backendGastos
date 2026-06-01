import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import requerimientosRoutes from "./routes/requerimientosRoutes.js";

dotenv.config();

const allowedOrigins = [
  'http://localhost:5173',
  'https://merkahorro.com',
  'https://www.merkahorro.com',
];

const app = express();

// Vercel mete los requests detrás de un proxy que setea X-Forwarded-For.
// Sin esto, express-rate-limit no confía en ese header y tira
// ERR_ERL_FORWARDED_HEADER, además de contar a TODOS los usuarios como una
// sola IP. Confiamos en el primer proxy (Vercel).
app.set("trust proxy", 1);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS no permitido'), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
  credentials: true,
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes, intenta más tarde.' },
});
app.use(globalLimiter);

// Configuración de middlewares
app.use(bodyParser.json());

// Rutas API
app.use("/api/requerimientos", requerimientosRoutes);

// Ruta de prueba para verificar que el servidor está funcionando
app.get("/", (req, res) => {
  res
    .status(200)
    .json({ message: "El servidor está funcionando correctamente." });
});

// Exporta la aplicación para que Vercel la pueda manejar
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
