import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AprobarRechazar.css";
import { getAssetUrl } from "../../config/storage";

const useDecisionHandler = (initialToken) => {
  const [estado, setEstado] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [decisionTomada, setDecisionTomada] = useState(false);
  const [observacion, setObservacion] = useState("");

  const handleSubmit = async (decision) => {
    setLoading(true);
    const endpoint = "https://backend-gastos.vercel.app/api/requerimientos/decidirRequerimiento";

    try {
      // "Necesario" -> "aprobado", "No Necesario" -> "rechazado"
      // CAMBIO: Se ajusta a "Necesario" y "No necesario" para coincidir con la base de datos y HistorialGastos
      const decisionBackend = decision === "Aprobar" ? "Necesario" : "No necesario";
      
      // Intentar identificar al usuario si tiene sesión abierta
      const correoSesion = sessionStorage.getItem("correo_empleado") || localStorage.getItem("correo_empleado");

      const requestBody = {
        token: initialToken,
        decision: decisionBackend,
        observacion,
        hora_cambio_estado: new Date().toISOString(),
        aprobador_correo: correoSesion || null, // Enviamos el correo si existe
      };

      const response = await axios.post(endpoint, requestBody);
      setMensaje(response.data.message);
      setDecisionTomada(true);
      setEstado(decisionBackend);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Error al enviar la decisión. Por favor, inténtalo de nuevo.";
      console.error("Error details:", error.response?.data);
      setMensaje(errorMsg);
      setEstado("error");
    } finally {
      setLoading(false);
    }
  };

  return {
    estado,
    setEstado,
    mensaje,
    setMensaje,
    loading,
    decisionTomada,
    observacion,
    setObservacion,
    handleSubmit,
  };
};

const DecisionButton = ({ label, onClick, disabled, type }) => (
  <button
    type="button"
    className={`ap-decision-btn ap-btn-${type}`}
    onClick={onClick}
    disabled={disabled}
  >
    {label}
  </button>
);

const DetailRow = ({ label, value, isLink, isCurrency }) => (
  <div className="ap-detail-row">
    <span className="ap-detail-label">{label}</span>
    {isLink ? (
       <div className="ap-links-container">{value}</div>
    ) : (
       <span className={`ap-detail-value ${isCurrency ? "ap-currency" : ""}`}>{value || "N/A"}</span>
    )}
  </div>
);

