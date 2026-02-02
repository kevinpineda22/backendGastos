import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AprobarRechazar.css";
import { getAssetUrl } from "../config/storage";

const useDecisionHandler = (initialToken, initialCodigo, tipo) => {
  const [estado, setEstado] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [decisionTomada, setDecisionTomada] = useState(false);
  const [observacion, setObservacion] = useState("");

  const handleSubmit = async (decision) => {
    setLoading(true);
    let endpoint = "";
    if (tipo === "personal") {
      endpoint = "https://backend-mk.vercel.app/api/procesar-aprobacion";
    } else if (tipo === "gastos") {
      endpoint = "https://backend-gastos.vercel.app/api/requerimientos/decidirRequerimiento";
    } else if (tipo === "desarrollo") {
      endpoint = "https://backend-solicidtud-desarrollo.vercel.app/api/solicitudes/decision";
    } else {
      setMensaje("Tipo de solicitud no válido.");
      setEstado("error");
      setLoading(false);
      return;
    }

    try {
      const requestBody = {
        token: initialToken,
        codigo: initialCodigo,
        decision: tipo === "desarrollo" ? (decision === "Aprobar" ? "Aprobada" : "Rechazada") : (decision === "Aprobar" ? "aprobado" : "rechazado"),
        observacion,
        hora_cambio_estado: new Date().toISOString(),
      };

      const response = await axios.post(endpoint, requestBody);
      setMensaje(response.data.message);
      setDecisionTomada(true);
      setEstado(requestBody.decision);
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
    className={`ar-decision-btn ar-btn-${type}`}
    onClick={onClick}
    disabled={disabled}
  >
    {label}
  </button>
);

const AprobarRechazar = () => {
  const [token, setToken] = useState("");
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState("");
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
  } = useDecisionHandler(token, codigo, tipo);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    const codigoFromUrl = urlParams.get("code");
    const tipoFromUrl = urlParams.get("tipo") || "desarrollo";

    if (!tokenFromUrl && !codigoFromUrl && tipoFromUrl !== 'gastos') {
       if (!tokenFromUrl) {
        setMensaje("Faltan parámetros en la URL. Asegúrate de usar el enlace completo.");
        setEstado("error");
       }
    }
    setToken(tokenFromUrl);
    setCodigo(codigoFromUrl);
    setTipo(tipoFromUrl);
  }, []);

  useEffect(() => {
    if (tipo === "gastos" && token) {
      const fetchDetalles = async () => {
        try {
          const response = await axios.get(`https://backend-gastos.vercel.app/api/requerimientos/obtenerPorToken/${token}`);
          setRequerimiento(response.data);
        } catch (error) {
          console.error("Error obteniendo detalles:", error);
        }
      };
      fetchDetalles();
    }
  }, [tipo, token]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(amount);
  };

  return (
    <div className="ar-container">
      <div className="ar-logo-container">
        <a href="/">
          <img src={getAssetUrl("logoMK.webp")} alt="Logo Merkahorro" />
        </a>
      </div>
      <h1 className="ar-header">
        {tipo === "personal"
          ? "Decidir Solicitud de Personal"
          : tipo === "gastos"
          ? "Revisión de Requerimiento de Gasto"
          : "Decidir Solicitud de Desarrollo"}
      </h1>

      {requerimiento && tipo === "gastos" && (
        <div className="ar-details-card" style={{
            background: "#fff",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "20px",
            textAlign: "left",
            maxWidth: "600px",
            marginLeft: "auto",
            marginRight: "auto",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
        }}>
            <h2 style={{marginTop: 0, color: "#210d65", fontSize: "1.2rem"}}>Detalles de la Solicitud</h2>
            <div className="ar-details-grid">
                <p><strong>Solicitante:</strong> {requerimiento.nombre_completo}</p>
                <p><strong>Área:</strong> {requerimiento.area}</p>
                <p><strong>Descripción:</strong> {requerimiento.descripcion}</p>
                <p><strong>Monto Estimado:</strong> {formatCurrency(requerimiento.monto_estimado)}</p>
                <p><strong>Monto Sede:</strong> {formatCurrency(requerimiento.monto_sede)}</p>
                <p><strong>Sedes:</strong> {Array.isArray(requerimiento.sede) ? requerimiento.sede.join(", ") : requerimiento.sede}</p>
                <p><strong>Unidad:</strong> {Array.isArray(requerimiento.unidad) ? requerimiento.unidad.join(", ") : requerimiento.unidad}</p>
                <p><strong>Centro de Costos:</strong> {Array.isArray(requerimiento.centro_costos) ? requerimiento.centro_costos.join(", ") : requerimiento.centro_costos}</p>

                 {requerimiento.archivo_cotizacion && (
                    <p><strong>Cotización:</strong> <a href={requerimiento.archivo_cotizacion} target="_blank" rel="noopener noreferrer" style={{color: "#210d65", textDecoration: "underline"}}>Ver Archivo</a></p>
                )}
            </div>
        </div>
      )}

      <div className="ar-form" aria-disabled={loading || decisionTomada}>
        {!decisionTomada ? (
          <>
            <div className="ar-form-group">
              <label htmlFor="observacion" className="ar-form-label">
                Observación (Opcional):
              </label>
              <textarea
                id="observacion"
                name="observacion"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="ar-observacion-input"
                placeholder="Escribe aquí cualquier comentario sobre tu decisión..."
                disabled={loading}
              />
            </div>
            <div className="ar-form-group">
              <div className="ar-decision-buttons">
                <DecisionButton
                  label={tipo === "gastos" ? "Es Necesario" : "Aprobar"}
                  onClick={() => handleSubmit("Aprobar")}
                  disabled={loading || !token || (tipo !== 'gastos' && !codigo)}
                  type="approve"
                />
                <DecisionButton
                  label={tipo === "gastos" ? "No es Necesario" : "Rechazar"}
                  onClick={() => handleSubmit("Rechazar")}
                  disabled={loading || !token || (tipo !== 'gastos' && !codigo)}
                  type="reject"
                />
              </div>
            </div>
          </>
        ) : (
          <p className={`ar-mensaje ar-mensaje-${estado}`}>
            {mensaje}
            <br />
            Hora de decisión:{" "}
            {new Date().toLocaleString("es-CO", {
              timeZone: "America/Bogota",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        )}
        {loading && <div className="ar-loading-spinner"></div>}
      </div>
    </div>
  );
};

export { AprobarRechazar };