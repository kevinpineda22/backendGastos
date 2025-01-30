import supabase from '../services/supabaseService.js';
import { sendEmail } from '../services/emailService.js';
import crypto from 'crypto';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Crear requerimiento
export const crearRequerimiento = async (req, res) => {
  const { nombre_completo, area, procesos, sede, unidad, centro_costos, descripcion, monto_estimado, correo_empleado } = req.body;
  const archivoCotizacion = req.file;

  // Verifica que el correo del solicitante se reciba correctamente
  console.log("Correo del solicitante recibido:", correo_empleado);

  // Generar un token único para el requerimiento
  const token = crypto.randomBytes(16).toString('hex');

  try {
    // Subir el archivo PDF al bucket de Supabase
    const uniqueFileName = `${Date.now()}_${archivoCotizacion.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('cotizaciones')
      .upload(`cotizaciones/${uniqueFileName}`, archivoCotizacion.buffer, {
        contentType: archivoCotizacion.mimetype,
      });

    if (uploadError) {
      console.error('❌ Error al subir el archivo a Supabase:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    const archivoCotizacionUrl = `https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/cotizaciones/${uploadData.path}`;

    // Asegurarse de que unidad y centro_costos sean arrays
    const unidadArray = Array.isArray(unidad) ? unidad : [unidad];
    const centroCostosArray = Array.isArray(centro_costos) ? centro_costos : [centro_costos];

    // Convertir los arrays a formato PostgreSQL
    const unidadPgArray = `{${unidadArray.map(item => `"${item}"`).join(',')}}`;
    const centroCostosPgArray = `{${centroCostosArray.map(item => `"${item}"`).join(',')}}`;

    

    // Insertar el requerimiento en la base de datos
    const { data, error } = await supabase
      .from('Gastos')
      .insert([{ 
        nombre_completo, 
        area,
        procesos,
        sede,
        unidad: unidadPgArray, // Formatear como array PostgreSQL
        centro_costos: centroCostosPgArray, // Formatear como array PostgreSQL
        descripcion, 
        monto_estimado,
        archivo_cotizacion: archivoCotizacionUrl, 
        correo_empleado, 
        token, 
        estado: 'Pendiente' 
      }])
      .select();

    if (error) {
      console.error('❌ Error al insertar en Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    // Correo para el encargado en texto plano
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
      color:rgb(255, 255, 255);
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
                  <td style="font-weight: bold;">Centro de Operaciones:</td>
                  <td>${sede}</td>
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
                  <td style="font-weight: bold;">Cotización:</td>
                  <td><a href="${archivoCotizacionUrl}" target="_blank" style="color: #3498db;">Ver Cotización</a></td>
                </tr>
              </table>
              <p style="margin-top: 20px;">Para aprobar o rechazar el requerimiento, haz clic en el siguiente enlace:</p>
              <a href="https://www.merkahorro.com/aprobarrechazar?token=${encodeURIComponent(token)}" class="button">Aprobar/Rechazar</a>
              <p style="margin-top: 30px;">Saludos cordiales,<br>El equipo de gestión de gastos<br>Merkahorro</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const archivoAdjunto = {
  filename: archivoCotizacion.originalname,
  content: archivoCotizacion.buffer, // Enviamos el contenido del archivo
  encoding: 'base64', // Se codifica el archivo como base64
};

// Enviar el correo con el archivo adjunto
await sendEmail(
  'desarrollo@merkahorrosas.com', // Correo del encargado
  'Nuevo Requerimiento de Gasto',
  mensajeEncargado,
  [archivoAdjunto] // Adjuntamos el archivo
);

// Responder al cliente con un objeto JSON con el mensaje de éxito
return res.status(201).json({
  message: 'Tu solicitud de gasto ha sido recibida correctamente. Nuestro equipo está revisando los detalles.',
  token, // Devuelve el token generado
});
} catch (error) {
console.error("❌ Error en la creación del requerimiento:", error);
return res.status(500).json({ error: "Hubo un problema al procesar tu solicitud." });
}
};
// ✅ Aprobar o rechazar requerimiento
export const actualizarEstado = async (req, res) => {
  const { token, decision } = req.body;

  try {
    // Obtener el correo del solicitante a partir del token
    const { data, error } = await supabase
      .from('Gastos')
      .select('correo_empleado, nombre_completo, descripcion, monto_estimado') // Seleccionamos solo lo necesario
      .eq('token', token)
      .single();

    if (error) {
      console.error('❌ Error al obtener el requerimiento:', error);
      return res.status(500).json({ error: error.message });
    }

    // Actualizar el estado del requerimiento en la base de datos
    const { error: updateError } = await supabase
      .from('Gastos')
      .update({ estado: decision })
      .eq('token', token);

    if (updateError) {
      console.error('❌ Error al actualizar estado:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Correo para el solicitante (texto plano)
    const mensajeSolicitante = `
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 10px;">
      <h2 style="color: #210d65;">Decisión sobre tu Requerimiento de Gasto</h2>
      <p>Estimado ${data.nombre_completo},</p>
      <p>Tu requerimiento de gasto con la descripción "<strong>${data.descripcion}</strong>" ha sido <strong>${decision.toLowerCase()}</strong>.</p>
      <p>Si tienes alguna duda, por favor, contáctanos.</p>
      <p style="margin-top: 20px;">Saludos cordiales,</p>
      <p>El equipo de gestión de gastos<br>Merkahorro</p>
    </div>
  </body>
</html>
`;


    const correoSolicitante = data.correo_empleado;

    await sendEmail(
      correoSolicitante, // Correo del solicitante
      'Decisión sobre tu requerimiento de gasto',
      mensajeSolicitante
    );

    // Responder al cliente con el mensaje de éxito
    return res.status(200).json({ message: `Requerimiento ${decision} correctamente` });
  } catch (error) {
    console.error("❌ Error en la actualización del estado:", error);
    return res.status(500).json({ error: "Hubo un problema al procesar la actualización del estado." });
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

// ✅ Página para aprobar o rechazar requerimiento (Este es el endpoint que se llama desde el correo)
export const decidirRequerimiento = async (req, res) => {
  const { token, decision } = req.body;

  try {
    // Obtener el requerimiento con el token proporcionado
    const { data, error } = await supabase
      .from('Gastos')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      console.error('❌ Error al obtener el requerimiento:', error);
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    // Actualizar el estado del requerimiento en la base de datos
    const { error: updateError } = await supabase
      .from('Gastos')
      .update({ estado: decision })
      .eq('token', token);

    if (updateError) {
      console.error('❌ Error al actualizar estado:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Correo para el solicitante (texto plano)
    const mensajeSolicitante = `
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 10px;">
      <h2 style="color: #210d65;">Decisión sobre tu Requerimiento de Gasto</h2>
      <p>Estimado ${data.nombre_completo},</p>
      <p>Tu requerimiento de gasto con la descripción "<strong>${data.descripcion}</strong>" ha sido <strong>${decision.toLowerCase()}</strong>.</p>
      <p>Si tienes alguna duda, por favor, contáctanos.</p>
      <p style="margin-top: 20px;">Saludos cordiales,</p>
      <p>El equipo de gestión de gastos<br>Merkahorro</p>
    </div>
  </body>
</html>
`;

    const correoSolicitante = data.correo_empleado;

    await sendEmail(
      correoSolicitante, // Correo del solicitante
      'Decisión sobre tu requerimiento de gasto',
      mensajeSolicitante
    );

    // Responder al cliente con el mensaje de éxito
    return res.status(200).json({ message: `Requerimiento ${decision} correctamente` });
  } catch (error) {
    console.error('❌ Error en la actualización del estado:', error);
    return res.status(500).json({ error: 'Hubo un problema al procesar la actualización del estado.' });
  }
};