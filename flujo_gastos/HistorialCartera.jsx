import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import './HistorialCartera.css';
import * as XLSX from "xlsx";
import Fuse from "fuse.js";
import { useDropzone } from 'react-dropzone';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ReactWebcam from 'react-webcam';
import { FaSearchPlus } from "react-icons/fa"; // Importamos el nuevo ícono
import { FiltroCartera } from "./FiltroCartera";

const HistorialCartera = () => {
  const currentUserEmail = sessionStorage.getItem("correo_empleado");

  const [historial, setHistorial] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false); // Nuevo estado para el buscador
  const [filteredHistorial, setFilteredHistorial] = useState([]);
  const [pendingNotifications, setPendingNotifications] = useState(new Set());
  const [sentVouchers, setSentVouchers] = useState(new Set());
  const [showWebcam, setShowWebcam] = useState(false);
  const [selectedIdForWebcam, setSelectedIdForWebcam] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState("environment");
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedVouchers, setSelectedVouchers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const API_URL = "https://backend-gastos.vercel.app/api/requerimientos/obtenerRequerimientos";
  const UPDATE_URL = "https://backend-gastos.vercel.app/api/requerimientos";
  const SUPABASE_URL = "https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/cotizaciones";

  const scrollContainerRef = useRef(null);
  const webcamRef = useRef(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -500, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) { 
      scrollContainerRef.current.scrollBy({ left: 500, behavior: 'smooth' });
    }
  };

  // ✅ NUEVA FUNCIÓN: Manejar datos filtrados
  const handleDataFiltered = (dataFiltrada) => {
    console.log("📊 Datos filtrados recibidos en cartera:", dataFiltrada.length);
    setHistorial(dataFiltrada);
    setFilteredHistorial(dataFiltrada);
  };

  const mapaAreaLideres = {
    "gestionhumana@merkahorrosas.com": "Gestión humana",
    "administracion@merkahorrosas.com": "Administración",
    "operaciones@merkahorrosas.com": "Operaciones",
    "carteraytesoreria@merkahorrosas.com": "Cartera",
    "contabilidad1@merkahorrosas.com": "Contabilidad",
  };

  useEffect(() => {
    const obtenerHistorial = async () => {
      try {
        const response = await axios.get(API_URL);
        if (response.status === 200) {
          const data = response.data.data || [];
          const updatedData = data.map(item => ({
            ...item,
            estado_cartera: item.estado_cartera || "Pendiente"
          }));
          setHistorial(updatedData);
          setFilteredHistorial(updatedData);
        } else {
          setErrorMessage("No se pudo cargar el historial de cartera.");
        }
      } catch (error) {
        console.error("Error al obtener el historial:", error);
        setErrorMessage("No se pudo cargar el historial de cartera.");
      }
    };
    obtenerHistorial();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredHistorial(historial);
      return;
    }
    // Convertimos monto_estimado a string para búsqueda
    const historialConMontoString = historial.map(item => ({
      ...item,
      monto_estimado_str: item.monto_estimado != null ? String(item.monto_estimado) : ""
    }));
    const fuse = new Fuse(historialConMontoString, {
      keys: [
        'fecha_creacion',
        'nombre_completo',
        'descripcion',
        'area',
        'sede',
        'unidad',
        'centro_costos',
        'estado',
        'estado_cartera',
        'monto_estimado_str' // Agregamos el campo string para monto
      ],
      threshold: 0.3,
      includeScore: true,
    });
    const results = fuse.search(searchQuery);
    setFilteredHistorial(results.map(result => result.item));
  }, [searchQuery, historial]);

  const exportToExcel = () => { 
    const worksheet = XLSX.utils.json_to_sheet(historial);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");
    XLSX.writeFile(workbook, "historial_cartera.xlsx");
  };

  // Formateador de moneda sin decimales
  const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  const onDropVoucher = useCallback((acceptedFiles, id) => {
    const gastoActual = historial.find(item => item.id === id);
    const cantidadActual = gastoActual?.vouchers?.length || 0;
  
    if (cantidadActual >= 10) {
      toast.warning("Solo puedes adjuntar hasta 20 vouchers.");
      return;
    }
  
    const disponibles = 20 - cantidadActual;
    const filesToUpload = acceptedFiles.slice(0, disponibles);
  
    const formData = new FormData();
    filesToUpload.forEach(file => formData.append('vouchers', file));
    formData.append('id', id);
    formData.append('correo_empleado', currentUserEmail);
  
    axios.post(`${UPDATE_URL}/adjuntarVouchers`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
      .then(response => {
        if (response.status === 200) {
          const nuevosVouchers = response.data.archivos_comprobantes;
          setHistorial(prev =>
            prev.map(item =>
              item.id === id
                ? { ...item, vouchers: [...(item.vouchers || []), ...nuevosVouchers] }
                : item
            )
          );
          setPendingNotifications(prev => new Set(prev).add(id));
          const gasto = historial.find(item => item.id === id);
          toast.info(<VoucherNotification id={id} nombreCompleto={gasto?.nombre_completo} correo_empleado={gasto?.correo_empleado} />, {
            position: "bottom-right",
            autoClose: false,
            closeOnClick: false,
            draggable: true,
            toastId: `voucher-${id}`
          });
        }
      })
      .catch(error => {
        console.error("Error al subir los vouchers:", error);
        toast.error("Error al subir los vouchers.");
      });
  }, [UPDATE_URL, currentUserEmail, historial]);  

  const FileDropzone = ({ id }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: acceptedFiles => onDropVoucher(acceptedFiles, id),
      multiple: true,
      accept: { 'image/*': [], 'application/pdf': [] }
    });
    return (
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} capture="environment" />
        {isDragActive ? <p>Suelta aquí</p> : <p>Adjuntar</p>}
      </div>
    );
  };

  const VoucherNotification = ({ id, nombreCompleto, correo_empleado }) => {
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    return (
      <div>
        Voucher asignado para {nombreCompleto}.<br />
        <button
          className="toast-send-button"
          onClick={() => {
            setIsButtonDisabled(true);
            handleSendVoucher(id, correo_empleado);
          }}
          disabled={isButtonDisabled || sentVouchers.has(id)}
        >
          Enviar notificación
        </button>
      </div>
    );
  };

  const handleSendVoucher = async (id, correo_empleado) => {
    if (sentVouchers.has(id)) return;
    try {
      setSentVouchers(prev => new Set(prev).add(id));
      const response = await axios.post(`${UPDATE_URL}/enviarVouchers`, { id, correo_empleado });
      if (response.status === 200) {
        setPendingNotifications(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        toast.success("Vouchers enviados al correo del solicitante.");
        toast.dismiss(`voucher-${id}`);
      }
    } catch (error) {
      console.error("Error al enviar los vouchers:", error);
      toast.error("Error al enviar los vouchers.");
      setSentVouchers(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleDeleteVoucherFile = async (id, voucherURL) => {
    try {
      const response = await axios.post(`${UPDATE_URL}/eliminarVoucher`, { id, voucherURL });
      if (response.status === 200) {
        const nuevosVouchers = response.data.nuevosVouchers;
        setHistorial(prev =>
          prev.map(item =>
            item.id === id ? { ...item, vouchers: nuevosVouchers } : item
          )
        );
        setSelectedVouchers(nuevosVouchers);
        toast.success("Voucher eliminado correctamente.");
      }
    } catch (error) {
      console.error("Error al eliminar voucher:", error);
      toast.error("Error al eliminar el voucher.");
    }
  };

  const handleUseWebcam = (id) => {
    setSelectedIdForWebcam(id);
    setShowWebcam(true);
  };

  const handleCaptureWebcam = async () => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      if (screenshot && selectedIdForWebcam) {
        const res = await fetch(screenshot);
        const blob = await res.blob();
        const file = new File([blob], "captura.jpg", { type: blob.type });
        onDropVoucher([file], selectedIdForWebcam);
        setShowWebcam(false);
        setSelectedIdForWebcam(null);
      }
    }
  };

  const handleCancelWebcam = () => {
    setShowWebcam(false);
    setSelectedIdForWebcam(null);
  };

  const getEstadoClass = (estado) => {
    switch (estado) {
      case "Pendiente": return "estado-pendiente";
      case "Necesario": return "estado-aprobado";
      case "No necesario": return "estado-rechazado";
      default: return "";
    }
  };

  const getEstadoCarteraClass = (estadoCartera) => {
    switch (estadoCartera) {
      case "Pendiente": return "estado-cartera-pendiente";
      case "Anticipo": return "estado-cartera-anticipo";
      case "Cancelado": return "estado-cartera-cancelado";
      default: return "";
    }
  };

  const handleEstadoCarteraChange = async (id, newEstadoCartera) => {
    try {
      const response = await axios.put(`${UPDATE_URL}/actualizarEstadoCartera`, {
        id,
        estado_cartera: newEstadoCartera
      });
      if (response.status === 200) {
        setHistorial(prev =>
          prev.map(item =>
            item.id === id ? { ...item, estado_cartera: newEstadoCartera } : item
          )
        );
        toast.success("Estado de cartera actualizado correctamente.");
      }
    } catch (error) {
      console.error("Error al actualizar estado de cartera:", error);
      toast.error("Error al actualizar el estado de cartera.");
    }
  };

  const openVoucherModal = (vouchers, id) => {
    setSelectedVouchers(vouchers || []);
    setSelectedId(id);
    setShowVoucherModal(true);
  };

  const closeVoucherModal = () => {
    setShowVoucherModal(false);
    setSelectedVouchers([]);
    setSelectedId(null);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) setSearchQuery("");
  };

  const VoucherSection = ({ vouchers, id }) => {
    return (
      <div className="voucher-section">
        <button 
          className="view-vouchers-button" 
          onClick={() => openVoucherModal(vouchers, id)}
        >
          Ver vouchers ({vouchers?.length || 0})
        </button>
        <div className="voucher-actions">
          <FileDropzone id={id} />
          <button 
            className="webcam-button" 
            onClick={() => handleUseWebcam(id)}
          >
            📷
          </button>
        </div>
      </div>
    );
  };

  const VoucherModal = ({ vouchers, id, onClose }) => {
    return (
      <div className="voucher-modal">
        <div className="voucher-modal-content">
          <h3>Vouchers Adjuntados</h3>
          <div className="vouchers-list">
            {vouchers.length > 0 ? (
              vouchers.map((url, idx) => (
                <div key={idx} className="voucher-item">
                  <a 
                    href={`${SUPABASE_URL}/comprobante/${url.split("/").pop()}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="view-pdf-button"
                  >
                    Voucher {idx + 1}
                  </a>
                  <button 
                    className="delete-voucher-button"
                    onClick={() => handleDeleteVoucherFile(id, url)}
                  >
                    Eliminar
                  </button>
                </div>
              ))
            ) : (
              <p>No hay vouchers adjuntados.</p>
            )}
          </div>
          <button className="close-modal-button" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    );
  };

  if (errorMessage) return <div className="cartera-historial"><p className="cartera-error-message">Error: {errorMessage}</p></div>;

  return (
    <div className="cartera-historial">
      <h2>Historial de Cartera</h2>

      {/* ✅ NUEVO: Componente de filtros */}
      <FiltroCartera 
        onDataFiltered={handleDataFiltered}
        correoUsuario={currentUserEmail}
        mapaAreaLideres={mapaAreaLideres}
      />

      <div className="busqueda-export-container">
        <div className="search-container">
          <button className="search-toggle" onClick={toggleSearch}>
            <FaSearchPlus />
          </button>
          <input
            type="text"
            placeholder="Buscar en todos los campos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`search-input ${isSearchOpen ? "visible" : ""}`}
            onBlur={() => !searchQuery && setIsSearchOpen(false)}
          />
        </div>
        <button className="excel-button-cartera" onClick={exportToExcel}>Exportar a Excel</button>
      </div>
      <div id="cartera-historial" className="cartera-historial-table desplegado">
        <div className="scroll-container-wrapper">
          <button className="scroll-button left" onClick={scrollLeft}>‹</button>
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
                  <th>Factura</th>
                  <th>Proveedor</th>
                  <th>Egreso</th>
                  <th>Categoría</th>
                  <th>Voucher</th>
                  <th>Estado Cartera</th>
                  <th>Observación</th>
                  <th>Estado</th>
                  <th>Observación Contabilidad</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistorial.map(gasto => (
                  <tr key={gasto.id}>
                    <td>{gasto.fecha_creacion?.slice(0, 10)}</td>
                    <td>{gasto.nombre_completo}</td>
                    <td>{gasto.area}</td>
                    <td>{gasto.procesos}</td>
                    <td>{Array.isArray(gasto.sede) ? gasto.sede.join(", ") : gasto.sede}</td>
                    <td>{Array.isArray(gasto.unidad) ? gasto.unidad.join(", ") : gasto.unidad}</td>
                    <td>{Array.isArray(gasto.centro_costos) ? gasto.centro_costos.join(", ") : gasto.centro_costos}</td>
                    <td>{gasto.descripcion}</td>
                    <td>{formatoCOP.format(gasto.monto_estimado)}</td>
                    <td>{gasto.monto_sede}</td>
                    <td>{formatoCOP.format(gasto.anticipo)}</td>
                    <td>{gasto.tiempo_fecha_pago?.slice(0, 10) || "No especificado"}</td>
                    <td>{gasto.archivo_cotizacion && <a href={`${SUPABASE_URL}/cotizaciones/${gasto.archivo_cotizacion.split("/").pop()}`} target="_blank" rel="noopener noreferrer" className="view-pdf-button">Ver</a>}</td>
                    <td>{(() => {
                      try {
                        const facturas = JSON.parse(gasto.factura || "[]");
                        return facturas.length > 0 && facturas[0] ? (
                          <a href={facturas[0]} target="_blank" rel="noopener noreferrer" className="view-pdf-button">Ver Factura</a>
                        ) : "Sin factura";
                      } catch (error) {
                        console.error("Error parsing factura:", error);
                        return "Sin factura";
                      }
                    })()}</td>
                    <td>{gasto.archivos_proveedor ? JSON.parse(gasto.archivos_proveedor).map((url, i) => <div key={i}><a href={url} target="_blank" rel="noopener noreferrer" className="view-pdf-button">Ver</a></div>) : <span>No hay archivos de proveedor</span>}</td>
                    <td>{gasto.numero_causacion || "Sin número"}</td>
                    <td>{gasto.categoria_gasto || "Sin categoría"}</td>
                    <td>
                      <VoucherSection vouchers={gasto.vouchers} id={gasto.id} />
                    </td>
                    <td className={getEstadoCarteraClass(gasto.estado_cartera)}>
                      <select
                        value={gasto.estado_cartera}
                        onChange={(e) => handleEstadoCarteraChange(gasto.id, e.target.value)}
                        className="estado-cartera-select"
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Anticipo">Anticipo</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td>{gasto.observacion || "Sin observación"}</td>
                    <td className={getEstadoClass(gasto.estado)}>{gasto.estado}</td>
                    <td>{gasto.observacionC || "Sin observación"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="scroll-button right" onClick={scrollRight}>›</button>
        </div>
      </div>

      {showWebcam && (
        <div className="webcam-modal">
          <div className="camera-selector">
            <label htmlFor="cameraMode">Seleccionar cámara:</label>
            <select id="cameraMode" value={cameraFacingMode} onChange={(e) => setCameraFacingMode(e.target.value)} style={{ margin: '10px 0', padding: '5px' }}>
              <option value="user">Frontal</option>
              <option value="environment">Trasera</option>
            </select>
          </div>
          <ReactWebcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: cameraFacingMode }} style={{ width: "100%", maxWidth: "480px" }} />
          <div className="webcam-controls">
            <button onClick={handleCaptureWebcam}>Capturar foto</button>
            <button onClick={handleCancelWebcam}>Cancelar</button>
          </div>
        </div>
      )}

      {showVoucherModal && (
        <VoucherModal 
          vouchers={selectedVouchers} 
          id={selectedId} 
          onClose={closeVoucherModal} 
        />
      )}

      <ToastContainer />
    </div>
  );
};

export { HistorialCartera };