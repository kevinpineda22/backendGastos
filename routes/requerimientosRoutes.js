import express from 'express';
import { 
  crearRequerimiento, 
  obtenerRequerimientos, 
  decidirRequerimiento, 
  obtenerHistorialGastos, 
  actualizarRequerimiento,
  adjuntarVouchers,
  eliminarVoucher,
  enviarVouchers,
  eliminarRequerimiento,
  actualizarEstadoCartera, // Nueva importación
  editarCotizacion,
  editarTiempoFechaPago
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
  { name: 'archivos_proveedor', maxCount: 4 }   // Para los archivos del proveedor
]), crearRequerimiento);

// Ruta para adjuntar vouchers
router.post('/adjuntarVouchers', upload.fields([
  { name: 'vouchers', maxCount: 10 }
]), adjuntarVouchers);

// Ruta para enviar vouchers
router.post('/enviarVouchers', enviarVouchers);

// Ruta para eliminar un voucher
router.post('/eliminarVoucher', eliminarVoucher);

// Ruta para actualizar el estado_cartera
router.put('/actualizarEstadoCartera', actualizarEstadoCartera);

// Otras rutas
router.post('/decidirRequerimiento', decidirRequerimiento);
router.put('/:id', actualizarRequerimiento);
router.get('/obtenerRequerimientos', obtenerRequerimientos);
router.get('/historial', obtenerHistorialGastos);

router.put('/editar-cotizacion/:id', upload.single('archivo_cotizacion'), editarCotizacion);

router.put('/editar-tiempo-fecha-pago/:id', editarTiempoFechaPago);
export default router;