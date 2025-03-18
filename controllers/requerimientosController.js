import supabase from '../services/supabaseService.js';
import { sendEmail } from '../services/emailService.js';
import crypto from 'crypto';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Función para sanitizar el nombre del archivo, eliminando caracteres especiales no permitidos
const sanitizeFileName = (fileName) => {
  // Se eliminan caracteres que no sean letras, números, guion, guion bajo o punto
  return fileName.replace(/[^\w.-]/g, '');
};

// Estructura de grupos de líderes con sus empleados
const gruposLideres = {
  'desarrollo@merkahorrosas.com': ['kp0827074@gmail.com'],
  'isazamanuel04@gmail.com': ['juanmerkahorro@gmail.com'],
  'johansanchezvalencia@gmail.com': ['johanmerkahorro777@gmail.com']
};

const obtenerJefePorEmpleado = (correo_empleado) => {
  // Recorre cada grupo y verifica si el correo está en la lista de empleados
  for (const [lider, empleados] of Object.entries(gruposLideres)) {
    if (empleados.includes(correo_empleado)) {
      return lider;
    }
  }
  // Si no se encuentra, retorna un valor por defecto
  return 'operaciones@merkahorrosas.com';
};

// ✅ Crear requerimiento
export const crearRequerimiento = async (req, res) => {
  const {
    nombre_completo,
    area,
    procesos,
    sede,
    unidad,
    centro_costos,
    descripcion,
    monto_estimado,
    anticipo,
    tiempo_fecha_pago,
    correo_empleado,
    monto_sede
  } = req.body;

  const archivoCotizacion = req.files['archivo_cotizacion']
    ? req.files['archivo_cotizacion'][0]
    : null;
  const archivosProveedor = req.files['archivos_proveedor'] || [];

  console.log("Correo del solicitante recibido:", correo_empleado);

  // Verificar que el archivo de cotización esté presente
  if (!archivoCotizacion) {
    return res.status(400).json({ error: 'El archivo de cotización es obligatorio.' });
  }

  // Generar un token único para el requerimiento
  const token = crypto.randomBytes(16).toString('hex');

  try {
    // Subir el archivo PDF de cotización a Supabase
    let archivoCotizacionUrl = '';
    if (archivoCotizacion) {
      const uniqueFileName = `${Date.now()}_${sanitizeFileName(archivoCotizacion.originalname)}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('cotizaciones')
        .upload(`cotizaciones/${uniqueFileName}`, archivoCotizacion.buffer, {
          contentType: archivoCotizacion.mimetype,
        });

      if (uploadError) {
        console.error('❌ Error al subir el archivo de cotización a Supabase:', uploadError);
        return res.status(500).json({ error: uploadError.message });
      }

      archivoCotizacionUrl = `https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/cotizaciones/${uploadData.path}`;
    }

    // Subir los archivos proporcionados por el proveedor a Supabase
    let archivosProveedorUrls = [];
    if (archivosProveedor && archivosProveedor.length > 0) {
      for (let archivo of archivosProveedor) {
        const uniqueFileName = `${Date.now()}_${sanitizeFileName(archivo.originalname)}`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('cotizaciones')
          .upload(`proveedores/${uniqueFileName}`, archivo.buffer, {
            contentType: archivo.mimetype,
          });

        if (uploadError) {
          console.error('❌ Error al subir el archivo del proveedor a Supabase:', uploadError);
          return res.status(500).json({ error: uploadError.message });
        }

        const archivoUrl = `https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/cotizaciones/${uploadData.path}`;
        archivosProveedorUrls.push(archivoUrl);
      }
    }

    // Asegurarse de que unidad, centro_costos y sede sean arrays
    const unidadArray = Array.isArray(unidad) ? unidad : [unidad];
    const centroCostosArray = Array.isArray(centro_costos) ? centro_costos : [centro_costos];
    const sedesArray = Array.isArray(sede) ? sede : [sede];

    // Convertir los arrays a formato PostgreSQL
    const unidadPgArray = `{${unidadArray.map(item => `"${item}"`).join(',')}}`;
    const centroCostosPgArray = `{${centroCostosArray.map(item => `"${item}"`).join(',')}}`;
    const sedesPgArray = `{${sedesArray.map(item => `"${item}"`).join(',')}}`;

    // Insertar el requerimiento en la base de datos
    const { data, error } = await supabase
      .from('Gastos')
      .insert([{
        nombre_completo,
        area,
        procesos,
        sede: sedesPgArray,
        unidad: unidadPgArray,
        centro_costos: centroCostosPgArray,
        descripcion,
        monto_estimado,
        monto_sede,
        anticipo,
        tiempo_fecha_pago,
        archivo_cotizacion: archivoCotizacionUrl,
        archivos_proveedor: archivosProveedorUrls,
        correo_empleado,
        token,
        estado: 'Pendiente'
      }])
      .select();

    if (error) {
      console.error('❌ Error al insertar en Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    // Determinar el destinatario según el remitente usando la función de grupos
    const destinatarioEncargado = obtenerJefePorEmpleado(correo_empleado);

    // Preparar el mensaje HTML para el encargado
    const mensajeEncargado = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        table {
          width: 100%;
          border-spacing: 0;
          background-color: #ffffff;
        }
        td {
          padding: 15px;
        }
        h2 {
          font-size: 24px;
          color: rgb(255, 255, 255);
        }
        .button {
          background-color: #210d65;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <table width="600" cellpadding="20" cellspacing="0" style="border: 1px solid #dddddd; border-radius: 10px;">
              <tr>
                <td style="text-align: center; background-color: #210d65; color: white;">
                  <h2>Nuevo Requerimiento de Gasto</h2>
                </td>
              </tr>
              <tr>
                <td>
                  <p>Estimado encargado,</p>
                  <p>Se ha creado un nuevo requerimiento de gasto que requiere tu aprobación. Aquí están los detalles:</p>
                  <table cellpadding="5" cellspacing="0" width="100%" style="border-collapse: collapse; margin-top: 20px;">
                    <tr>
                      <td style="font-weight: bold;">Nombre Completo:</td>
                      <td>${nombre_completo}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Área:</td>
                      <td>${area}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Descripción:</td>
                      <td>${descripcion}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Procesos:</td>
                      <td>${procesos}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Sedes:</td>
                      <td>${sedesArray.join(', ')}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Unidad de Negocio:</td>
                      <td>${unidadArray.join(', ')}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Centro de Costos:</td>
                      <td>${centroCostosArray.join(', ')}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Monto Estimado:</td>
                      <td>$${monto_estimado}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Monto por sede:</td>
                      <td>$${monto_sede}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Anticipo:</td>
                      <td>$${anticipo}</td> 
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Fecha tiempo estimado de pago:</td>
                      <td>$${tiempo_fecha_pago}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Cotización:</td>
                      <td><a href="${archivoCotizacionUrl}" target="_blank" style="color: #3498db;">Ver Cotización</a></td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Archivos del Proveedor:</td>
                      <td>
                        ${archivosProveedorUrls.map(url => `<a href="${url}" target="_blank" style="color: #3498db;">Ver archivo proveedor</a>`).join('<br>')}
                      </td>
                    </tr>
                  </table>
                  <p style="margin-top: 20px;">Para aprobar o rechazar el requerimiento, haz clic en el siguiente enlace:</p>
                  <a href="https://www.merkahorro.com/aprobarrechazar?token=${encodeURIComponent(token)}" class="button">Aprobar/Rechazar</a>
                  <div style="padding: 10px; font-style: italic;">
                    <p>"Procura que todo aquel que llegue a ti, salga de tus manos mejor y más feliz."</p>
                    <p><strong>📜 Autor:</strong> Madre Teresa de Calcuta</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    // Crear el array de archivos adjuntos
    const archivoAdjunto = [];
    archivoAdjunto.push({
      filename: archivoCotizacion.originalname,
      content: archivoCotizacion.buffer,
      encoding: 'base64',
    });

    // Agregar los archivos del proveedor al array de archivos adjuntos (si existen)
    if (archivosProveedor && archivosProveedor.length > 0) {
      archivosProveedor.forEach((archivo) => {
        archivoAdjunto.push({
          filename: archivo.originalname,
          content: archivo.buffer,
          encoding: 'base64',
        });
      });
    }

    // Enviar el correo utilizando el destinatario determinado
    await sendEmail(
      obtenerJefePorEmpleado(correo_empleado),
      'Nuevo Requerimiento de Gasto',
      mensajeEncargado,
      archivoAdjunto
    );

    // Responder al cliente con un objeto JSON con el mensaje de éxito y token
    return res.status(201).json({
      message: 'Tu solicitud de gasto ha sido recibida correctamente. Nuestro equipo está revisando los detalles.',
      token,
    });
  } catch (error) {
    console.error("❌ Error en la creación del requerimiento:", error);
    return res.status(500).json({ error: "Hubo un problema al procesar tu solicitud." });
  }
};

// Función para obtener el historial de gastos
export const obtenerHistorialGastos = async (req, res) => {
  const { correo_empleado } = req.query; // Obtener el correo del query params

  try {
    const { data, error } = await supabase
      .from('Gastos')
      .select('*')
      .eq('correo_empleado', correo_empleado) // Filtrar por correo
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('❌ Error al obtener el historial de gastos:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Historial de gastos obtenido:', data);
    return res.status(200).json(data);
  } catch (error) {
    console.error('❌ Error al obtener el historial de gastos:', error);
    return res.status(500).json({ error: 'Hubo un problema al obtener el historial de gastos.' });
  }
};

// ✅ Consultar requerimientos
export const obtenerRequerimientos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Gastos')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('❌ Error al consultar:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Lista de requerimientos', data });
  } catch (error) {
    console.error("❌ Error al obtener requerimientos:", error);
    return res.status(500).json({ error: "Hubo un problema al obtener los requerimientos." });
  }
};

export const actualizarRequerimiento = async (req, res) => {
  const { id } = req.params;
  const { estado, observacion, verificado, observacionC } = req.body; // <-- Asegúrate de extraer verificado

  console.log("Actualizando registro con ID:", id);
  console.log("Datos recibidos:", { estado, observacion, observacionC, verificado });

  try {
    const { data, error } = await supabase
      .from('Gastos')
      .update({ estado, observacion, observacionC, verificado })
      .eq('id', id);

    console.log("Resultado del update:", { data, error });

    if (error) {
      console.error("Error al actualizar requerimiento:", error);
      return res.status(500).json({ error: error.message || "Error desconocido" });
    }

    if (!data || data.length === 0) {
      console.warn("No se retornaron filas actualizadas; se asume éxito.");
    }

    return res.status(200).json({ message: "Registro actualizado correctamente", data: data || [] });
  } catch (err) {
    console.error("Error en actualizarRequerimiento:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ✅ Página para aprobar o rechazar requerimiento (Este es el endpoint que se llama desde el correo)
export const decidirRequerimiento = async (req, res) => {
  const { token, decision, observacion } = req.body;

  console.log('Datos recibidos:', { token, decision, observacion });

  try {
    const { data, error } = await supabase
      .from('Gastos')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      console.error('❌ Error al obtener el requerimiento:', error);
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    const { error: updateError } = await supabase
      .from('Gastos')
      .update({
        estado: decision,
        observacion: observacion
      })
      .eq('token', token);

    if (updateError) {
      console.error('❌ Error al actualizar estado y observación:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    const mensajeSolicitante = `
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 10px;">
          <h2 style="color: #210d65;">Decisión sobre la responsabilidad del gasto.</h2>
          <p>Estimado ${data.nombre_completo},</p>
          <p>Tu necesidad de conciencia del gasto "<strong>${data.descripcion}</strong>" ha sido considerada <strong>${decision.toLowerCase()}</strong>.</p>
          <p><strong>Observación:</strong> ${observacion || 'Sin observaciones.'}</p>
          <div style="padding: 10px; font-style: italic;">
            <p>"Procura que todo aquel que llegue a ti, salga de tus manos mejor y más feliz."</p>
            <p><strong>📜 Autor:</strong> Madre Teresa de Calcuta</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const correoSolicitante = data.correo_empleado;

    await sendEmail(
      correoSolicitante,
      'Decisión sobre tu requerimiento de gasto',
      mensajeSolicitante
    );

    return res.status(200).json({ message: `Requerimiento ${decision} y observación guardados correctamente.` });
  } catch (error) {
    console.error('❌ Error en la actualización del estado:', error);
    return res.status(500).json({ error: 'Hubo un problema al procesar la actualización del estado.' });
  }
};


// Nuevo endpoint para adjuntar comprobante de voucher
export const adjuntarVoucher = async (req, res) => {
  // Se asume que en el body se envían 'id' y 'correo_empleado' para identificar el gasto
  const { id, correo_empleado } = req.body;
  const voucherFile = req.files['voucher'] ? req.files['voucher'][0] : null;

  if (!voucherFile) {
    return res.status(400).json({ error: 'Debe enviar un comprobante de voucher.' });
  }

  // Generar un nombre único para el archivo
  const uniqueVoucherName = `${Date.now()}_${sanitizeFileName(voucherFile.originalname)}`;
  
  // Subir el voucher a Supabase en el bucket "cotizaciones", en la carpeta "comprobante"
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('cotizaciones')
    .upload(`comprobante/${uniqueVoucherName}`, voucherFile.buffer, { 
      contentType: voucherFile.mimetype,
    });

  if (uploadError) {
    console.error('❌ Error al subir el voucher:', uploadError);
    return res.status(500).json({ error: uploadError.message });
  }

  // Construir la URL completa usando el bucket "cotizaciones" y la ruta "comprobante"
  const archivo_comprobante = `https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/cotizaciones/comprobante/${uploadData.path}`;

  // Actualizar el registro de gasto con el voucher
  const { data, error } = await supabase
    .from('Gastos')
    .update({ voucher: archivo_comprobante })
    .eq('id', id)
    .select();

  if (error) {
    console.error('❌ Error al actualizar el gasto con voucher:', error);
    return res.status(500).json({ error: error.message });
  }

  // Preparar el mensaje HTML para el solicitante
  const mensajeVoucher = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Voucher Adjuntado</title>
    </head>
    <body>
      <p>Se ha adjuntado un comprobante de voucher para el gasto con ID: ${id}.</p>
      <p>Puedes ver el comprobante <a href="${archivo_comprobante}" target="_blank">aquí</a>.</p>
    </body>
    </html>
  `;

  try {
    // Enviar el correo al solicitante (correo_empleado)
    await sendEmail(
      correo_empleado,
      'Comprobante de Voucher Adjunto',
      mensajeVoucher
    );
  } catch (mailError) {
    console.error('❌ Error al enviar el correo:', mailError);
    // Puedes decidir si respondes con error o con éxito parcial
  }

  return res.status(200).json({ message: 'Voucher adjuntado y notificación enviada', archivo_comprobante });
};
