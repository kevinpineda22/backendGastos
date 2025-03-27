import express from 'express';
import { 
  crearRequerimiento, 
  obtenerRequerimientos, 
  decidirRequerimiento, 
  obtenerHistorialGastos, 
  actualizarRequerimiento,
  adjuntarVouchers,
  eliminarVoucher,
  enviarVouchers,  // Importa el nuevo controlador para reenviar voucher
  eliminarRequerimiento ,
} from '../controllers/requerimientosController.js';
import multer from 'multer';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ruta para eliminar un requerimiento
router.delete("/eliminar/:id", eliminarRequerimiento);


// Ruta para crear un requerimiento con carga de archivo
router.post('/crear', upload.fields([
  { name: 'archivo_cotizacion', maxCount: 1 },  // Para el archivo de cotización
  { name: 'archivos_proveedor', maxCount: 10 }     // Para los archivos del proveedor
]), crearRequerimiento);


router.post('/adjuntarVouchers', upload.fields([
  { name: 'vouchers', maxCount: 10 }
]), adjuntarVouchers);

router.post('/enviarVouchers', enviarVouchers);

router.post('/eliminarVoucher', eliminarVoucher);
// Otras rutas
router.post('/decidirRequerimiento', decidirRequerimiento);
router.put('/:id', actualizarRequerimiento);
router.get('/obtenerRequerimientos', obtenerRequerimientos);
router.get('/historial', obtenerHistorialGastos);

export default router;
