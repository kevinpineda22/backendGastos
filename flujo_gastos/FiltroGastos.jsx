import React, { useState, useEffect } from "react";
import axios from "axios";
import "./FiltroGastos.css";

// Función para obtener el rango del último mes hasta mañana
const getLastMonthRange = () => {
  const hoy = new Date();

  // 📅 Desde hace un mes hasta mañana
  const hace1Mes = new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate());
  const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

  // Formato YYYY-MM-DD
  const format = (date) => date.toISOString().split('T')[0];

  return {
    startDate: format(hace1Mes),
    endDate: format(manana),
  };
};

const FiltroGastos = ({ onDataFiltered, correoUsuario, mapaAreaLideres }) => {
  const [filtros, setFiltros] = useState(() => {
    const lastMonth = getLastMonthRange();
    return {
      fechaInicio: lastMonth.startDate,
      fechaFin: lastMonth.endDate,
      estado: "",
      sede: "",
      busqueda: ""
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalRegistros, setTotalRegistros] = useState(0);

  const API_URL = "https://backend-gastos.vercel.app/api/requerimientos/historial";

  useEffect(() => {
    aplicarFiltros(filtros);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const aplicarFiltros = async (currentFiltros = filtros) => {
    if (!currentFiltros.fechaInicio || !currentFiltros.fechaFin) {
      setError("Por favor selecciona un rango de fechas válido.");
      return;
    }

    if (new Date(currentFiltros.fechaInicio) > new Date(currentFiltros.fechaFin)) {
      setError("La fecha de inicio no puede ser mayor que la fecha de fin.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // SOLO enviamos fechas al backend. El correo y otros filtros son en el frontend.
      const params = new URLSearchParams({
        fechaInicio: currentFiltros.fechaInicio,
        fechaFin: currentFiltros.fechaFin,
      });

      const url = `${API_URL}?${params.toString()}`;
      const response = await axios.get(url);

      let data = response.data.data || response.data || [];

      // **FILTROS LADO DEL CLIENTE (FRONTEND)**

      // 1. Filtrar por área del líder si corresponde 
      const areaLider = mapaAreaLideres[correoUsuario];
      if (areaLider) {
        data = data.filter((gasto) => gasto.area === areaLider);
      }

      // 2. Aplicar filtros adicionales 
      if (currentFiltros.estado) {
        data = data.filter((gasto) => gasto.estado === currentFiltros.estado);
      }

      if (currentFiltros.sede) {
        data = data.filter((gasto) => {
          const sedes = Array.isArray(gasto.sede)
            ? gasto.sede
            : (typeof gasto.sede === 'string' && gasto.sede.startsWith('{') ? JSON.parse(gasto.sede.replace(/{|}/g, '')) : [gasto.sede]);
          return sedes.includes(currentFiltros.sede);
        });
      }

      if (currentFiltros.busqueda) {
        const busqueda = currentFiltros.busqueda.toLowerCase();
        data = data.filter((gasto) =>
          gasto.nombre_completo?.toLowerCase().includes(busqueda) ||
          gasto.descripcion?.toLowerCase().includes(busqueda) ||
          gasto.area?.toLowerCase().includes(busqueda) ||
          gasto.procesos?.toLowerCase().includes(busqueda)
        );
      }

      setTotalRegistros(data.length);
      onDataFiltered(data);

      if (data.length === 0) {
        setError(`No se encontraron gastos entre ${currentFiltros.fechaInicio} y ${currentFiltros.fechaFin}. Intenta con un rango más amplio.`);
      }

    } catch (error) {
      console.error("❌ Error al aplicar filtros:", error);
      setError("Error al obtener los datos. Verifica la conexión del backend.");
      onDataFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyClick = () => {
    aplicarFiltros();
  };

  const handleFilterReset = (resetType) => {
    let newFiltros;
    let newRange = getLastMonthRange();

    if (resetType === 'ULTIMO_MES') {
      newFiltros = {
        ...filtros,
        fechaInicio: newRange.startDate,
        fechaFin: newRange.endDate,
        estado: "",
        sede: "",
        busqueda: ""
      };
    } else if (resetType === 'TRES_MESES') {
      const now = new Date();
      const hace3Meses = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const dentroUn1Mes = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      newFiltros = {
        ...filtros,
        fechaInicio: hace3Meses.toISOString().split('T')[0],
        fechaFin: dentroUn1Mes.toISOString().split('T')[0],
        estado: "",
        sede: "",
        busqueda: ""
      };
    } else { // Limpiar
      newFiltros = {
        fechaInicio: newRange.startDate,
        fechaFin: newRange.endDate,
        estado: "",
        sede: "",
        busqueda: ""
      };
    }

    setFiltros(newFiltros);
    aplicarFiltros(newFiltros);
  };

  const sedes = [
    "Copacabana Plaza", "Copacabana Vegas", "Copacabana San Juan",
    "Girardota Parque", "Girardota Llano", "Barbosa",
    "Carnes Barbosa", "Villa Hermosa"
  ];

  const estados = ["Pendiente", "Necesario", "No necesario"];


  return (
    <div className="mh-gastos-card">
      <div className="mh-gastos-header">
        <h3 className="mh-gastos-title">💸 Historial de Gastos</h3>
        <div className="mh-gastos-info">
          <span className="mh-registros-badge">
            {loading ? "Cargando..." : `Total: ${totalRegistros} registros`}
          </span>
        </div>
      </div>

      {error && (
        <div className="mh-error-alert">
          🚨 {error}
        </div>
      )}

      <div className="mh-gastos-body">
        <div className="mh-filter-grid">
          {/* FECHA INICIO */}
          <div className="mh-filter-item">
            <label htmlFor="fechaInicio">Fecha Inicio:</label>
            <input
              type="date"
              id="fechaInicio"
              name="fechaInicio"
              value={filtros.fechaInicio}
              onChange={handleInputChange}
              className="mh-input-field"
            />
          </div>

          {/* FECHA FIN */}
          <div className="mh-filter-item">
            <label htmlFor="fechaFin">Fecha Fin:</label>
            <input
              type="date"
              id="fechaFin"
              name="fechaFin"
              value={filtros.fechaFin}
              onChange={handleInputChange}
              className="mh-input-field"
            />
          </div>

          {/* ESTADO */}
          <div className="mh-filter-item">
            <label htmlFor="estado">Estado:</label>
            <select
              id="estado"
              name="estado"
              value={filtros.estado}
              onChange={handleInputChange}
              className="mh-input-field"
            >
              <option value="">Todos los estados</option>
              {estados.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* SEDE */}
          <div className="mh-filter-item">
            <label htmlFor="sede">Sede:</label>
            <select
              id="sede"
              name="sede"
              value={filtros.sede}
              onChange={handleInputChange}
              className="mh-input-field"
            >
              <option value="">Todas las sedes</option>
              {sedes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* BÚSQUEDA */}
          <div className="mh-filter-item mh-search-item">
            <label htmlFor="busqueda">Buscar:</label>
            <input
              type="text"
              id="busqueda"
              name="busqueda"
              value={filtros.busqueda}
              onChange={handleInputChange}
              placeholder="Nombre, descripción, área..."
              className="mh-input-field"
            />
          </div>
        </div>

        {/* ACCIONES (Botones) */}
        <div className="mh-filter-actions">
          <button
            onClick={handleApplyClick}
            disabled={loading}
            className="mh-btn mh-btn-primary"
          >
            {loading ? "⏳ Aplicando..." : "✅ Aplicar Filtros"}
          </button>

          <button
            onClick={() => handleFilterReset('ULTIMO_MES')}
            className="mh-btn mh-btn-secondary"
          >
            📅 Último Mes
          </button>

          <button
            onClick={() => handleFilterReset('TRES_MESES')}
            className="mh-btn mh-btn-secondary"
          >
            📈 3 Meses
          </button>

          <button
            onClick={() => handleFilterReset('LIMPIAR')}
            className="mh-btn mh-btn-danger"
          >
            🗑️ Limpiar Todo
          </button>
        </div>

        {/* RESUMEN DE FILTROS */}
        <div className="mh-filter-summary">
          <p>
            Rango: <strong>{filtros.fechaInicio}</strong> a <strong>{filtros.fechaFin}</strong>
            {filtros.estado && (
              <span> | Estado: <strong className="mh-summary-highlight">{filtros.estado}</strong></span>
            )}
            {filtros.sede && (
              <span> | Sede: <strong className="mh-summary-highlight">{filtros.sede}</strong></span>
            )}
            {filtros.busqueda && (
              <span> | Buscando: <strong className="mh-summary-highlight">"{filtros.busqueda}"</strong></span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export { FiltroGastos };