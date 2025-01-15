import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors'; // Asegúrate de que cors esté importado
import dotenv from 'dotenv';
import requerimientosRoutes from './routes/requerimientosRoutes.js';

dotenv.config();

const app = express();

// Configuración de CORS para permitir solicitudes desde cualquier dominio
app.use(cors()); // Aplica CORS globalmente a todas las rutas

// Configuración de middlewares
app.use(bodyParser.json());

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/ping', (req, res) => {
  res.status(200).json({ message: 'El servidor está funcionando correctamente.' });
});

// Rutas API
app.use('/api', requerimientosRoutes);
app.use('/', requerimientosRoutes);

// Exporta la aplicación para que Vercel la pueda manejar
export default app;