const AprobarRechazar = () => {
  const [token, setToken] = useState("");
  const [requerimiento, setRequerimiento] = useState(null);

  const {
    estado,
    setEstado,
    mensaje,
    setMensaje,
    loading,
    decisionTomada,
    observacion,
    setObservacion,
    handleSubmit,
  } = useDecisionHandler(token);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");

    if (!tokenFromUrl) {
      setMensaje("Falta el token en la URL. Asegúrate de usar el enlace completo.");
      setEstado("error");
    } else {
      setToken(tokenFromUrl);
    }
  }, []);

  useEffect(() => {
    if (token) {
      const fetchDetalles = async () => {
        try {
          const response = await axios.get(`https://backend-gastos.vercel.app/api/requerimientos/obtenerPorToken/${token}`);
          setRequerimiento(response.data);
        } catch (error) {
          console.error("Error obteniendo detalles:", error);
          setMensaje("No se pudo cargar la información del requerimiento. Intente recargar la página.");
          setEstado("error");
        }
      };
      fetchDetalles();
    }
  }, [token]);

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "$ 0";
    if (isNaN(amount) && typeof amount === 'string') return amount;
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString("es-CO", options);
  };

  return (
    <div className="ap-container">
      <div className="ap-card-container">
        <div className="ap-header-section">
            <div className="ap-logo-wrapper">
                <a href="/">
                    <img src={getAssetUrl("logoMK.webp")} alt="Logo Merkahorro" className="ap-logo" />
                </a>
            </div>
            <h1 className="ap-title">Revisión de Gasto</h1>
            <p className="ap-subtitle">Por favor revise los detalles antes de tomar una decisión.</p>
            
            {/* Botón para ir al Historial */}
            <a href="/historialgastos" className="ap-history-link">
                <span className="ap-icon">📊</span> Ver todo el Historial de Gastos
            </a>
        </div>
        
        {requerimiento && (
            <div className="ap-content-section">
                
                {/* Section: Información Principal */}
                <div className="ap-section">
                    <h3 className="ap-section-title">Información del Solicitante</h3>
                    <div className="ap-grid-2">
                        <DetailRow label="Solicitante" value={requerimiento.nombre_completo} />
                        <DetailRow label="Correo Electrónico" value={requerimiento.correo_empleado} />
                        <DetailRow label="Área" value={requerimiento.area} />
                        <DetailRow label="Proceso" value={requerimiento.procesos} />
                    </div>
                </div>

                {/* Section: Fechas */}
                <div className="ap-section">
                    <h3 className="ap-section-title">Cronograma</h3>
                    <div className="ap-grid-2">
                        <DetailRow label="Fecha de Solicitud" value={formatDate(requerimiento.fecha_creacion)} />
                        <DetailRow label="Fecha Estimada de Pago" value={requerimiento.tiempo_fecha_pago} />
                    </div>
                </div>

                {/* Section: Ubicación */}
                <div className="ap-section">
                    <h3 className="ap-section-title">Ubicación y Sede</h3>
                    <div className="ap-grid-3">
                        <DetailRow label="Sedes Asignadas" value={Array.isArray(requerimiento.sede) ? requerimiento.sede.join(", ") : requerimiento.sede} />
                        <DetailRow label="Unidad de Negocio" value={Array.isArray(requerimiento.unidad) ? requerimiento.unidad.join(", ") : requerimiento.unidad} />
                        <DetailRow label="Centro de Costos" value={Array.isArray(requerimiento.centro_costos) ? requerimiento.centro_costos.join(", ") : requerimiento.centro_costos} />
                    </div>
                </div>

                {/* Section: Costos - Highlighted */}
                <div className="ap-section ap-highlight-section">
                    <h3 className="ap-section-title">Resumen Financiero</h3>
                    <div className="ap-grid-3">
                        <DetailRow label="Monto Estimado Total" value={formatCurrency(requerimiento.monto_estimado)} isCurrency={true} />
                        <DetailRow label="Monto por Sede" value={formatCurrency(requerimiento.monto_sede)} />
                        <DetailRow label="Anticipo Requerido" value={formatCurrency(requerimiento.anticipo)} />
                    </div>
                </div>

                {/* Section: Descripción */}
                <div className="ap-section">
                    <h3 className="ap-section-title">Detalle del Requerimiento</h3>
                    <div className="ap-description-box">
                        <p>{requerimiento.descripcion}</p>
                    </div>
                    {requerimiento.observacion && (
                        <div className="ap-observation-box">
                            <span className="ap-observation-label">Observación Responsable:</span>
                            <p>{requerimiento.observacion}</p>
                        </div>
                    )}
                </div>

                 {/* Section: Archivos */}
                 <div className="ap-section">
                    <h3 className="ap-section-title">Documentos Adjuntos</h3>
                    <div className="ap-files-container">
                         {requerimiento.archivo_cotizacion && (
                            <a href={requerimiento.archivo_cotizacion} target="_blank" rel="noopener noreferrer" className="ap-file-link ap-main-file">
                                <span className="ap-icon">📄</span> Ver Cotización Principal
                            </a>
                        )}
                        {requerimiento.archivos_proveedor && Array.isArray(requerimiento.archivos_proveedor) && requerimiento.archivos_proveedor.length > 0 ? (
                             requerimiento.archivos_proveedor.map((url, index) => (
                                <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="ap-file-link ap-provider-file">
                                    <span className="ap-icon">📎</span> Archivo Proveedor {index + 1}
                                </a>
                            ))
                        ) : null}
                         {!requerimiento.archivo_cotizacion && (!requerimiento.archivos_proveedor || requerimiento.archivos_proveedor.length === 0) && (
                            <span className="ap-no-files">No hay documentos adjuntos.</span>
                        )}
                    </div>
                </div>
            </div>
        )}

        <div className="ap-footer-section">
            {!decisionTomada ? (
                <>
                    {requerimiento && (
                        <div className="ap-form-group">
                            <label htmlFor="observacion" className="ap-input-label">
                                Observación de la Decisión (Opcional):
                            </label>
                            <textarea
                                id="observacion"
                                name="observacion"
                                value={observacion}
                                onChange={(e) => setObservacion(e.target.value)}
                                className="ap-textarea"
                                placeholder="Escribe aquí las razones de si es necesario o no..."
                                disabled={loading}
                            />
                        </div>
                    )}
                    
                    <div className="ap-actions">
                        <DecisionButton
                            label="ES NECESARIO"
                            onClick={() => handleSubmit("Aprobar")}
                            disabled={loading || !token || !requerimiento}
                            type="approve"
                        />
                        <DecisionButton
                            label="NO ES NECESARIO"
                            onClick={() => handleSubmit("Rechazar")}
                            disabled={loading || !token || !requerimiento}
                            type="reject"
                        />
                    </div>
                </>
            ) : (
                <div className={`ap-result-message ap-message-${estado === 'Necesario' ? 'aprobado' : 'rechazado'}`}>
                    <div className="ap-message-icon">
                        {estado === 'Necesario' ? '✅' : '❌'}
                    </div>
                    <p className="ap-message-text">{mensaje}</p>
                    <span className="ap-message-time">
                        Registrado el: {new Date().toLocaleString("es-CO", {
                            timeZone: "America/Bogota",
                            year: "numeric", month: "2-digit", day: "2-digit",
                            hour: "2-digit", minute: "2-digit", second: "2-digit",
                        })}
                    </span>
                </div>
            )}
             {loading && <div className="ap-loader"><div className="ap-spinner"></div></div>}
        </div>
      </div>
    </div>
  );
};

export { AprobarRechazar };