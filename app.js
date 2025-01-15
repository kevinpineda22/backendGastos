// 📂 app.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import requerimientosRoutes from './routes/requerimientosRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 6666;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Rutas
app.use('/api', requerimientosRoutes);
app.use('/', requerimientosRoutes); // ✅ Habilita acceso a /decidir/:token

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${port}`);
});