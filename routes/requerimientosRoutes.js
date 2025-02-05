import express from 'express';
import { crearRequerimiento, actualizarEstado, obtenerRequerimientos, decidirRequerimiento, obtenerHistorialGastos } from '../controllers/requerimientosController.js';
import multer from 'multer';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ruta para crear un requerimiento con carga de archivo
router.post('/crear', upload.fields(
    [
      { name: 'archivo_cotizacion', maxCount: 1 },  // Para el archivo de cotización
      { name: 'archivos_proveedor', maxCount: 10 }  // Para los archivos del proveedor
    ]
  ), crearRequerimiento);
  
// Otras rutas
router.post('/actualizarEstado', actualizarEstado);
router.get('/obtenerRequerimientos', obtenerRequerimientos);
router.post('/decidirRequerimiento', decidirRequerimiento);
// Ruta para obtener el historial de gastos
router.get('/historial', obtenerHistorialGastos);

export default router;