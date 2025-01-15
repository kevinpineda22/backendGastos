import supabase from '../services/supabaseService.js';
import { sendEmail } from '../services/emailService.js';
import crypto from 'crypto';

// ✅ Crear requerimiento
export const crearRequerimiento = async (req, res) => {
  const { empleado_id, descripcion, justificacion, monto_estimado, archivo_factura, archivo_cotizacion, correo_empleado } = req.body;

  const token = crypto.randomBytes(16).toString('hex');

  const { data, error } = await supabase
    .from('Gastos')
    .insert([{ empleado_id, descripcion, justificacion, monto_estimado, archivo_factura, archivo_cotizacion, correo_empleado, token, estado: 'Pendiente' }])
    .select();

  if (error) {
    console.error('❌ Error al insertar en Supabase:', error);
    return res.status(500).json({ error: error.message });
  }

  await sendEmail(
    'johanmerkahorro777@gmail.com',
    'Nuevo Requerimiento de Gasto',
    `Descripción: ${descripcion}\nMonto: $${monto_estimado}\nToken: ${token}\n\nDecide aquí:\nhttps://backend-gastos.vercel.app/decidir/${token}`
  );

  res.status(201).json({ message: 'Requerimiento creado exitosamente', data });
};

// ✅ Aprobar o rechazar requerimiento
export const actualizarEstado = async (req, res) => {
  const { token, decision } = req.body;

  const { error } = await supabase
    .from('Gastos')
    .update({ estado: decision })
    .eq('token', token);

  if (error) {
    console.error('❌ Error al actualizar estado:', error);
    return res.status(500).json({ error: error.message });
  }

  await sendEmail(
    'gastosmerkahorro@gmail.com',
    `Requerimiento ${decision}`,
    `Tu requerimiento con token ${token} ha sido ${decision.toLowerCase()}.`
  );

  res.status(200).json({ message: `Requerimiento ${decision} correctamente` });
};

// ✅ Consultar requerimientos
export const obtenerRequerimientos = async (req, res) => {
  const { data, error } = await supabase
    .from('Gastos')
    .select('*')
    .order('fecha_creacion', { ascending: false });

  if (error) {
    console.error('❌ Error al consultar:', error);
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ message: 'Lista de requerimientos', data });
};

// ✅ Página para aprobar o rechazar requerimiento
export const decidirRequerimiento = async (req, res) => {
  const { token } = req.params;

  const { data, error } = await supabase
    .from('Gastos')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) {
    console.error('❌ Error al obtener el requerimiento:', error);
    return res.status(404).send('Requerimiento no encontrado');
  }

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
};
