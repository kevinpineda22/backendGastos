import supabase from "../services/supabaseService.js";
import { sendEmail } from "../services/emailService.js";
import crypto from "crypto";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Función para sanitizar el nombre del archivo, eliminando caracteres especiales no permitidos
const sanitizeFileName = (fileName) => {
  return fileName.replace(/[^\w.-]/g, "");
};

// Estructura de grupos de líderes con sus empleados
const gruposLideres = {
  "kp0827074@gmail.com": ["desarrollo@merkahorrosas.com"],
  "isazamanuel04@gmail.com": [
    "juanmerkahorro@gmail.com",
    "developersmk@merkahorrosas.com",
  ],
  "johansanchezvalencia@gmail.com": ["johanmerkahorro777@gmail.com"],
  "contabilidad1@merkahorrosas.com": ["analistacontable@merkahorrosas.com"],
  "gerencia1@merkahorrosas.com": [
    "comercial@merkahorrosas.com",
    "paginaweb@merkahorrosas.com",
  ],
  "gestionhumana@merkahorrosas.com": [
    "asistentegh@merkahorrosas.com",
    "sistemageneralsst@merkahorrosas.com",
    "analistadebienestar@merkahorrosas.com",
  ],
  "carteraytesoreria@merkahorrosas.com": [
    "cartera@merkahorrosas.com",
    "analistatesoreria@merkahorrosas.com",
  ],
};

// Definir roles de usuarios para permisos
const userPermissions = {
  "carteraytesoreria@merkahorrosas.com": { role: "director" },
  "gestionhumana@merkahorrosas.com": { role: "director" },
  "operaciones@merkahorrosas.com": { role: "director" },
  "contabilidad1@merkahorrosas.com": { role: "director" },
  "juanmerkahorro@gmail.com": { role: "director" },
  "johanmerkahorro777@gmail.com": { role: "contabilidad" },
  "contabilidad@merkahorrosas.com": { role: "contabilidad" },
};

const obtenerJefePorEmpleado = (correo_empleado) => {
  for (const [lider, empleados] of Object.entries(gruposLideres)) {
    if (empleados.includes(correo_empleado)) {
      return lider;
    }
  }
  return "operaciones@merkahorrosas.com";
};

// Función para obtener el rol de un usuario
const obtenerRolUsuario = (correo_usuario) => {
  return userPermissions[correo_usuario]?.role || "empleado";
};

