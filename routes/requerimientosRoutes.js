import express from 'express';
import { crearRequerimiento, actualizarEstado, obtenerRequerimientos, decidirRequerimiento } from '../controllers/requerimientosController.js';

const router = express.Router();

router.post('/requerimientos', crearRequerimiento);
router.patch('/requerimientos/estado', actualizarEstado);
router.get('/requerimientos', obtenerRequerimientos);
router.post('/requerimientos/decidir', decidirRequerimiento);

export default router;