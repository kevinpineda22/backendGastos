import express from 'express';
import { crearRequerimiento, actualizarEstado, obtenerRequerimientos, decidirRequerimiento } from '../controllers/requerimientosController.js';

const router = express.Router();

router.post('/requerimientos', crearRequerimiento);
router.patch('/requerimientos/decidir', actualizarEstado);
router.get('/requerimientos', obtenerRequerimientos);
router.get('/decidir/:token', decidirRequerimiento);

export default router;
