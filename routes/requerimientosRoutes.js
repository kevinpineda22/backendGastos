import express from 'express';
import { crearRequerimiento, actualizarEstado, obtenerRequerimientos, decidirRequerimiento } from '../controllers/requerimientosController.js';
import multer from 'multer';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ruta para crear un requerimiento con carga de archivo
router.post('/crear', upload.single('archivo_cotizacion'), crearRequerimiento);

// Otras rutas
router.post('/actualizarEstado', actualizarEstado);
router.get('/obtenerRequerimientos', obtenerRequerimientos);
router.post('/decidirRequerimiento', decidirRequerimiento);

export default router;