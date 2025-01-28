import supabase from '../services/supabaseService.js';
import { sendEmail } from '../services/emailService.js';
import crypto from 'crypto';

// ✅ Crear requerimiento
export const crearRequerimiento = async (req, res) => {
  const { nombre_completo, area,procesos,sede,unidad, descripcion, monto_estimado, archivo_cotizacion, correo_empleado } = req.body;

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
        procesos,
        sede,
        unidad,
        descripcion, 
        monto_estimado, 
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

    // Correo para el encargado en texto plano
    const mensajeEncargado = `
Nuevo Requerimiento de Gasto

Nombre Completo: ${nombre_completo}
Área: ${area}
Descripción: ${descripcion}
Procesos: ${procesos}
Centro de Operaciones:${sede}
Unidad de Negocio:${unidad}
Monto Estimado: $${monto_estimado}

Cotización: ${archivo_cotizacion}

Decida si aprobar o rechazar el requerimiento a través del siguiente enlace:
http://localhost:5173/AprobarRechazar?token=${encodeURIComponent(token)}

Saludos cordiales,
El equipo de gestión de gastos
Merkahorro
`;

    await sendEmail(
      'desarrollo@merkahorrosas.com', // Correo del encargado
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

    // Correo para el solicitante (texto plano)
    const mensajeSolicitante = `
Estimado ${data.nombre_completo},

Tu requerimiento de gasto con la descripción "${data.descripcion}" ha sido ${decision.toLowerCase()}.

Si tienes alguna duda, por favor, contáctanos.

Saludos cordiales,
El equipo de gestión de gastos
Merkahorro
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

    // Responder al cliente con el mensaje de éxito
    return res.status(200).json({ message: `Requerimiento ${decision} correctamente` });
  } catch (error) {
    console.error('❌ Error en la actualización del estado:', error);
    return res.status(500).json({ error: 'Hubo un problema al procesar la actualización del estado.' });
  }
};