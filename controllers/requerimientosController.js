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
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f9; margin: 0; padding: 20px;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center;">
            <img src="https://www.merkahorro.com/logoMK.png" alt="Logo de la Empresa" style="width: 150px; margin-bottom: 20px;" />
          </div>
          <h1 style="color: #210d65;">Nuevo Requerimiento de Gasto</h1>
          <div style="color: #555; line-height: 1.6;">
            <p><strong>Nombre Completo:</strong> ${nombre_completo}</p>
            <p><strong>Área:</strong> ${area}</p>
            <p><strong>Descripción:</strong> ${descripcion}</p>
            <p><strong>Monto Estimado:</strong> $${monto_estimado}</p>
            <p><strong>Factura:</strong> ${archivo_factura}</p>
            <p><strong>Cotización:</strong> ${archivo_cotizacion}</p>
            <p>Decida si aprobar o rechazar el requerimiento a través del siguiente enlace:</p>
            <p><a href="https://backend-gastos.vercel.app/decidir/${token}" style="color: #89DC00; text-decoration: underline; font-weight: bold;">Aprobar/Rechazar</a></p>
          </div>
          <div style="margin-top: 30px; text-align: center; color: #777;">
            <p>Saludos cordiales,<br>El equipo de gestión de gastos</p>
          </div>
        </div>
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

  // Correo para el solicitante (con diseño y CSS)
  const mensajeSolicitante = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f9; margin: 0; padding: 20px;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center;">
            <img src="https://www.merkahorro.com/logoMK.png" alt="Logo de la Empresa" style="width: 150px; margin-bottom: 20px;" />
          </div>
          <h1 style="color: #210d65;">Decisión sobre tu Requerimiento de Gasto</h1>
          <div style="color: #555; line-height: 1.6;">
            <p>Estimado ${data.nombre_completo},</p>
            <p>Tu requerimiento de gasto con la descripción "${data.descripcion}" ha sido ${decision.toLowerCase()}.</p>
            <p>Si tienes alguna duda, por favor, no dudes en ponerte en contacto.</p>
            <p>Saludos cordiales,<br>El equipo de gestión de gastos</p>
          </div>
          <div style="margin-top: 30px; text-align: center; color: #777;">
            <p>&copy; 2025 Tu Empresa | Todos los derechos reservados</p>
          </div>
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
  const { token } = req.params;

  try {
    // Obtener el requerimiento con el token proporcionado
    const { data, error } = await supabase
      .from('Gastos')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      console.error('❌ Error al obtener el requerimiento:', error);
      return res.status(404).send('Requerimiento no encontrado');
    }

    // Enviar la página con la decisión (Aprobar/Rechazar)
    res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f9;
              margin: 0;
              padding: 20px;
            }
            h1 {
              color: #333;
              text-align: center;
              margin-bottom: 20px;
            }
            .container {
              background-color: #fff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              max-width: 800px;
              margin: 0 auto;
            }
            .info {
              margin-bottom: 20px;
            }
            .info p {
              font-size: 16px;
              line-height: 1.6;
            }
            .info strong {
              color: #333;
            }
            .button-container {
              text-align: center;
              margin-top: 30px;
            }
            .button {
              background-color: #89DC00;
              color: white;
              border: none;
              padding: 15px 32px;
              text-align: center;
              text-decoration: none;
              display: inline-block;
              font-size: 16px;
              border-radius: 5px;
              cursor: pointer;
              margin: 10px;
              transition: background-color 0.3s ease;
            }
            .button.reject {
              background-color: rgb(235, 6, 6);
            }
            .button:hover {
              background-color: #89DC00;
            }
            .button.reject:hover {
              background-color: rgb(235, 6, 6);
            }
            a {
              color: #210d65;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Decisión sobre el Requerimiento de Gasto</h1>
            <div class="info">
              <p><strong>Descripción:</strong> ${data.descripcion}</p>
              <p><strong>Nombre Completo:</strong> ${data.nombre_completo}</p>
              <p><strong>Área:</strong> ${data.area}</p>
              <p><strong>Monto Estimado:</strong> $${data.monto_estimado}</p>
              <p><strong>Factura (URL o archivo):</strong> <a href="${data.archivo_factura}" target="_blank">Ver Factura</a></p>
              <p><strong>Cotización (URL o archivo):</strong> <a href="${data.archivo_cotizacion}" target="_blank">Ver Cotización</a></p>
            </div>
            <div class="button-container">
              <button class="button" onclick="decidir('Aprobado')">Aprobar</button>
              <button class="button reject" onclick="decidir('Rechazado')">Rechazar</button>
            </div>
          </div>

          <script>
            function decidir(decision) {
              fetch('https://backend-gastos.vercel.app/api/requerimientos/decidir', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: '${token}', decision })
              })
              .then(response => response.json())
              .then(data => {
                alert('Decisión tomada: ' + decision);
                window.location.href = 'https://www.merkahorro.com/';
              })
              .catch(error => alert('Error al tomar la decisión: ' + error.message));
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ Error al decidir el requerimiento:', error);
    res.status(500).send('Hubo un error al cargar la página de decisión');
  }
};
