import supabase from '../services/supabaseService.js';
import { sendEmail } from '../services/emailService.js';
import crypto from 'crypto';

// ✅ Crear requerimiento
export const crearRequerimiento = async (req, res) => {
  const { empleado_id, descripcion, justificacion, monto_estimado, archivo_factura, archivo_cotizacion, correo_empleado } = req.body;

  // Verifica que el correo del solicitante se reciba correctamente
  console.log("Correo del solicitante recibido:", correo_empleado);

  // Generar un token único para el requerimiento
  const token = crypto.randomBytes(16).toString('hex');

  try {
    // Insertar el requerimiento en la base de datos
    const { data, error } = await supabase
      .from('Gastos')
      .insert([{ 
        empleado_id, 
        descripcion, 
        justificacion, 
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

    // Enviar correo al encargado con los detalles del requerimiento
    await sendEmail(
      'johanmerkahorro777@gmail.com', // Correo del encargado
      'Nuevo Requerimiento de Gasto',
      `Descripción: ${descripcion}\nMonto: $${monto_estimado}\nToken: ${token}\n\nDecide aquí:\nhttps://backend-gastos.vercel.app/decidir/${token}`
    );

    // Responder al cliente con el mensaje de éxito
    return res.status(201).json({ message: 'Requerimiento creado exitosamente', data });
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
      .select('correo_empleado') // Seleccionamos solo el campo correo_empleado
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

    // Enviar correo al encargado notificando la decisión
    await sendEmail(
      'gastosmerkahorro@gmail.com', // Correo del encargado
      `Requerimiento ${decision}`,
      `Tu requerimiento con token ${token} ha sido ${decision.toLowerCase()}.`
    );

    // Enviar correo al solicitante notificando la decisión
    const correoSolicitante = data.correo_empleado;
    console.log("Enviando correo a:", correoSolicitante);
    await sendEmail(
      correoSolicitante, // Correo del solicitante
      `Tu requerimiento ha sido ${decision}`,
      `Tu requerimiento con token ${token} ha sido ${decision.toLowerCase()}.`
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

// ✅ Página para aprobar o rechazar requerimiento
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
      <h1>Decisión sobre el Requerimiento de Gasto</h1>
      <p><strong>Descripción:</strong> ${data.descripcion}</p>
      <p><strong>Justificación:</strong> ${data.justificacion}</p>
      <p><strong>Monto Estimado:</strong> $${data.monto_estimado}</p>
      <button onclick="decidir('Aprobado')">Aprobar</button>
      <button onclick="decidir('Rechazado')">Rechazar</button>
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
            window.location.href = '/';
          })
          .catch(error => alert('Error al tomar la decisión: ' + error.message));
        }
      </script>
    `);
  } catch (error) {
    console.error('❌ Error al decidir el requerimiento:', error);
    res.status(500).send('Hubo un error al cargar la página de decisión');
  }
};