// Función para verificar si un usuario tiene permisos específicos
const verificarPermisos = (correo_usuario, accion) => {
  const rol = obtenerRolUsuario(correo_usuario);

  switch (accion) {
    case "aprobar_requerimiento":
      return ["director"].includes(rol);
    case "actualizar_contabilidad":
      return ["director", "contabilidad"].includes(rol);
    case "ver_todos_requerimientos":
      return ["director", "contabilidad"].includes(rol);
    case "eliminar_requerimiento":
      return ["director"].includes(rol);
    default:
      return false;
  }
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
    monto_sede,
    observacion_responsable, // ✅ CORREGIDO: Este es para el campo "Observación:" del formulario
  } = req.body;

  // ✅ NUEVO: Log para debug
  console.log("📝 Campos de observación recibidos:", {
    observacion_responsable, // Del formulario
  });

  const archivoCotizacion = req.files["archivo_cotizacion"]
    ? req.files["archivo_cotizacion"][0]
    : null;
  const archivosProveedor = req.files["archivos_proveedor"] || [];

  console.log("Correo del solicitante recibido:", correo_empleado);

  if (!archivoCotizacion) {
    return res
      .status(400)
      .json({ error: "El archivo de cotización es obligatorio." });
  }

  const token = crypto.randomBytes(16).toString("hex");

  try {
    let archivoCotizacionUrl = "";
    if (archivoCotizacion) {
      const uniqueFileName = `${Date.now()}_${sanitizeFileName(
        archivoCotizacion.originalname
      )}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("cotizaciones")
        .upload(`cotizaciones/${uniqueFileName}`, archivoCotizacion.buffer, {
          contentType: archivoCotizacion.mimetype,
        });

      if (uploadError) {
        console.error(
          "❌ Error al subir el archivo de cotización a Supabase:",
          uploadError
        );
        return res.status(500).json({ error: uploadError.message });
      }

      archivoCotizacionUrl = `https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/cotizaciones/${uploadData.path}`;
    }

    let archivosProveedorUrls = [];
    if (archivosProveedor && archivosProveedor.length > 0) {
      for (let archivo of archivosProveedor) {
        const uniqueFileName = `${Date.now()}_${sanitizeFileName(
          archivo.originalname
        )}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("cotizaciones")
          .upload(`proveedores/${uniqueFileName}`, archivo.buffer, {
            contentType: archivo.mimetype,
          });

        if (uploadError) {
          console.error(
            "❌ Error al subir el archivo del proveedor a Supabase:",
            uploadError
          );
          return res.status(500).json({ error: uploadError.message });
        }

        const archivoUrl = `https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/cotizaciones/${uploadData.path}`;
        archivosProveedorUrls.push(archivoUrl);
      }
    }

    const unidadArray = Array.isArray(unidad) ? unidad : [unidad];
    const centroCostosArray = Array.isArray(centro_costos)
      ? centro_costos
      : [centro_costos];
    const sedesArray = Array.isArray(sede) ? sede : [sede];

    const unidadPgArray = `{${unidadArray
      .map((item) => `"${item}"`)
      .join(",")}}`;
    const centroCostosPgArray = `{${centroCostosArray
      .map((item) => `"${item}"`)
      .join(",")}}`;
    const sedesPgArray = `{${sedesArray.map((item) => `"${item}"`).join(",")}}`;

    const { data, error } = await supabase
      .from("Gastos")
      .insert([
        {
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
          observacion: observacion_responsable || "", // ✅ CORREGIDO: Guardar en campo 'observacion' de la tabla
          token,
          estado: "Pendiente",
        },
      ])
      .select();

    console.log("✅ Registro insertado con observacion:", observacion_responsable);

    if (error) {
      console.error("❌ Error al insertar en Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    const destinatarioEncargado = obtenerJefePorEmpleado(correo_empleado);

    const mensajeEncargado = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        table { width: 100%; border-spacing: 0; background-color: #ffffff; }
        td { padding: 15px; }
        h2 { font-size: 24px; color: rgb(255, 255, 255); }
        .button { background-color: #210d65; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
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
                    <tr><td style="font-weight: bold;">Nombre Completo:</td><td>${nombre_completo}</td></tr>
                    <tr><td style="font-weight: bold;">Área:</td><td>${area}</td></tr>
                    <tr><td style="font-weight: bold;">Descripción:</td><td>${descripcion}</td></tr>
                    <tr><td style="font-weight: bold;">Procesos:</td><td>${procesos}</td></tr>
                    <tr><td style="font-weight: bold;">Sedes:</td><td>${sedesArray.join(
                      ", "
                    )}</td></tr>
                    <tr><td style="font-weight: bold;">Unidad de Negocio:</td><td>${unidadArray.join(
                      ", "
                    )}</td></tr>
                    <tr><td style="font-weight: bold;">Centro de Costos:</td><td>${centroCostosArray.join(
                      ", "
                    )}</td></tr>
                    <tr><td style="font-weight: bold;">Monto Estimado:</td><td>$${monto_estimado}</td></tr>
                    <tr><td style="font-weight: bold;">Monto por sede:</td><td>$${monto_sede}</td></tr>
                    <tr><td style="font-weight: bold;">Anticipo:</td><td>$${anticipo}</td></tr>
                    <tr><td style="font-weight: bold;">Fecha tiempo estimado de pago:</td><td>$${tiempo_fecha_pago}</td></tr>
                    <tr><td style="font-weight: bold;">Cotización:</td><td><a href="${archivoCotizacionUrl}" target="_blank" style="color: #3498db;">Ver Cotización</a></td></tr>
                    <tr><td style="font-weight: bold;">Archivos del Proveedor:</td><td>${archivosProveedorUrls
                      .map(
                        (url) =>
                          `<a href="${url}" target="_blank" style="color: #3498db;">Ver archivo proveedor</a>`
                      )
                      .join("<br>")}</td></tr>
                  </table>
                  <p style="margin-top: 20px;">Para aprobar o rechazar el requerimiento, haz clic en el siguiente enlace:</p>
                  <a href="https://www.merkahorro.com/aprobarrechazar?token=${encodeURIComponent(
                    token
                  )}" class="button">Aprobar/Rechazar</a>
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

    const archivoAdjunto = [];
    archivoAdjunto.push({
      filename: archivoCotizacion.originalname,
      content: archivoCotizacion.buffer,
      encoding: "base64",
    });

    if (archivosProveedor && archivosProveedor.length > 0) {
      archivosProveedor.forEach((archivo) => {
        archivoAdjunto.push({
          filename: archivo.originalname,
          content: archivo.buffer,
          encoding: "base64",
        });
      });
    }

    await sendEmail({
      to: destinatarioEncargado,
      subject: "Nuevo Requerimiento de Gasto",
      htmlContent: mensajeEncargado,
      attachments: archivoAdjunto,
    });

    return res.status(201).json({
      message:
        "Tu solicitud de gasto ha sido recibida correctamente. Nuestro equipo está revisando los detalles.",
      token,
    });
  } catch (error) {
    console.error("❌ Error en la creación del requerimiento:", error);
    return res
      .status(500)
      .json({ error: "Hubo un problema al procesar tu solicitud." });
  }
};

