import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import requerimientosRoutes from './routes/requerimientosRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 6666;

app.use(cors());
app.use(bodyParser.json());

// Rutas API
app.use('/api', requerimientosRoutes);

// Ruta directa para decidir
app.use('/', requerimientosRoutes);

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${port}`);
});