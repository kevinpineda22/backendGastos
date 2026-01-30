import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./HistorialGastos.css";
import * as XLSX from "xlsx";
import { supabase } from "../../supabaseClient";
import { FiltroGastos } from "./FiltroGastos";

const HistorialGastos = () => {
  const correoUsuario =
    sessionStorage.getItem("correo_empleado") ||
    localStorage.getItem("correo_empleado");

  useEffect(() => {
    const correoSession = sessionStorage.getItem("correo_empleado");
    const correoLocal = localStorage.getItem("correo_empleado");
    if (correoSession && correoSession !== correoLocal) {
      localStorage.setItem("correo_empleado", correoSession);
    }
  }, []);

  const mapaAreaLideres = {
    "gestionhumana@merkahorrosas.com": "Gestión humana",
    "administracion@merkahorrosas.com": "Administración",
    "operaciones@merkahorrosas.com": "Operaciones",
    "carteraytesoreria@merkahorrosas.com": "Cartera",
  };

  const expenseCategories = [
    "MAQUINARIA Y EQUIPO",
    "MUEBLES Y ENSERES",
    "EQUIPO DE COMPUTO Y COMUNICACION",
    "FLOTA Y EQUIPO DE TRANSPORTE",
    "COMPRA ACTIVOS FIJOS",
    "PERSO BONIFICACION NCS",
    "PERSO DOTACION Y SUMINISTRO A TRABAJADOR",
    "PERSO SEGUROS",
    "PERSO CAPACITACION AL PERSONAL",
    "HONOR JUNTA DIRECTIVA",
    "HONOR REVISORÍA FISCAL",
    "HONOR ASESORIA JURIDICA",
    "HONOR ASESORIA FINANCIERA",
    "HONOR ASESORIA SALUD OCUPACIONAL",
    "SEGURO POLIZA DE CUMPLIMIENTO",
    "SEGURO MULTIRRIESGO",
    "SEGURO FLOTA Y EQUIPO DE TRANSPORTE",
    "SEGURO RESPONSABILIDAD CIVIL",
    "SERVI ASEO Y VIGILANCIA",
    "SERVI TEMPORALES",
    "SERVI ASISTENCIA TECNICA",
    "SERVI PROCESAMIENTO ELECTRONICO DE DATOS",
    "SERVI TRANSPORTE,FLETES Y ACARREOS",
    "SERVI PUBLICIDAD,PROPAGANDA Y PROMOCION",
    "SERVI OTROS",
    "MANTE CONSTRUCCIONES Y EDIFICACIONES",
    "MANTE MAQUINARIA Y EQUIPO",
    "MANTE EQUIPO DE OFICINA",
    "MANTE EQUIPO DE COMPUTO Y COMUNICACION",
    "MANTE EQUIPO MEDICO Y CIENTIFICO",
    "MANTE FLOTA Y EQUIPO DE TRANSPORTE",
    "MANTE FYE TPTE MOTOS",
    "COMPRA DE MATERIALES MANTENIMIENTO",
    "ADECU DECORACION SUPERMERCADO",
    "ADECU REPACIONES LOCATIVAS",
    "ADECU REPACIONES LOCATIVAS EXCLUIDA",
    "INTERESES GENERALES",
    "DONACIONES VARIAS",
    "DIVER GASTOS DE REPRESEN Y RELACIONES PU",
    "DIVER ELEMENTOS DE ASEO Y CAFETERIA",
    "DIVER UTILES, PAPELERIA Y FOTOCOPIAS",
    "DIVER ENVASES Y EMPAQUES",
    "DIVER ROLLOS CINTAS Y ETIQUETAS",
    "DIVER PEAJES",
    "DIVER ATENCION A EMPLEADOS",
    "DIVER MAQUINARIA Y EQUIPO",
    "DIVER MUEBLES Y ENSERES",
    "DIVER COMPR EQUIPO DE COMUNICACION Y COM",
    "GASTOS CARNICERIA",
    "DIVER COMPRA MAQUINARIA Y EQUIPO",
    "DIVER COMPRA MUEBLES Y ENSERES",
    "DIVER COMPRA DE EQUIPOS DE COMUNICACION",
  ];

  const [historial, setHistorial] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    estado: "Pendiente",
    observacion: "",
    observacionC: "",
    numero_causacion: "",
    factura: [],
    categoria_gasto: "",
  });
  const [updateMessage, setUpdateMessage] = useState(null);
  const [filteredHistorial, setFilteredHistorial] = useState([]);
  const [hiddenRows, setHiddenRows] = useState([]);
  const [showHiddenRowsList, setShowHiddenRowsList] = useState(false);

  const API_URL =
    "https://backend-gastos.vercel.app/api/requerimientos/obtenerRequerimientos";
  const UPDATE_URL = "https://backend-gastos.vercel.app/api/requerimientos";
  const SUPABASE_URL =
    "https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public";

  const scrollContainerRef = useRef(null);

  const scrollLeft = () =>
    scrollContainerRef.current?.scrollBy({ left: -500, behavior: "smooth" });
  const scrollRight = () =>
    scrollContainerRef.current?.scrollBy({ left: 500, behavior: "smooth" });

  // Función que recibe los datos filtrados del componente FiltroGastos
  const handleDataFiltered = (dataFiltrada) => {
    console.log("📊 Datos filtrados recibidos:", dataFiltrada.length);
    setHistorial(dataFiltrada);
    setFilteredHistorial(dataFiltrada);
    setUpdateMessage({
      type: "info",
      text: `Mostrando ${dataFiltrada.length} gastos filtrados.`,
    });
  };

  // -----------------------------------------------------------------

  useEffect(() => {
    if (!correoUsuario) return;
    const fetchHiddenRowsFromSupabase = async () => {
      const { data, error } = await supabase
        .from("filas_ocultas_gastos")
        .select("gasto_id")
        .eq("correo_empleado", correoUsuario);
      if (!error && data) setHiddenRows(data.map((row) => row.gasto_id));
    };
    fetchHiddenRowsFromSupabase();
  }, [correoUsuario]);

  const handleHideRow = async (id) => {
    setHiddenRows((prev) => [...prev, id]);
    if (correoUsuario) {
      await supabase
        .from("filas_ocultas_gastos")
        .insert([{ correo_empleado: correoUsuario, gasto_id: id }]);
    }
  };

  const handleShowHiddenRow = async (id) => {
    setHiddenRows((prev) => prev.filter((hiddenId) => hiddenId !== id));
    if (correoUsuario) {
      await supabase
        .from("filas_ocultas_gastos")
        .delete()
        .eq("correo_empleado", correoUsuario)
        .eq("gasto_id", id);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(historial);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");
    XLSX.writeFile(workbook, "historial_gastos.xlsx");
  };

  const formatoCOP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const getEstadoClass = (estado) => {
    switch (estado) {
      case "Pendiente":
        return "estado-pendiente";
      case "Necesario":
        return "estado-aprobado";
      case "No necesario":
        return "estado-rechazado";
      default:
        return "";
    }
  };

  const handleEditClick = (gasto) => {
    // Asegúrate de manejar el valor de 'factura' correctamente
    let facturaExistente = [];
    try {
      facturaExistente = gasto.factura ? JSON.parse(gasto.factura) : [];
    } catch (e) {
      console.error("Error parsing factura JSON:", e);
    }

    setEditingId(gasto.id);
    setEditValues({
      estado: gasto.estado || "Pendiente",
      observacion: gasto.observacion || "",
      observacionC: gasto.observacionC || "",
      numero_causacion: gasto.numero_causacion || "",
      factura: facturaExistente.length > 0 ? facturaExistente[0] : "", // Usa la URL de la primera factura si existe
      categoria_gasto: gasto.categoria_gasto || "", // Initialize with existing category
    });
    setUpdateMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({
      estado: "Pendiente",
      observacion: "",
      observacionC: "",
      numero_causacion: "",
      factura: [],
      categoria_gasto: "",
    });
    setUpdateMessage(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (file) => {
    try {
      const cleanFileName = `${Date.now()}_${file.name.replace(
        /[^a-zA-Z0-9.]/g,
        "_"
      )}`;
      const { data, error } = await supabase.storage
        .from("cotizaciones")
        .upload(`facturas/${cleanFileName}`, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (error) throw error;
      return `${SUPABASE_URL}/cotizaciones/facturas/${cleanFileName}`;
    } catch (error) {
      throw error;
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      const gastoActual = historial.find((item) => item.id === id);

      let facturaUrl = editValues.factura;
      if (editValues.factura instanceof File) {
        facturaUrl = [await handleFileUpload(editValues.factura)];
      } else if (
        typeof editValues.factura === "string" &&
        editValues.factura.startsWith("http")
      ) {
        facturaUrl = [editValues.factura];
      } else {
        facturaUrl = [];
      }

      const payload = {
        correo_empleado: correoUsuario, // ✅ IMPORTANTE: Enviar quién hace el cambio
      };

      let isDirectorChange = false;
      let isContabilidadChange = false;

      // ✅ CAMBIOS DEL DIRECTOR: Estado y observación
      if (
        (currentUserPermissions.role === "director" ||
          currentUserPermissions.role === "admin") &&
        editValues.estado !== gastoActual.estado
      ) {
        payload.estado = editValues.estado;
        isDirectorChange = true;

        // ✅ MODIFICADO: Calcular y almacenar la hora en zona horaria de Bogotá (America/Bogota)
        const now = new Date();
        const bogotaTimeString = now.toLocaleString("en-US", {
          timeZone: "America/Bogota",
        });
        const bogotaTime = new Date(bogotaTimeString);
        payload.hora_cambio_estado = bogotaTime.toISOString();
        console.log("📝 Director cambió estado:", editValues.estado);
      }

      if (
        (currentUserPermissions.role === "director" ||
          currentUserPermissions.role === "admin") &&
        editValues.observacion !== gastoActual.observacion
      ) {
        payload.observacion = editValues.observacion;
        isDirectorChange = true;
        console.log("📝 Director cambió observación");
      }

      const isContabilidadOrAdmin =
        currentUserPermissions.role === "contabilidad" ||
        currentUserPermissions.role === "admin";

      // Manejo de la factura como string JSON
      let currentFacturaParsed = [];
      try {
        currentFacturaParsed = gastoActual.factura
          ? JSON.parse(gastoActual.factura)
          : [];
      } catch (e) {
        // Ignorar si el JSON es inválido, se tratará como vacío
      }

      const newFacturaString = JSON.stringify(facturaUrl);
      const currentFacturaString = JSON.stringify(currentFacturaParsed);

      // CAMBIOS DE CONTABILIDAD
      if (isContabilidadOrAdmin) {
        if (editValues.observacionC !== gastoActual.observacionC) {
          payload.observacionC = editValues.observacionC;
          isContabilidadChange = true;
          console.log("📝 Contabilidad cambió observación");
        }
        if (newFacturaString !== currentFacturaString) {
          payload.factura = newFacturaString;
          isContabilidadChange = true;
          console.log("📝 Contabilidad cambió factura");
        }
        if (editValues.numero_causacion !== gastoActual.numero_causacion) {
          payload.numero_causacion = editValues.numero_causacion;
          isContabilidadChange = true;
          console.log("📝 Contabilidad cambió número de causación");
        }
        if (editValues.categoria_gasto !== gastoActual.categoria_gasto) {
          payload.categoria_gasto = editValues.categoria_gasto;
          isContabilidadChange = true;
          console.log("📝 Contabilidad cambió categoría");
        }

        // ✅ CRÍTICO: Solo actualizar hora_ultima_modificacion_contabilidad si contabilidad hizo cambios
        // Y solo si el usuario actual es realmente de contabilidad (no admin haciendo cambios de director)
        if (
          isContabilidadChange &&
          currentUserPermissions.role === "contabilidad"
        ) {
          // ✅ MODIFICADO: Calcular y almacenar la hora en zona horaria de Bogotá (America/Bogota)
          const now = new Date();
          const bogotaTimeString = now.toLocaleString("en-US", {
            timeZone: "America/Bogota",
          });
          const bogotaTime = new Date(bogotaTimeString);
          payload.hora_ultima_modificacion_contabilidad =
            bogotaTime.toISOString();
          console.log(
            "⏰ Actualizando hora de última modificación de contabilidad"
          );
        }
      }

      if (Object.keys(payload).length === 1 && payload.correo_empleado) {
        setUpdateMessage({
          type: "info",
          text: "No hay cambios para actualizar.",
        });
        setEditingId(null);
        return;
      }

      console.log("📤 Enviando payload:", payload);

      const response = await axios.put(`${UPDATE_URL}/${id}`, payload);

      if (response.status === 200) {
        console.log("✅ Respuesta del servidor:", response.data);

        const updatedItem = {
          ...gastoActual,
          // Aplicar los cambios que acabamos de hacer
          ...(payload.estado && { estado: payload.estado }),
          ...(payload.observacion !== undefined && {
            observacion: payload.observacion,
          }),
          ...(payload.observacionC !== undefined && {
            observacionC: payload.observacionC,
          }),
          ...(payload.numero_causacion !== undefined && {
            numero_causacion: payload.numero_causacion,
          }),
          ...(payload.categoria_gasto !== undefined && {
            categoria_gasto: payload.categoria_gasto,
          }),
          ...(payload.factura !== undefined && { factura: payload.factura }),
          ...(payload.hora_cambio_estado && {
            hora_cambio_estado: payload.hora_cambio_estado,
          }),
          ...(payload.hora_ultima_modificacion_contabilidad && {
            hora_ultima_modificacion_contabilidad:
              payload.hora_ultima_modificacion_contabilidad,
          }),
          // ✅ NUEVO: Actualizar campos de aprobador desde el backend
          ...(response.data.data?.[0]?.aprobado_por_nombre && {
            aprobado_por_nombre: response.data.data[0].aprobado_por_nombre,
          }),
          ...(response.data.data?.[0]?.aprobado_por_correo && {
            aprobado_por_correo: response.data.data[0].aprobado_por_correo,
          }),
          ...response.data.data?.[0],
        };

        console.log("🔄 Actualizando estado local con:", updatedItem);

        setHistorial((prev) =>
          prev.map((item) => (item.id === id ? updatedItem : item))
        );

        setFilteredHistorial((prev) =>
          prev.map((item) => (item.id === id ? updatedItem : item))
        );

        setEditingId(null);

        if (isDirectorChange && !isContabilidadChange) {
          setUpdateMessage({
            type: "success",
            text: "✅ Aprobación del director guardada correctamente",
          });
        } else if (isContabilidadChange && !isDirectorChange) {
          setUpdateMessage({
            type: "success",
            text: "✅ Información de contabilidad actualizada correctamente",
          });
        } else {
          setUpdateMessage({
            type: "success",
            text: "✅ Registro actualizado correctamente",
          });
        }
      } else {
        setUpdateMessage({
          type: "error",
          text: "❌ Error al actualizar el registro",
        });
      }
    } catch (error) {
      console.error("❌ Error en handleSaveEdit:", error);
      setUpdateMessage({
        type: "error",
        text: `❌ Error al actualizar: ${
          error.response?.data?.message || error.message
        }`,
      });
    }
  };

  const handleToggleVerified = async (id, currentValue) => {
    try {
      const newValue = !currentValue;
      const response = await axios.put(`${UPDATE_URL}/${id}`, {
        verificado: newValue,
        correo_empleado: correoUsuario,
      });
      if (response.status === 200) {
        setHistorial((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, verificado: newValue } : item
          )
        );
        setFilteredHistorial((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, verificado: newValue } : item
          )
        );
      } else {
        alert("Error al actualizar la verificación");
      }
    } catch (error) {
      alert("Error al actualizar la verificación");
    }
  };

  const userPermissions = {
    "carteraytesoreria@merkahorrosas.com": {
      role: "director",
      canChangeStatus: true,
      canAddObservation: true,
    },
    "gestionhumana@merkahorrosas.com": {
      role: "director",
      canChangeStatus: true,
      canAddObservation: true,
    },
    "operaciones@merkahorrosas.com": {
      role: "director",
      canChangeStatus: true,
      canAddObservation: true,
    },
    "juanmerkahorro@gmail.com": {
      role: "director",
      canChangeStatus: true,
      canAddObservation: true,
    },
    "johanmerkahorro777@gmail.com": {
      role: "contabilidad",
      canAttachInvoice: true,
      canAddEgreso: true,
      canAddObservationContabilidad: true,
    },
    "contabilidad@merkahorrosas.com": {
      role: "contabilidad",
      canAttachInvoice: true,
      canAddEgreso: true,
      canAddObservationContabilidad: true,
    },
  };

  const currentUserPermissions = userPermissions[correoUsuario] || {
    role: "admin",
  };
  const ocultarColumnasGH = correoUsuario === "gestionhumana@merkahorrosas.com";
  const visibleHistorial = filteredHistorial.filter(
    (gasto) => !hiddenRows.includes(gasto.id)
  );

  if (isSubmitted || !mostrarHistorial) return null;
  if (errorMessage)
    return (
      <div className="gastos-historial">
        <p>Error: {errorMessage}</p>
      </div>
    );

  return (
    <div className="gastos-historial">
      <h2>Historial de Gastos</h2>
      <h4 className="fraseMotivacional">
        "No es la abundancia de bienes lo que define una vida plena, sino la
        prudencia con que utilizamos lo que tenemos."
      </h4>

      {/* Nuevo componente de filtros */}
      <FiltroGastos
        onDataFiltered={handleDataFiltered}
        correoUsuario={correoUsuario}
        mapaAreaLideres={mapaAreaLideres}
      />

      {/* Solo mantenemos el botón de exportar a Excel */}
      <div
        className="export-container"
        style={{ textAlign: "center", marginBottom: "20px" }}
      >
        <button className="excel-button-gastos" onClick={exportToExcel}>
          Exportar a Excel
        </button>
      </div>

      {hiddenRows.length > 0 && (
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <button
            className="boton-mostrar-ocultos"
            onClick={() => setShowHiddenRowsList(!showHiddenRowsList)}
          >
            {showHiddenRowsList ? "Ocultar" : "Mostrar filas ocultas"}
          </button>
        </div>
      )}

      {showHiddenRowsList && hiddenRows.length > 0 && (
        <div className="hidden-rows-container">
          <h3>Filas Ocultas</h3>
          <ul>
            {historial
              .filter((gasto) => hiddenRows.includes(gasto.id))
              .map((gasto) => (
                <li key={gasto.id}>
                  <span>
                    {gasto.nombre_completo} -{" "}
                    {gasto.fecha_creacion?.slice(0, 10)} - Obs. Contabilidad:{" "}
                    {gasto.observacionC || "Sin observación"}
                  </span>
                  <button
                    className="boton-mostrar-oculto-individual"
                    onClick={() => handleShowHiddenRow(gasto.id)}
                  >
                    Mostrar
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      {updateMessage && (
        <p className={`automatizacion-submitted-message ${updateMessage.type}`}>
          {updateMessage.text}
        </p>
      )}

      <div id="gastos-historial" className="gastos-historial desplegado">
        <div className="scroll-container-wrapper">
          <button className="scroll-button left" onClick={scrollLeft}>
            ‹
          </button>
          <div className="scroll-container" ref={scrollContainerRef}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Nombre</th>
                  <th>Área</th>
                  <th>Procesos</th>
                  <th>Sede</th>
                  <th>Unidad de negocio</th>
                  <th>Centro de costos</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Monto por sede</th>
                  <th>Anticipo</th>
                  <th>Tiempo/Fecha Pago</th>
                  <th>Cotización</th>
                  <th>Observación Responsable</th>
                  <th>Factura</th>
                  {!ocultarColumnasGH && <th>Proveedor</th>}
                  {!ocultarColumnasGH && <th>Número Causación</th>}
                  {!ocultarColumnasGH && <th>Voucher</th>}
                  <th>Observación</th>
                  <th>Estado</th>
                  {!ocultarColumnasGH && <th>Categoría de Gasto</th>}
                  <th>Acciones</th>
                  {!ocultarColumnasGH && <th>Verificado</th>}
                  <th>Observación Contabilidad</th>
                  <th>Hora Aprobación</th>
                  <th>Aprobado Por</th>
                  <th>Última Modificación Contabilidad</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistorial.map((gasto) => (
                  <tr key={gasto.id}>
                    <td>{gasto.fecha_creacion?.slice(0, 10)}</td>
                    <td>{gasto.nombre_completo}</td>
                    <td>{gasto.area}</td>
                    <td>{gasto.procesos}</td>
                    <td>
                      {Array.isArray(gasto.sede)
                        ? gasto.sede.join(", ")
                        : gasto.sede}
                    </td>
                    <td>
                      {Array.isArray(gasto.unidad)
                        ? gasto.unidad.join(", ")
                        : gasto.unidad}
                    </td>
                    <td>
                      {Array.isArray(gasto.centro_costos)
                        ? gasto.centro_costos.join(", ")
                        : gasto.centro_costos}
                    </td>
                    <td>{gasto.descripcion}</td>
                    <td>{formatoCOP.format(gasto.monto_estimado)}</td>
                    <td>{gasto.monto_sede}</td>
                    <td>{formatoCOP.format(gasto.anticipo)}</td>
                    <td>
                      {gasto.tiempo_fecha_pago?.slice(0, 10) ||
                        "No especificado"}
                    </td>
                    <td>
                      {gasto.archivo_cotizacion && (
                        <a
                          href={`${SUPABASE_URL}/cotizaciones/cotizaciones/${gasto.archivo_cotizacion
                            .split("/")
                            .pop()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-pdf-button"
                        >
                          Ver
                        </a>
                      )}
                    </td>
                    <td>
                      {gasto.observacion_responsable || "Sin observación"}
                    </td>
                    <td>
                      {(currentUserPermissions.role === "contabilidad" ||
                        currentUserPermissions.role === "admin") &&
                      editingId === gasto.id ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <input
                            type="file"
                            name="factura"
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                factura: e.target.files[0],
                              }))
                            }
                            className="observacion-textarea"
                          />
                          {editValues.factura &&
                            !(editValues.factura instanceof File) && (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    factura: "",
                                  }))
                                }
                                style={{
                                  backgroundColor: "#dc3545",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                  width: "fit-content",
                                }}
                              >
                                Eliminar Factura
                              </button>
                            )}
                        </div>
                      ) : (
                        (() => {
                          let facturas = [];
                          try {
                            facturas = JSON.parse(gasto.factura || "[]");
                          } catch (e) {
                            // Fallback si el JSON no es válido
                          }

                          return facturas.length > 0 && facturas[0] ? (
                            <a
                              href={facturas[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-pdf-button"
                            >
                              Ver Factura
                            </a>
                          ) : (
                            "Sin factura"
                          );
                        })()
                      )}
                    </td>
                    {!ocultarColumnasGH && (
                      <td>
                        {gasto.archivos_proveedor ? (
                          Array.isArray(
                            JSON.parse(gasto.archivos_proveedor)
                          ) ? (
                            JSON.parse(gasto.archivos_proveedor).map(
                              (url, index) => (
                                <div key={index}>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="view-pdf-button"
                                  >
                                    Ver
                                  </a>
                                </div>
                              )
                            )
                          ) : (
                            <a
                              href={gasto.archivos_proveedor}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-pdf-button"
                            >
                              Ver
                            </a>
                          )
                        ) : (
                          <span>No hay archivos de proveedor</span>
                        )}
                      </td>
                    )}
                    {!ocultarColumnasGH && (
                      <td>
                        {(currentUserPermissions.role === "contabilidad" ||
                          currentUserPermissions.role === "admin") &&
                        editingId === gasto.id ? (
                          <input
                            type="text"
                            name="numero_causacion"
                            value={editValues.numero_causacion}
                            onChange={handleEditChange}
                            placeholder="Número de Egreso"
                            className="causacion-input"
                          />
                        ) : (
                          gasto.numero_causacion || "Sin número"
                        )}
                      </td>
                    )}
                    {!ocultarColumnasGH && (
                      <td>
                        {(() => {
                          let vouchers = gasto.vouchers;
                          if (typeof vouchers === "string") {
                            try {
                              vouchers = JSON.parse(vouchers);
                            } catch (error) {
                              vouchers = [];
                            }
                          }
                          return Array.isArray(vouchers) &&
                            vouchers.length > 0 ? (
                            vouchers.map((url, index) => (
                              <div key={index} style={{ marginBottom: "4px" }}>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="view-pdf-button"
                                >
                                  Ver Voucher {index + 1}
                                </a>
                              </div>
                            ))
                          ) : (
                            <span>No hay vouchers</span>
                          );
                        })()}
                      </td>
                    )}
                    <td style={{ width: "300px" }}>
                      {(currentUserPermissions.role === "director" ||
                        currentUserPermissions.role === "admin") &&
                      editingId === gasto.id ? (
                        <textarea
                          name="observacion"
                          value={editValues.observacion}
                          onChange={handleEditChange}
                          rows={3}
                          className="observacion-textarea"
                          placeholder="Observación"
                          style={{ width: "100%" }}
                        />
                      ) : (
                        gasto.observacion || "Sin observación"
                      )}
                    </td>
                    <td className={getEstadoClass(gasto.estado)}>
                      {(currentUserPermissions.role === "director" ||
                        currentUserPermissions.role === "admin") &&
                      editingId === gasto.id ? (
                        <select
                          name="estado"
                          value={editValues.estado}
                          onChange={handleEditChange}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Necesario">Necesario</option>
                          <option value="No necesario">No necesario</option>
                        </select>
                      ) : (
                        gasto.estado
                      )}
                    </td>
                    {!ocultarColumnasGH && (
                      <td>
                        {(currentUserPermissions.role === "contabilidad" ||
                          currentUserPermissions.role === "admin") &&
                        editingId === gasto.id ? (
                          <input
                            type="text"
                            name="categoria_gasto"
                            value={editValues.categoria_gasto}
                            onChange={handleEditChange}
                            placeholder="Seleccione o escriba categoría"
                            list="expense-categories"
                            className="causacion-input"
                          />
                        ) : (
                          gasto.categoria_gasto || "Sin categoría"
                        )}
                        <datalist id="expense-categories">
                          {expenseCategories.map((category, index) => (
                            <option key={index} value={category} />
                          ))}
                        </datalist>
                      </td>
                    )}
                    <td>
                      {editingId === gasto.id ? (
                        <>
                          <button
                            className="hg-btn-guardar"
                            onClick={() => handleSaveEdit(gasto.id)}
                          >
                            Guardar
                          </button>
                          <button
                            className="hg-btn-cancelar"
                            onClick={handleCancelEdit}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="hg-btn-editar"
                            onClick={() => handleEditClick(gasto)}
                          >
                            Editar
                          </button>
                          <button
                            className="hg-btn-ocultar"
                            onClick={() => handleHideRow(gasto.id)}
                          >
                            Ocultar
                          </button>
                        </>
                      )}
                    </td>
                    {!ocultarColumnasGH && (
                      <td>
                        <input
                          type="checkbox"
                          checked={gasto.verificado || false}
                          onChange={() =>
                            handleToggleVerified(gasto.id, gasto.verificado)
                          }
                        />
                      </td>
                    )}
                    <td>
                      {(currentUserPermissions.role === "contabilidad" ||
                        currentUserPermissions.role === "admin") &&
                      editingId === gasto.id ? (
                        <textarea
                          name="observacionC"
                          value={editValues.observacionC}
                          onChange={handleEditChange}
                          rows={3}
                          className="observacion-textarea"
                          placeholder="Observación contabilidad"
                        />
                      ) : (
                        gasto.observacionC || "Sin observación"
                      )}
                    </td>
                    <td>
                      {gasto.hora_cambio_estado
                        ? new Date(gasto.hora_cambio_estado).toLocaleString(
                            "es-CO",
                            {
                              timeZone: "America/Bogota",
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            }
                          )
                        : "Sin registro"}
                    </td>
                    <td>
                      {gasto.aprobado_por_nombre ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            padding: "8px",
                            backgroundColor:
                              gasto.estado === "Necesario"
                                ? "#d4edda"
                                : gasto.estado === "No necesario"
                                ? "#f8d7da"
                                : "transparent",
                            borderRadius: "4px",
                          }}
                        >
                          <strong
                            style={{
                              fontSize: "14px",
                              color:
                                gasto.estado === "Necesario"
                                  ? "#155724"
                                  : gasto.estado === "No necesario"
                                  ? "#721c24"
                                  : "#333",
                            }}
                          >
                            {gasto.aprobado_por_nombre}
                          </strong>
                          <small
                            style={{
                              fontSize: "11px",
                              color: "#666",
                              fontStyle: "italic",
                            }}
                          >
                            {gasto.aprobado_por_correo}
                          </small>
                        </div>
                      ) : (
                        <span style={{ color: "#999", fontStyle: "italic" }}>
                          {gasto.estado === "Necesario" ||
                          gasto.estado === "No necesario"
                            ? "Aprobador no registrado"
                            : "Pendiente de aprobación"}
                        </span>
                      )}
                    </td>
                    <td>
                      {gasto.hora_ultima_modificacion_contabilidad
                        ? new Date(
                            gasto.hora_ultima_modificacion_contabilidad
                          ).toLocaleString("es-CO", {
                            timeZone: "America/Bogota",
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "Sin registro"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="scroll-button right" onClick={scrollRight}>
            ›
          </button>
        </div>
      </div>
    </div>
  );
};

export { HistorialGastos };