// ✅ Consultar historial de gastos por empleado CON FILTRO DE FECHAS
export const obtenerHistorialGastos = async (req, res) => {
  const { correo_empleado, fechaInicio, fechaFin } = req.query;

  // 🐛 DEBUG: Ver qué parámetros llegan
  console.log("🔍 Parámetros recibidos en backend:", {
    correo_empleado,
    fechaInicio,
    fechaFin,
  });

  try {
    // Construir la consulta base
    let query = supabase
      .from("Gastos")
      .select("*")
      .order("fecha_creacion", { ascending: false });

    // Filtrar por correo si se proporciona
    if (correo_empleado) {
      query = query.eq("correo_empleado", correo_empleado);
    }

    // 🎯 AQUÍ ESTÁ LA CLAVE: Aplicar filtro de fechas
    if (fechaInicio && fechaFin) {
      // Convertir las fechas a formato ISO con horas
      const fechaInicioCompleta = `${fechaInicio}T00:00:00.000Z`;
      const fechaFinCompleta = `${fechaFin}T23:59:59.999Z`;

      console.log("📅 Aplicando filtro de fechas:", {
        desde: fechaInicioCompleta,
        hasta: fechaFinCompleta,
      });

      // Aplicar el filtro a la consulta
      query = query
        .gte("fecha_creacion", fechaInicioCompleta)
        .lte("fecha_creacion", fechaFinCompleta);
    }

    // Ejecutar la consulta
    const { data, error } = await query;

    if (error) {
      console.error("❌ Error al obtener el historial de gastos:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(
      "✅ Registros encontrados después del filtro:",
      data?.length || 0
    );

    // 🎯 IMPORTANTE: Devolver en el formato que espera tu frontend
    return res.status(200).json({ data });
  } catch (error) {
    console.error("❌ Error al obtener el historial de gastos:", error);
    return res
      .status(500)
      .json({ error: "Hubo un problema al obtener el historial de gastos." });
  }
};

// ✅ Consultar todos los requerimientos
export const obtenerRequerimientos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Gastos")
      .select("*")
      .order("fecha_creacion", { ascending: false });

    if (error) {
      console.error("❌ Error al consultar:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Lista de requerimientos", data });
  } catch (error) {
    console.error("❌ Error al obtener requerimientos:", error);
    return res
      .status(500)
      .json({ error: "Hubo un problema al obtener los requerimientos." });
  }
};

