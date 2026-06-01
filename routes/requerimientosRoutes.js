import express from "express";
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
  editarTiempoFechaPago,
  obtenerRequerimientoPorToken, // Nueva función
} from "../controllers/requerimientosController.js";
import multer from "multer";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ruta para eliminar un requerimiento
router.delete("/eliminar/:id", eliminarRequerimiento);

// Ruta para crear un requerimiento. Los archivos se suben directo a Supabase
// desde el navegador; aquí solo llegan las URLs en un JSON liviano. Por eso ya
// NO se usa multer (los archivos nunca pasan por Vercel → adiós límite 4.5MB).
router.post("/crear", crearRequerimiento);

// Ruta para adjuntar vouchers
router.post(
  "/adjuntarVouchers",
  upload.fields([{ name: "vouchers", maxCount: 10 }]),
  adjuntarVouchers
);

// Ruta para enviar vouchers
router.post("/enviarVouchers", enviarVouchers);

// Ruta para eliminar un voucher
router.post("/eliminarVoucher", eliminarVoucher);

// Ruta para actualizar el estado_cartera
router.put("/actualizarEstadoCartera", actualizarEstadoCartera);

// Otras rutas
router.get("/obtenerPorToken/:token", obtenerRequerimientoPorToken); // Nueva ruta
router.post("/decidirRequerimiento", decidirRequerimiento);
router.put("/:id", actualizarRequerimiento);
router.get("/obtenerRequerimientos", obtenerRequerimientos);
router.get("/historial", obtenerHistorialGastos);

router.put(
  "/editar-cotizacion/:id",
  upload.single("archivo_cotizacion"),
  editarCotizacion
);

router.put("/editar-tiempo-fecha-pago/:id", editarTiempoFechaPago);

export default router;

