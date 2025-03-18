import express from 'express';
import { 
  crearRequerimiento, 
  obtenerRequerimientos, 
  decidirRequerimiento, 
  obtenerHistorialGastos, 
  actualizarRequerimiento,
  adjuntarVoucher  // Importar el nuevo controlador
} from '../controllers/requerimientosController.js';
import multer from 'multer';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ruta para crear un requerimiento con carga de archivo
router.post('/crear', upload.fields([
    { name: 'archivo_cotizacion', maxCount: 1 },  // Para el archivo de cotización
    { name: 'archivos_proveedor', maxCount: 10 }     // Para los archivos del proveedor
]), crearRequerimiento);

// Ruta para adjuntar comprobante (voucher)
// Se espera que el archivo se envíe en el campo "voucher"
router.post('/adjuntarVoucher', upload.fields([
    { name: 'voucher', maxCount: 1 }  
]), adjuntarVoucher);

// Otras rutas
router.post('/decidirRequerimiento', decidirRequerimiento);
router.put('/:id', actualizarRequerimiento);
router.get('/obtenerRequerimientos', obtenerRequerimientos);
router.get('/historial', obtenerHistorialGastos);

export default router;