// ✅ Actualizar requerimiento (corregido para manejar campos de tiempo correctamente)
export const actualizarRequerimiento = async (req, res) => {
  const { id } = req.params;
  const {
    estado,
    observacion,
    verificado,
    observacionC,
    voucher,
    numero_causacion,
    factura,
    categoria_gasto,
    hora_cambio_estado, // ✅ NUEVO: Recibir desde frontend
    hora_ultima_modificacion_contabilidad, // ✅ NUEVO: Recibir desde frontend
  } = req.body;

  console.log("=== INICIANDO ACTUALIZACIÓN ===");
  console.log("ID recibido:", id);
  console.log("Datos a actualizar:", {
    estado,
    observacion,
    observacionC,
    verificado,
    voucher,
    numero_causacion,
    factura,
    categoria_gasto,
    hora_cambio_estado, // ✅ LOG
    hora_ultima_modificacion_contabilidad, // ✅ LOG
  });

  // Validar formato UUID básico
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    console.error("❌ ID no es un UUID válido:", id);
    return res.status(400).json({
      error: "ID inválido. Debe ser un UUID válido.",
      id_recibido: id,
    });
  }

  try {
    // 🔍 PASO 1: Verificar si el registro existe
    console.log("🔍 PASO 1: Verificando existencia del registro...");
    const { data: existingRecord, error: fetchError } = await supabase
      .from("Gastos")
      .select("id, estado, nombre_completo, descripcion")
      .eq("id", id)
      .single();

    console.log("Resultado búsqueda:", {
      data: existingRecord,
      error: fetchError,
    });

    if (fetchError) {
      console.error("❌ Error en la búsqueda:", fetchError);
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({
          error: "Requerimiento no encontrado",
          id_buscado: id,
          codigo_error: fetchError.code,
        });
      }
      return res.status(500).json({ error: fetchError.message });
    }

    if (!existingRecord) {
      console.warn("⚠️ Registro no encontrado con ID:", id);
      return res.status(404).json({
        error: "Requerimiento no encontrado",
        id_buscado: id,
      });
    }

    console.log("✅ Registro encontrado:", existingRecord);

    // 🔄 PASO 2: Preparar datos para actualización
    const updateData = {};
    if (estado !== undefined) updateData.estado = estado;
    if (observacion !== undefined) updateData.observacion = observacion;
    if (observacionC !== undefined) updateData.observacionC = observacionC;
    if (verificado !== undefined) updateData.verificado = verificado;
    if (voucher !== undefined) updateData.voucher = voucher;
    if (numero_causacion !== undefined) updateData.numero_causacion = numero_causacion;
    if (factura !== undefined) updateData.factura = factura;
    if (categoria_gasto !== undefined) updateData.categoria_gasto = categoria_gasto;

    // ✅ NUEVO: Manejo específico de campos de tiempo
    if (hora_cambio_estado !== undefined) {
      updateData.hora_cambio_estado = hora_cambio_estado;
      console.log("⏰ Actualizando hora_cambio_estado:", hora_cambio_estado);
    }

    if (hora_ultima_modificacion_contabilidad !== undefined) {
      updateData.hora_ultima_modificacion_contabilidad = hora_ultima_modificacion_contabilidad;
      console.log("⏰ Actualizando hora_ultima_modificacion_contabilidad:", hora_ultima_modificacion_contabilidad);
    }

    console.log("📝 PASO 2: Datos finales para actualizar:", updateData);

    // 🚀 PASO 3: Ejecutar actualización
    console.log("🚀 PASO 3: Ejecutando actualización...");
    const { data: updatedData, error: updateError } = await supabase
      .from("Gastos")
      .update(updateData)
      .eq("id", id)
      .select();

    console.log("Resultado actualización:", {
      data: updatedData,
      error: updateError,
      rowsAffected: updatedData ? updatedData.length : 0,
    });

    if (updateError) {
      console.error("❌ Error al actualizar:", updateError);
      return res.status(500).json({
        error: updateError.message || "Error desconocido",
        codigo_error: updateError.code,
      });
    }

    if (!updatedData || updatedData.length === 0) {
      console.warn(
        "⚠️ No se actualizaron filas. Posible problema de permisos RLS."
      );
      return res.status(404).json({
        error: "No se pudo actualizar el requerimiento. Verifique permisos.",
        id_buscado: id,
      });
    }

    console.log("✅ Actualización exitosa");
    return res.status(200).json({
      message: "Registro actualizado correctamente",
      data: updatedData[0],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("💥 Error general en actualizarRequerimiento:", err);
    return res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};

// ✅ Decidir requerimiento (aprobar/rechazar)
export const decidirRequerimiento = async (req, res) => {
  const { token, decision, observacion } = req.body;

  console.log("Datos recibidos:", { token, decision, observacion });

  try {
    const { data, error } = await supabase
      .from("Gastos")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !data) {
      console.error("❌ Error al obtener el requerimiento:", error);
      return res.status(404).json({ error: "Requerimiento no encontrado" });
    }

    const { error: updateError } = await supabase
      .from("Gastos")
      .update({
        estado: decision,
        observacion: observacion,
      })
      .eq("token", token);

    if (updateError) {
      console.error(
        "❌ Error al actualizar estado y observación:",
        updateError
      );
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
          <p>Tu necesidad de conciencia del gasto "<strong>${
            data.descripcion
          }</strong>" ha sido considerada <strong>${decision.toLowerCase()}</strong>.</p>
          <p><strong>Observación:</strong> ${
            observacion || "Sin observaciones."
          }</p>
          <div style="padding: 10px; font-style: italic;">
            <p>"Procura que todo aquel que llegue a ti, salga de tus manos mejor y más feliz."</p>
            <p><strong>📜 Autor:</strong> Madre Teresa de Calcuta</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const correoSolicitante = data.correo_empleado;

    await sendEmail({
      to: correoSolicitante,
      subject: "Decisión sobre tu requerimiento de gasto",
      htmlContent: mensajeSolicitante,
    });

    return res.status(200).json({
      message: `Requerimiento ${decision} y observación guardados correctamente.`,
    });
  } catch (error) {
    console.error("❌ Error en la actualización del estado:", error);
    return res.status(500).json({
      error: "Hubo un problema al procesar la actualización del estado.",
    });
  }
};

