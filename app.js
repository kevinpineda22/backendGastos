import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import requerimientosRoutes from './routes/requerimientosRoutes.js';

dotenv.config();

const app = express();

// Configuración de middlewares
app.use(cors());
app.use(bodyParser.json());

// Rutas API
app.use('/api', requerimientosRoutes);
app.use('/', requerimientosRoutes);

// Exporta la aplicación para que Vercel la pueda manejar
export default app;
