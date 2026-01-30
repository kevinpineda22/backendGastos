import React, { useRef, useState } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { FaPencilAlt, FaTrashAlt, FaEye, FaTable, FaTh } from "react-icons/fa";

import "./Historial.css";

const customStyles = {
  headRow: {
    style: {
      backgroundColor: "var(--historial-gastos-primary-color)",
      color: "#fff",
      fontWeight: "600",
      verticalAlign: "middle",
    },
  },
  headCells: {
    style: {
      padding: "10px",
      verticalAlign: "middle",
      textAlign: "center",
    },
  },
  cells: {
    style: {
      padding: "7px",
      textAlign: "start",
      verticalAlign: "middle",
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "break-word",
      height: "auto",
      maxWidth: "200px",
      overflow: "auto",
      fontSize: "0.80rem",
    },
  },
};

const API_URL = "https://backend-gastos.vercel.app/api";
const SUPABASE_URL =
  "https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/cotizaciones";

const getEstadoClass = (estado) => {
  switch (estado) {
    case "Pendiente":
      return "historial-gastos-estado-pendiente";
    case "Necesario":
      return "historial-gastos-estado-aprobado";
    case "No necesario":
      return "historial-gastos-estado-rechazado";
    default:
      return "";
  }
};

const Historial = ({
  mostrarHistorial,
  historialGastos,
  isLoadingHistorial,
  openModal,
  formatoCOP,
  handleEditCotizacion,
  setEditId,
  setFormData,
  queryClient,
}) => {
  const historialRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [newCotizacion, setNewCotizacion] = useState(null);
  const [newObservacion, setNewObservacion] = useState("");
  const [newTiempoFechaPago, setNewTiempoFechaPago] = useState("");
  const [editMode, setEditMode] = useState("cotizacion");
  const [viewMode, setViewMode] = useState("cards"); // 🆕 NUEVO ESTADO PARA VISTA

  const eliminarRegistro = async (id) => {
    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: "Esta acción eliminará el registro de forma permanente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${API_URL}/requerimientos/eliminar/${id}`);
        Swal.fire("Eliminado", "El registro ha sido eliminado.", "success");
        if (queryClient) {
          queryClient.invalidateQueries(["historialGastos"]);
        }
      } catch (error) {
        console.error("Error al eliminar el registro:", error);
        Swal.fire(
          "Error",
          "Hubo un problema al eliminar el registro.",
          "error"
        );
      }
    }
  };

  const handleOpenEditModal = (id, mode = "cotizacion") => {
    console.log(`Abriendo modal de edición para ID: ${id}, modo: ${mode}`);
    setSelectedId(id);
    const selectedGasto = historialGastos.find((gasto) => gasto.id === id);
    setNewObservacion(selectedGasto?.observacion_responsable || "");
    
    // ✅ CAMBIO CRÍTICO: Manejo completamente sin Date objects
    if (selectedGasto?.tiempo_fecha_pago) {
      let fechaParaMostrar = "";
      
      // Convertir cualquier formato a YYYY-MM-DD SIN usar new Date()
      const fechaString = selectedGasto.tiempo_fecha_pago.toString();
      
      if (fechaString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Ya está en formato YYYY-MM-DD
        fechaParaMostrar = fechaString;
      } else if (fechaString.includes('T')) {
        // Formato ISO: "2025-10-25T00:00:00.000Z" -> "2025-10-25"
        fechaParaMostrar = fechaString.split('T')[0];
      } else if (fechaString.includes(' ')) {
        // Formato: "2025-10-25 00:00:00" -> "2025-10-25"
        fechaParaMostrar = fechaString.split(' ')[0];
      } else {
        // Último recurso: intentar extraer YYYY-MM-DD del string
        const match = fechaString.match(/(\d{4})-(\d{2})-(\d{2})/);
        fechaParaMostrar = match ? match[0] : "";
      }
      
      setNewTiempoFechaPago(fechaParaMostrar);
      console.log("📅 Fecha cargada en modal (sin conversión Date):", fechaParaMostrar);
      console.log("📅 Fecha original del backend:", selectedGasto.tiempo_fecha_pago);
    } else {
      setNewTiempoFechaPago("");
    }
    
    setNewCotizacion(null);
    setEditMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedId(null);
    setNewCotizacion(null);
    setNewObservacion("");
    setNewTiempoFechaPago("");
    setEditMode("cotizacion");
  };

  const handleFileChange = (e) => {
    setNewCotizacion(e.target.files[0]);
  };

  const handleObservacionChange = (e) => {
    setNewObservacion(e.target.value);
  };

  const handleTiempoFechaPagoChange = (e) => {
    setNewTiempoFechaPago(e.target.value);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const currentGasto = historialGastos.find(
      (gasto) => gasto.id === selectedId
    );

    if (editMode === "cotizacion") {
      const formData = new FormData();
      if (newCotizacion) {
        formData.append("archivo_cotizacion", newCotizacion);
      }
      
      // ✅ VERIFICAR: Que esté enviando con el nombre correcto
      if (newObservacion !== (currentGasto?.observacion_responsable || "")) {
        formData.append("observacion_responsable", newObservacion); // ✅ CORRECTO: observacion_responsable
        console.log(`📝 Enviando observacion_responsable: "${newObservacion}"`);
      }

      // Si no hay cambios, mostrar advertencia y cerrar modal
      if (formData.get("archivo_cotizacion") === null && formData.get("observacion_responsable") === null) {
        Swal.fire("Atención", "No hay cambios para guardar.", "warning");
        handleCloseModal();
        return;
      }

      // ✅ DEPURACIÓN: Ver todos los campos que se están enviando
      console.log("📋 FormData del historial:");
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      try {
        const response = await axios.put(
          `${API_URL}/requerimientos/editar-cotizacion/${selectedId}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        Swal.fire("Éxito", response.data.message, "success");
        if (queryClient) {
          queryClient.invalidateQueries(["historialGastos"]);
        }
        handleCloseModal();
      } catch (error) {
        console.error("Error al actualizar la cotización u observación:", error);
        const errorMessage =
          error.response?.data?.error || "Error al actualizar el requerimiento";
        Swal.fire("Error", errorMessage, "error");
      }
    } else if (editMode === "tiempoFechaPago") {
      // ✅ CAMBIO CRÍTICO: Comparación completamente sin Date objects
      let fechaActualNormalizada = "";
      if (currentGasto?.tiempo_fecha_pago) {
        const fechaString = currentGasto.tiempo_fecha_pago.toString();
        
        if (fechaString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          fechaActualNormalizada = fechaString;
        } else if (fechaString.includes('T')) {
          fechaActualNormalizada = fechaString.split('T')[0];
        } else if (fechaString.includes(' ')) {
          fechaActualNormalizada = fechaString.split(' ')[0];
        } else {
          const match = fechaString.match(/(\d{4})-(\d{2})-(\d{2})/);
          fechaActualNormalizada = match ? match[0] : "";
        }
      }

      console.log("📅 Comparando fechas (sin conversión Date):", {
        fechaActual: fechaActualNormalizada,
        fechaNueva: newTiempoFechaPago,
        fechaOriginalBackend: currentGasto?.tiempo_fecha_pago,
        sonIguales: fechaActualNormalizada === newTiempoFechaPago
      });

      const fechaCambio = newTiempoFechaPago !== fechaActualNormalizada;

      if (!fechaCambio) {
        Swal.fire("Atención", "No hay cambios para guardar.", "warning");
        handleCloseModal();
        return;
      }

      const correo_empleado =
        currentGasto?.correo_empleado ||
        localStorage.getItem("correo_empleado") ||
        "default@merkahorrosas.com";

      // ✅ CAMBIO CRÍTICO: Enviar directamente sin ninguna conversión
      const payload = {
        correo_empleado,
        tiempo_fecha_pago: newTiempoFechaPago // Enviar EXACTAMENTE el string YYYY-MM-DD
      };

      console.log("📤 Enviando payload para fecha (sin conversión):", payload);

      try {
        const response = await axios.put(
          `${API_URL}/requerimientos/editar-tiempo-fecha-pago/${selectedId}`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        Swal.fire("Éxito", response.data.message, "success");
        if (queryClient) {
          queryClient.invalidateQueries(["historialGastos"]);
        }
        handleCloseModal();
      } catch (error) {
        console.error("Error en la solicitud PUT:", error.response?.data || error.message);
        const errorMessage = error.response?.data?.error || "Error al actualizar la fecha de pago";
        Swal.fire("Error", errorMessage, "error");
      }
    }
  };

  const renderClickableCell = (content) => (
    <div
      onClick={(e) => {
        if (
          e.target.tagName !== "A" &&
          e.target.tagName !== "svg" &&
          e.target.tagName !== "path"
        ) {
          openModal(content);
        }
      }}
      className="historial-gastos-clickable-cell"
      title="Haz clic para ver el contenido completo"
    >
      {content}
    </div>
  );

  // 🆕 FUNCIÓN MEJORADA PARA MOSTRAR ARCHIVOS
  const renderFileLinks = (files, label) => {
    if (!files) return <span>Sin {label.toLowerCase()}</span>;

    let fileArray = [];
    try {
      if (typeof files === "string") {
        fileArray = JSON.parse(files);
      } else if (Array.isArray(files)) {
        fileArray = files;
      }
    } catch (error) {
      return <span>Error al cargar {label.toLowerCase()}</span>;
    }

    if (!Array.isArray(fileArray) || fileArray.length === 0) {
      return <span>Sin {label.toLowerCase()}</span>;
    }

    return (
      <div className="historial-gastos-file-links">
        {fileArray.map((file, index) => (
          <a
            key={index}
            href={file}
            target="_blank"
            rel="noopener noreferrer"
            className="historial-gastos-view-pdf-button"
            onClick={(e) => e.stopPropagation()}
          >
            <FaEye /> Ver {label} {index + 1}
          </a>
        ))}
      </div>
    );
  };

  // 🆕 FUNCIÓN PARA FORMATEAR ARRAYS
  const formatArray = (data) => {
    if (!data) return "No especificado";

    try {
      if (typeof data === "string") {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed.join(", ") : data;
      } else if (Array.isArray(data)) {
        return data.join(", ");
      }
      return data;
    } catch (error) {
      if (typeof data === "string" && data.includes(",")) {
        return data.split(",").map((s) => s.trim()).join(", ");
      }
      return data || "No especificado";
    }
  };

  const exportToExcel = () => {
    if (!historialGastos || historialGastos.length === 0) return;

    const dataForSheet = historialGastos.map((gasto) => ({
      fecha_creacion: gasto.fecha_creacion || "",
      Nombre: gasto.nombre_completo || "",
      Área: gasto.area || "",
      Procesos: gasto.procesos || "",
      Sede: formatArray(gasto.sede),
      "Unidad de negocio": formatArray(gasto.unidad),
      "Centro de costos": formatArray(gasto.centro_costos),
      Descripción: gasto.descripcion || "",
      Monto: gasto.monto_estimado || "",
      "Monto por sede": gasto.monto_sede || "",
      Anticipo: gasto.anticipo || "",
      Cotización: gasto.archivo_cotizacion || "",
      Proveedor: formatArray(gasto.archivos_proveedor),
      "Observación del Formulario": gasto.observacion || "", // ✅ CAMBIO: Observación del formulario
      "Observación de Edición": gasto.observacion_responsable || "", // ✅ NUEVO: Observación de ediciones
      "Observación Contabilidad": gasto.observacionC || "",
      "Tiempo/Fecha Pago": gasto.tiempo_fecha_pago || "",
      Estado: gasto.estado || "",
      "Hora Cambio Estado": gasto.hora_cambio_estado
        ? new Date(gasto.hora_cambio_estado).toLocaleString("es-CO", {
            timeZone: "America/Bogota",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "Sin registro",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");
    XLSX.writeFile(workbook, "historial_gastos.xlsx");
  };

  // 🆕 COLUMNAS PARA LA VISTA DE TABLA
  const columns = [
    {
      name: "Fecha",
      selector: (row) => row.fecha_creacion,
      cell: (row) =>
        renderClickableCell(
          row.fecha_creacion ? row.fecha_creacion.slice(0, 10) : "-"
        ),
      sortable: true,
      width: "120px",
    },
    {
      name: "Nombre",
      cell: (row) => renderClickableCell(row.nombre_completo),
      width: "150px",
    },
    {
      name: "Área",
      cell: (row) => renderClickableCell(row.area),
      width: "120px",
    },
    {
      name: "Sede",
      cell: (row) => renderClickableCell(formatArray(row.sede)),
      width: "150px",
    },
    {
      name: "Descripción",
      cell: (row) => renderClickableCell(row.descripcion),
      width: "200px",
    },
    {
      name: "Monto",
      cell: (row) =>
        renderClickableCell(formatoCOP.format(row.monto_estimado || 0)),
      width: "120px",
    },
    {
      name: "Cotización",
      cell: (row) => {
        if (row.archivo_cotizacion) {
          const nombreArchivo = row.archivo_cotizacion.split("/").pop();
          const archivoCotizacionUrl = `${SUPABASE_URL}/cotizaciones/${nombreArchivo}`;
          return (
            <div className="historial-gastos-cotizacion-cell">
              <a
                href={archivoCotizacionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="historial-gastos-view-pdf-button"
                onClick={(e) => e.stopPropagation()}
              >
                <FaEye /> Ver
              </a>
              {row.estado === "Pendiente" && (
                <FaPencilAlt
                  className="historial-gastos-edit-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(row.id, "cotizacion");
                  }}
                  title="Editar Cotización"
                />
              )}
            </div>
          );
        }
        return "Sin cotización";
      },
      width: "150px",
    },
    {
      name: "Proveedor",
      cell: (row) => renderFileLinks(row.archivos_proveedor, "Proveedor"),
      width: "150px",
    },
    {
      name: "Factura",
      cell: (row) => renderFileLinks(row.factura, "Factura"),
      width: "120px",
    },
    {
      name: "Voucher",
      cell: (row) => renderFileLinks(row.vouchers, "Voucher"),
      width: "120px",
    },
    {
      name: "Estado",
      cell: (row) => (
        <div
          className={`historial-gastos-estado-cell ${getEstadoClass(row.estado)}`}
          onClick={() => openModal(row.estado)}
          title="Haz clic para ver el contenido completo"
        >
          {row.estado}
        </div>
      ),
      width: "120px",
    },
    {
      name: "Acciones",
      cell: (row) => (
        <div className="historial-gastos-action-buttons">
          <FaPencilAlt
            className="historial-gastos-edit-icon"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditModal(row.id, "tiempoFechaPago");
            }}
            title="Editar"
          />
          <FaTrashAlt
            className="historial-gastos-delete-icon"
            onClick={(e) => {
              e.stopPropagation();
              eliminarRegistro(row.id);
            }}
            title="Eliminar"
          />
        </div>
      ),
      width: "100px",
      center: true,
    },
  ];

  console.log("📋 Historial recibió:", {
    mostrarHistorial,
    historialGastos: historialGastos?.length || 0,
    isLoadingHistorial,
    tipoHistorial: typeof historialGastos,
    primerRegistro: historialGastos?.[0], // Añadir el primer registro para debugging
  });

  if (!mostrarHistorial) return null;

  return (
    <div className="historial-gastos-container-modal">
      <div className="historial-gastos-content">
        <div className="historial-gastos-header">
          <h3 className="historial-gastos-title">Mi Historial de Gastos</h3>

          {/* 🆕 CONTROLES DE VISTA */}
          <div className="historial-gastos-view-controls">
            <div className="historial-gastos-view-toggle">
              <button
                className={`historial-gastos-toggle-btn ${
                  viewMode === "cards" ? "active" : ""
                }`}
                onClick={() => setViewMode("cards")}
                title="Vista de tarjetas"
              >
                <FaTh />
              </button>
              <button
                className={`historial-gastos-toggle-btn ${
                  viewMode === "table" ? "active" : ""
                }`}
                onClick={() => setViewMode("table")}
                title="Vista de tabla"
              >
                <FaTable />
              </button>
            </div>

            <button
              onClick={exportToExcel}
              className="historial-gastos-excel-button"
              disabled={!historialGastos || historialGastos.length === 0}
            >
              📊 Exportar Excel
            </button>
          </div>
        </div>

        {isLoadingHistorial ? (
          <div className="historial-gastos-loading-container">
            <div className="historial-gastos-loading-spinner"></div>
            <p>Cargando historial...</p>
          </div>
        ) : historialGastos && historialGastos.length > 0 ? (
          <>
            {/* 🆕 VISTA DE TABLA */}
            {viewMode === "table" && (
              <div className="historial-gastos-table-container">
                <DataTable
                  columns={columns}
                  data={historialGastos}
                  customStyles={customStyles}
                  pagination
                  paginationPerPage={10}
                  paginationRowsPerPageOptions={[10, 25, 50, 100]}
                  highlightOnHover
                  striped
                  responsive
                  noDataComponent={
                    <div className="historial-gastos-no-data">
                      No hay datos disponibles
                    </div>
                  }
                />
              </div>
            )}

            {/* 🆕 VISTA DE TARJETAS MEJORADA */}
            {viewMode === "cards" && (
              <div className="historial-gastos-list">
                {historialGastos.map((gasto) => (
                  <div key={gasto.id} className="historial-gastos-item">
                    <div className="historial-gastos-item-header">
                      <span className="historial-gastos-item-fecha">
                        {new Date(gasto.fecha_creacion).toLocaleDateString("es-CO")}
                      </span>
                      <span
                        className={`historial-gastos-item-estado ${getEstadoClass(
                          gasto.estado
                        )}`}
                      >
                        {gasto.estado}
                      </span>
                    </div>

                    <div className="historial-gastos-item-body">
                      <div className="historial-gastos-info-grid">
                        <div className="historial-gastos-item-info">
                          <strong>Nombre:</strong> {gasto.nombre_completo}
                        </div>
                        <div className="historial-gastos-item-info">
                          <strong>Área:</strong> {gasto.area}
                        </div>
                        <div className="historial-gastos-item-info">
                          <strong>Procesos:</strong> {gasto.procesos}
                        </div>
                        <div className="historial-gastos-item-info">
                          <strong>Sede:</strong> {formatArray(gasto.sede)}
                        </div>
                        <div className="historial-gastos-item-info">
                          <strong>Unidad de negocio:</strong> {formatArray(gasto.unidad)}
                        </div>
                        <div className="historial-gastos-item-info">
                          <strong>Centro de costos:</strong> {formatArray(gasto.centro_costos)}
                        </div>
                        <div className="historial-gastos-item-info historial-gastos-item-info-full">
                          <strong>Descripción:</strong> {gasto.descripcion}
                        </div>
                        <div className="historial-gastos-item-info">
                          <strong>Monto:</strong> {formatoCOP.format(gasto.monto_estimado || 0)}
                        </div>
                        <div className="historial-gastos-item-info">
                          <strong>Anticipo:</strong> {formatoCOP.format(gasto.anticipo || 0)}
                        </div>
                        <div className="historial-gastos-item-info">
                          <strong>Tiempo/Fecha Pago:</strong>
                          {gasto.tiempo_fecha_pago ? (
                            (() => {
                              const fechaString = gasto.tiempo_fecha_pago.toString();
                              let fechaMostrar = "";
                              
                              if (fechaString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                // Ya está en formato YYYY-MM-DD, convertir a DD/MM/YYYY
                                const [año, mes, dia] = fechaString.split('-');
                                fechaMostrar = `${dia}/${mes}/${año}`;
                              } else if (fechaString.includes('T')) {
                                // Formato ISO, extraer fecha y convertir
                                const fechaParte = fechaString.split('T')[0];
                                const [año, mes, dia] = fechaParte.split('-');
                                fechaMostrar = `${dia}/${mes}/${año}`;
                              } else {
                                fechaMostrar = fechaString; // Mostrar como está si no se puede parsear
                              }
                              
                              return fechaMostrar;
                            })()
                          ) : (
                            "No especificado"
                          )}
                        </div>
                      </div>

                      {/* 🆕 SECCIÓN DE ARCHIVOS */}
                      <div className="historial-gastos-files-section">
                        <h4>📎 Archivos</h4>
                        <div className="historial-gastos-files-grid">
                          <div className="historial-gastos-file-group">
                            <strong>Cotización:</strong>
                            {gasto.archivo_cotizacion ? (
                              <a
                                href={`${SUPABASE_URL}/cotizaciones/${gasto.archivo_cotizacion.split("/").pop()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="historial-gastos-view-pdf-button"
                              >
                                <FaEye /> Ver Cotización
                              </a>
                            ) : (
                              <span>Sin cotización</span>
                            )}
                          </div>

                          <div className="historial-gastos-file-group">
                            <strong>Proveedores:</strong>
                            {renderFileLinks(gasto.archivos_proveedor, "Proveedor")}
                          </div>

                          <div className="historial-gastos-file-group">
                            <strong>Facturas:</strong>
                            {renderFileLinks(gasto.factura, "Factura")}
                          </div>

                          <div className="historial-gastos-file-group">
                            <strong>Vouchers:</strong>
                            {renderFileLinks(gasto.vouchers, "Voucher")}
                          </div>
                        </div>
                      </div>

                      {/* 🆕 SECCIÓN DE OBSERVACIONES */}
                      <div className="historial-gastos-observations-section">
                        <h4>💭 Observaciones</h4>
                        <div className="historial-gastos-observations-grid">
                          <div className="historial-gastos-observation">
                            <strong>Del Formulario:</strong>
                            <span>{gasto.observacion || "Sin observaciones"}</span> {/* ✅ CAMBIO: observacion en lugar de observacion_responsable */}
                          </div>
                          <div className="historial-gastos-observation">
                            <strong>Edición (Responsable):</strong>
                            <span>{gasto.observacion_responsable || "Sin observaciones"}</span> {/* ✅ MANTENER: Este es para las ediciones */}
                          </div>
                          <div className="historial-gastos-observation">
                            <strong>Contabilidad:</strong>
                            <span>{gasto.observacionC || "Sin observaciones"}</span> {/* ✅ MANTENER: Este es para contabilidad */}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="historial-gastos-item-footer">
                      <button
                        onClick={() => handleOpenEditModal(gasto.id, "cotizacion")}
                        className="historial-gastos-edit-button"
                        disabled={gasto.estado !== "Pendiente"}
                      >
                        <FaPencilAlt /> Editar Cotización
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(gasto.id, "tiempoFechaPago")}
                        className="historial-gastos-edit-button"
                      >
                        <FaPencilAlt /> Editar Fecha Pago
                      </button>
                      <button
                        onClick={() => eliminarRegistro(gasto.id)}
                        className="historial-gastos-delete-button"
                      >
                        <FaTrashAlt /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="historial-gastos-no-historial">
            <p>No tienes solicitudes de gastos registradas.</p>
          </div>
        )}

        {/* Modal de edición */}
        {showModal && (
          <div className="historial-gastos-modal-overlay">
            <div className="historial-gastos-modal-content">
              <div className="historial-gastos-modal-header">
                <h3>
                  {editMode === "cotizacion"
                    ? "Editar Cotización y Observación"
                    : "Editar Fecha de Pago y Observación"} {/* ✅ CAMBIAR: Título más descriptivo */}
                </h3>
                <button
                  className="historial-gastos-modal-close-btn"
                  onClick={handleCloseModal}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleEdit} className="historial-gastos-modal-form">
                {editMode === "cotizacion" ? (
                  <>
                    <div className="historial-gastos-form-group">
                      <label>Nueva Cotización (Opcional):</label>
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.xls"
                        onChange={handleFileChange}
                        className="historial-gastos-modal-file-input"
                      />
                    </div>

                    <div className="historial-gastos-form-group">
                      <label>Observación:</label>
                      <textarea
                        value={newObservacion}
                        onChange={handleObservacionChange}
                        placeholder="Ingrese observación..."
                        className="historial-gastos-modal-textarea"
                        rows="4"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* ✅ SOLO: Campo de fecha de pago */}
                    <div className="historial-gastos-form-group">
                      <label>Tiempo/Fecha de Pago:</label>
                      <input
                        type="date"
                        value={newTiempoFechaPago}
                        onChange={handleTiempoFechaPagoChange}
                        className="historial-gastos-modal-input"
                      />
                    </div>

                    {/* ✅ REMOVIDO: Campo de observación del modo fecha */}
                  </>
                )}

                <div className="historial-gastos-modal-buttons">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="historial-gastos-button historial-gastos-button-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="historial-gastos-button historial-gastos-button-primary"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Historial;