// ✅ Adjuntar múltiples vouchers
export const adjuntarVouchers = async (req, res) => {
  try {
    const { id, correo_empleado } = req.body;
    const voucherFiles = req.files["vouchers"];

    if (!id || !correo_empleado || !voucherFiles || voucherFiles.length === 0) {
      return res.status(400).json({
        error: "Se requieren el id, correo_empleado y al menos un voucher.",
      });
    }

    // 🟡 Obtener los vouchers actuales
    const { data: currentData, error: currentError } = await supabase
      .from("Gastos")
      .select("vouchers")
      .eq("id", id)
      .single();

    if (currentError) {
      console.error("❌ Error al obtener los vouchers actuales:", currentError);
      return res.status(500).json({ error: currentError.message });
    }

    const vouchersExistentes = Array.isArray(currentData.vouchers)
      ? currentData.vouchers
      : [];

    const nuevosVouchers = [];

    for (const file of voucherFiles) {
      const uniqueName = `${Date.now()}_${uuidv4()}_${sanitizeFileName(
        file.originalname
      )}`;
      const { data, error } = await supabase.storage
        .from("cotizaciones")
        .upload(`comprobante/${uniqueName}`, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) {
        console.error("❌ Error al subir un voucher:", error);
        return res.status(500).json({ error: error.message });
      }

      const fullURL = `https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/cotizaciones/${data.path}`;
      nuevosVouchers.push(fullURL);
    }

    const todosLosVouchers = [...vouchersExistentes, ...nuevosVouchers];

    const { error: updateError } = await supabase
      .from("Gastos")
      .update({ vouchers: todosLosVouchers })
      .eq("id", id);

    if (updateError) {
      console.error("❌ Error al guardar vouchers:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      message: "Vouchers adjuntados correctamente",
      archivos_comprobantes: nuevosVouchers,
    });
  } catch (error) {
    console.error("❌ Error general en adjuntarVouchers:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ✅ Enviar múltiples vouchers con diseño bonito
export const enviarVouchers = async (req, res) => {
  try {
    const { id, correo_empleado } = req.body;
    if (!id || !correo_empleado) {
      return res.status(400).json({ error: "Faltan datos." });
    }

    const { data, error } = await supabase
      .from("Gastos")
      .select("vouchers, nombre_completo")
      .eq("id", id)
      .single();

    if (error || !data?.vouchers?.length) {
      return res.status(400).json({ error: "No hay vouchers disponibles." });
    }

    const nombreDestinatario = data.nombre_completo || "Usuario/a";
    const linksHTML = data.vouchers
      .map(
        (url, idx) => `
        <p style="text-align: center; margin: 12px 0;">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #210d65; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Ver Voucher ${idx + 1}
          </a>
        </p>
      `
      )
      .join("");

    const mensajeHTML = `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reenvío de Vouchers - Supermercado Merkahorro</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f4">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td bgcolor="#210d65" style="padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                    <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Reenvío de Vouchers</h1>
                    <p style="color: #d1d5db; font-size: 14px; margin: 5px 0 0;">Supermercado Merkahorro S.A.S.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px; color: #333333;">
                    <p style="font-size: 16px; line-height: 24px; margin: 0 0 15px;">Estimado/a ${nombreDestinatario},</p>
                    <p style="font-size: 16px; line-height: 24px; margin: 0 0 15px;">Te compartimos los comprobantes de voucher correspondientes a tu gasto:</p>
                    ${linksHTML}
                    <p style="font-size: 14px; line-height: 20px; color: #666666; margin: 20px 0 0;">Si tienes alguna duda o necesitas asistencia, no dudes en contactar al equipo de soporte.</p>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#e5e7eb" style="padding: 20px; text-align: center; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                    <p style="font-size: 12px; color: #666666; margin: 0;">© 2025 Supermercado Merkahorro S.A.S. Todos los derechos reservados.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await sendEmail({
      to: correo_empleado,
      subject: "Vouchers adjuntos - Merkahorro",
      htmlContent: mensajeHTML,
    });

    return res
      .status(200)
      .json({ message: "Vouchers enviados correctamente." });
  } catch (err) {
    console.error("❌ Error en enviarVouchers:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ✅ Eliminar un solo voucher
export const eliminarVoucher = async (req, res) => {
  try {
    const { id, voucherURL } = req.body;

    if (!id || !voucherURL) {
      return res.status(400).json({ error: "Se requiere id y voucherURL." });
    }

    // Obtener los vouchers actuales
    const { data, error } = await supabase
      .from("Gastos")
      .select("vouchers")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const nuevosVouchers = data.vouchers.filter((url) => url !== voucherURL);

    // Actualizar la base de datos
    const { error: updateError } = await supabase
      .from("Gastos")
      .update({ vouchers: nuevosVouchers })
      .eq("id", id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res
      .status(200)
      .json({ message: "Voucher eliminado con éxito.", nuevosVouchers });
  } catch (err) {
    console.error("❌ Error al eliminar voucher:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ✅ Eliminar requerimiento
export const eliminarRequerimiento = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ error: "Se requiere un ID válido para eliminar el registro." });
    }

    const { data: requerimiento, error: fetchError } = await supabase
      .from("Gastos")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !requerimiento) {
      return res.status(404).json({ error: "Registro no encontrado." });
    }

    const { error } = await supabase.from("Gastos").delete().eq("id", id);

    if (error) {
      console.error("❌ Error al eliminar el requerimiento:", error);
      return res
        .status(500)
        .json({ error: "No se pudo eliminar el registro." });
    }

    return res
      .status(200)
      .json({ message: "Registro eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error en eliminarRequerimiento:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ✅ Actualizar estado_cartera
export const actualizarEstadoCartera = async (req, res) => {
  const { id, estado_cartera } = req.body;

  if (!id || !estado_cartera) {
    return res
      .status(400)
      .json({ error: "Se requiere el id y el estado_cartera." });
  }

  if (!["Pendiente", "Anticipo", "Cancelado"].includes(estado_cartera)) {
    return res.status(400).json({ error: "Estado de cartera inválido." });
  }

  try {
    const { data, error } = await supabase
      .from("Gastos")
      .update({ estado_cartera })
      .eq("id", id)
      .select();

    if (error) {
      console.error("❌ Error al actualizar estado_cartera:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Requerimiento no encontrado" });
    }

    return res
      .status(200)
      .json({ message: "Estado de cartera actualizado correctamente", data });
  } catch (error) {
    console.error("❌ Error en actualizarEstadoCartera:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const editarCotizacion = async (req, res) => {
  const { id } = req.params;
  const archivoCotizacion = req.file;
  const { observacion_responsable } = req.body; // ✅ CAMBIO: Usar observacion_responsable

  console.log("📝 Datos recibidos en editarCotizacion:", { 
    id, 
    observacion_responsable, 
    tieneArchivo: !!archivoCotizacion 
  });

  if (!id) {
    return res.status(400).json({ error: "ID inválido." });
  }

  if (!archivoCotizacion && !observacion_responsable) {
    return res
      .status(400)
      .json({ error: "Debes proporcionar una cotización o una observación." });
  }

  try {
    const { data: requerimiento, error: fetchError } = await supabase
      .from("Gastos")
      .select(
        "archivo_cotizacion, nombre_completo, descripcion, correo_empleado, token, observacion_responsable"
      )
      .eq("id", id)
      .single();

    if (fetchError || !requerimiento) {
      return res.status(404).json({ error: "Requerimiento no encontrado." });
    }

    let archivoCotizacionUrl = requerimiento.archivo_cotizacion;

    if (archivoCotizacion) {
      const uniqueFileName = `${Date.now()}_${sanitizeFileName(
        archivoCotizacion.originalname
      )}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("cotizaciones")
        .upload(`cotizaciones/${uniqueFileName}`, archivoCotizacion.buffer, {
          contentType: archivoCotizacion.mimetype,
        });

      if (uploadError) {
        return res.status(500).json({ error: uploadError.message });
      }

      archivoCotizacionUrl = `https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/cotizaciones/${uploadData.path}`;

      if (requerimiento.archivo_cotizacion) {
        const oldFilePath =
          requerimiento.archivo_cotizacion.split("/cotizaciones/")[1];
        if (oldFilePath) {
          const { error: deleteError } = await supabase.storage
            .from("cotizaciones")
            .remove([`cotizaciones/${oldFilePath}`]);

          if (deleteError) {
            console.warn(
              "⚠️ Error al eliminar el archivo anterior:",
              deleteError
            );
          }
        }
      }
    }

    const updateData = {
      archivo_cotizacion: archivoCotizacionUrl,
    };

    // ✅ CAMBIO: Solo agregar observacion_responsable si se proporciona
    if (observacion_responsable !== undefined && observacion_responsable !== null) {
      updateData.observacion_responsable = observacion_responsable;
      console.log("📝 Actualizando observacion_responsable a:", observacion_responsable);
    }

    console.log("📝 Datos finales para actualizar:", updateData);

    const { error: updateError } = await supabase
      .from("Gastos")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("❌ Error al actualizar:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    const destinatarioEncargado = obtenerJefePorEmpleado(
      requerimiento.correo_empleado
    );
    const mensajeEncargado = `
      <!DOCTYPE html>
      <html>
      <body>
        <h2>Actualización de Requerimiento</h2>
        <p>Estimado encargado,</p>
        <p>Se ha actualizado el requerimiento de ${
          requerimiento.nombre_completo
        } (${requerimiento.descripcion}).</p>
        ${
          archivoCotizacion
            ? `<p>Nueva Cotización: <a href="${archivoCotizacionUrl}">Ver Cotización</a></p>`
            : ""
        }
        ${observacion_responsable ? `<p>Nueva Observación: ${observacion_responsable}</p>` : ""}
      </body>
      </html>
    `;

    await sendEmail({
      to: destinatarioEncargado,
      subject: "Actualización de Requerimiento de Gasto",
      htmlContent: mensajeEncargado,
      attachments: archivoCotizacion
        ? [
            {
              filename: archivoCotizacion.originalname,
              content: archivoCotizacion.buffer,
              encoding: "base64",
            },
          ]
        : [],
    });

    return res.status(200).json({
      message: "Requerimiento actualizado correctamente.",
      archivo_cotizacion: archivoCotizacionUrl,
    });
  } catch (err) {
    console.error("❌ Error en editarCotizacion:", err);
    return res
      .status(500)
      .json({ error: "Hubo un problema al actualizar el requerimiento." });
  }
};

export const editarTiempoFechaPago = async (req, res) => {
  const { id } = req.params;
  const { tiempo_fecha_pago } = req.body;

  console.log("📝 Datos recibidos en editarTiempoFechaPago:", { 
    id, 
    tiempo_fecha_pago,
    tipoFecha: typeof tiempo_fecha_pago
  });

  if (!id) {
    return res.status(400).json({ error: "ID inválido." });
  }

  if (!tiempo_fecha_pago) {
    return res.status(400).json({ error: "Se requiere tiempo_fecha_pago." });
  }

  try {
    // ✅ CAMBIO CRÍTICO: Validar formato y guardar como DATE limpio
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(tiempo_fecha_pago)) {
      return res.status(400).json({ error: "Formato de fecha inválido. Use YYYY-MM-DD." });
    }

    console.log("📅 Fecha que se guardará (formato DATE):", tiempo_fecha_pago);

    // ✅ CRÍTICO: Guardar EXACTAMENTE como viene, sin modificaciones
    const { error } = await supabase
      .from("Gastos")
      .update({ tiempo_fecha_pago: tiempo_fecha_pago }) // Supabase maneja automáticamente DATE
      .eq("id", id);

    if (error) {
      console.error("❌ Error al actualizar fecha:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ Fecha actualizada correctamente como:", tiempo_fecha_pago);

    return res
      .status(200)
      .json({ message: "Tiempo/Fecha de Pago actualizado correctamente." });
  } catch (err) {
    console.error("❌ Error en editarTiempoFechaPago:", err);
    return res.status(500).json({ error: "Hubo un problema al actualizar." });
  }
};
