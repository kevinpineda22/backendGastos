// 📂 routes/requerimientosRoutes.js
import express from 'express';
import { crearRequerimiento, actualizarEstado, obtenerRequerimientos, decidirRequerimiento } from '../controllers/requerimientosController.js';

const router = express.Router();

// ✅ Crear requerimiento
router.post('/requerimiento', crearRequerimiento);

// ✅ Aprobar/Rechazar requerimiento
router.patch('/requerimiento/decidir', actualizarEstado);

// ✅ Obtener todos los requerimientos
router.get('/requerimientos', obtenerRequerimientos);

// ✅ Ruta para decidir requerimiento
router.get('/decidir/:token', decidirRequerimiento);

export default router;