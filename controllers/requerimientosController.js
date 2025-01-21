import supabase from '../services/supabaseService.js';
import { sendEmail } from '../services/emailService.js';
import crypto from 'crypto';

// ✅ Crear requerimiento
export const crearRequerimiento = async (req, res) => {
  const { nombre_completo, area, descripcion, monto_estimado, archivo_factura, archivo_cotizacion, correo_empleado } = req.body;

  // Verifica que el correo del solicitante se reciba correctamente
  console.log("Correo del solicitante recibido:", correo_empleado);

  // Generar un token único para el requerimiento
  const token = crypto.randomBytes(16).toString('hex');

  try {
    // Insertar el requerimiento en la base de datos
    const { data, error } = await supabase
      .from('Gastos')
      .insert([{ 
        nombre_completo, 
        area,
        descripcion, 
        monto_estimado, 
        archivo_factura, 
        archivo_cotizacion, 
        correo_empleado, 
        token, 
        estado: 'Pendiente' 
      }])
      .select();

    if (error) {
      console.error('❌ Error al insertar en Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    // Correo para el encargado con diseño y CSS
    const mensajeEncargado = `
    <html>
      <body style="margin: 0; padding: 0; background-color: #f4f4f9;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f9; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <img src="https://www.merkahorro.com/logoMK.png" alt="Logo de la Empresa" width="150" style="display: block;">
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; color: #210d65; font-size: 22px; text-align: center; padding-bottom: 10px;">
                    <strong>Nuevo Requerimiento de Gasto</strong>
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; color: #555555; font-size: 16px; line-height: 1.6; padding-bottom: 20px;">
                    <p><strong>Nombre Completo:</strong> ${nombre_completo}</p>
                    <p><strong>Área:</strong> ${area}</p>
                    <p><strong>Descripción:</strong> ${descripcion}</p>
                    <p><strong>Monto Estimado:</strong> $${monto_estimado}</p>
                    <p><strong>Factura:</strong> <a href="${archivo_factura}" target="_blank" style="color: #210d65; text-decoration: underline;">Ver Factura</a></p>
                    <p><strong>Cotización:</strong> <a href="${archivo_cotizacion}" target="_blank" style="color: #210d65; text-decoration: underline;">Ver Cotización</a></p>
                    <p>Decida si aprobar o rechazar el requerimiento a través del siguiente enlace:</p>
                    <p style="text-align: center; margin: 20px 0;">
                      <a href="https://backend-gastos.vercel.app/decidir/${token}" style="background-color: #89DC00; color: #ffffff; text-decoration: none; padding: 12px 25px; font-size: 16px; border-radius: 5px; display: inline-block;">
                        Aprobar/Rechazar
                      </a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; color: #777777; font-size: 14px; text-align: center; padding-top: 20px;">
                    Saludos cordiales,<br>El equipo de gestión de gastos
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family: Arial, sans-serif; color: #999999; font-size: 12px; padding-top: 20px;">
                    &copy; 2025 Merkahorro | Todos los derechos reservados
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

    await sendEmail(
      'johanmerkahorro777@gmail.com', // Correo del encargado
      'Nuevo Requerimiento de Gasto',
      mensajeEncargado
    );

    // Responder al cliente con un objeto JSON con el mensaje de éxito
    return res.status(201).json({
      message: 'Tu solicitud de gasto ha sido recibida correctamente. Nuestro equipo está revisando los detalles.',
      redirectTo: '/' // O puedes redirigir a una página específica
    });
  } catch (error) {
    console.error("❌ Error en la creación del requerimiento:", error);
    return res.status(500).json({ error: "Hubo un problema al procesar tu solicitud." });
  }
}

// ✅ Aprobar o rechazar requerimiento
export const actualizarEstado = async (req, res) => {
  const { token, decision } = req.body;

  try {
    // Obtener el correo del solicitante a partir del token
    const { data, error } = await supabase
      .from('Gastos')
      .select('correo_empleado, nombre_completo, descripcion, monto_estimado, estado') // Seleccionamos solo lo necesario
      .eq('token', token)
      .single();

    if (error) {
      console.error('❌ Error al obtener el requerimiento:', error);
      return res.status(500).json({ error: error.message });
    }

    // Evitar enviar correos si ya se ha tomado una decisión
    if (data.estado !== 'Pendiente') {
      return res.status(400).json({ error: 'Este requerimiento ya tiene una decisión tomada.' });
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

    // Correo para el solicitante (con diseño y CSS)
    const mensajeSolicitante = `
    <html>
      <body style="margin: 0; padding: 0; background-color: #f4f4f9;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f9; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <img src="https://www.merkahorro.com/logoMK.png" alt="Logo de la Empresa" width="150" style="display: block;">
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; color: #210d65; font-size: 22px; text-align: center; padding-bottom: 10px;">
                    <strong>Decisión sobre tu Requerimiento de Gasto</strong>
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; color: #555555; font-size: 16px; line-height: 1.6; padding-bottom: 20px;">
                    <p>Estimado ${data.nombre_completo},</p>
                    <p>Tu requerimiento de gasto con la descripción "<strong>${data.descripcion}</strong>" ha sido <strong>${decision.toLowerCase()}</strong>.</p>
                    <p>Si tienes alguna duda, por favor, contáctanos.</p>
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; color: #777777; font-size: 14px; text-align: center; padding-top: 20px;">
                    Saludos cordiales,<br>El equipo de gestión de gastos
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family: Arial, sans-serif; color: #999999; font-size: 12px; padding-top: 20px;">
                    &copy; 2025 Merkahorro | Todos los derechos reservados
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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
