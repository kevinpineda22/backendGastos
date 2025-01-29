import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import requerimientosRoutes from './routes/requerimientosRoutes.js';
import multer from 'multer';

dotenv.config();

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors({ origin: '*' }));

// Configuración de CORS para permitir solicitudes desde cualquier dominio
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');  // Permite solicitudes de cualquier origen
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH');  // Permite métodos específicos
  res.header('Access-Control-Allow-Headers', 'Content-Type');  // Permite encabezados específicos
  next();  // Continúa al siguiente middleware o ruta
});

// Configuración de middlewares
app.use(bodyParser.json());
app.use(upload.single('archivo_cotizacion'));

// Rutas API
app.use('/api', requerimientosRoutes);
app.use('/', requerimientosRoutes);

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.status(200).json({ message: 'El servidor está funcionando correctamente.' });
});

// Exporta la aplicación para que Vercel la pueda manejar
export default app;