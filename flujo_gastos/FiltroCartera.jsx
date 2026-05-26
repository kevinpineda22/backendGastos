import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaFilter, FaChevronDown, FaChevronUp, FaCalendarAlt, FaFileInvoiceDollar, FaUser, FaBuilding, FaSearch, FaEraser } from "react-icons/fa";
import "./FiltroCartera.css";

const FiltroCartera = ({ onDataFiltered, correoUsuario, mapaAreaLideres }) => {
  const [filtros, setFiltros] = useState({
    fechaInicio: "",
    fechaFin: "",
    estado: "",
    estadoCartera: "",
    area: "",
    unidad: "",
    nombreCompleto: "",
    numeroEgreso: ""
  });

  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [rangoActivo, setRangoActivo] = useState(30);
  const [totalRegistros, setTotalRegistros] = useState(0);

  const API_URL = "https://backend-gastos.vercel.app/api/requerimientos/obtenerRequerimientos";

  // Establecer filtro por defecto de últimos 30 días
  useEffect(() => {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);

    setFiltros(prev => ({
      ...prev,
      fechaInicio: hace30Dias.toISOString().split('T')[0],
      fechaFin: hoy.toISOString().split('T')[0]
    }));
  }, []);

  // Aplicar filtros automáticamente cuando se establecen las fechas por defecto
  useEffect(() => {
    if (filtros.fechaInicio && filtros.fechaFin) {
      aplicarFiltros();
    }
  }, [filtros.fechaInicio, filtros.fechaFin]);

  const aplicarFiltros = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      
      if (response.status === 200) {
        let datos = response.data.data || [];
        const totalOriginal = datos.length;
        
        // Aplicar filtros
        datos = datos.filter(item => {
          // Filtro por fechas (requerido)
          if (filtros.fechaInicio || filtros.fechaFin) {
            const fechaItem = new Date(item.fecha_creacion);
            const fechaInicio = filtros.fechaInicio ? new Date(filtros.fechaInicio) : null;
            const fechaFin = filtros.fechaFin ? new Date(filtros.fechaFin + 'T23:59:59') : null;
            
            if (fechaInicio && fechaItem < fechaInicio) return false;
            if (fechaFin && fechaItem > fechaFin) return false;
          }

          // Filtro por estado
          if (filtros.estado && item.estado !== filtros.estado) return false;

          // Filtro por estado cartera
          if (filtros.estadoCartera && (item.estado_cartera || "Pendiente") !== filtros.estadoCartera) return false;

          // Filtro por área
          if (filtros.area && item.area !== filtros.area) return false;

          // Filtro por unidad
          if (filtros.unidad) {
            const unidades = Array.isArray(item.unidad) ? item.unidad : [item.unidad];
            if (!unidades.some(unidad => unidad?.toLowerCase().includes(filtros.unidad.toLowerCase()))) return false;
          }

          // Filtro por nombre completo
          if (filtros.nombreCompleto && 
              !item.nombre_completo?.toLowerCase().includes(filtros.nombreCompleto.toLowerCase())) {
            return false;
          }

          // ✅ NUEVO: Filtro por número de egreso
          if (filtros.numeroEgreso && 
              !item.numero_causacion?.toString().toLowerCase().includes(filtros.numeroEgreso.toLowerCase())) {
            return false;
          }

          return true;
        });

        // Agregar estado_cartera por defecto si no existe
        datos = datos.map(item => ({
          ...item,
          estado_cartera: item.estado_cartera || "Pendiente"
        }));

        setTotalRegistros(datos.length);
        onDataFiltered(datos);
      }
    } catch (error) {
      console.error("Error al filtrar datos:", error);
      toast.error("Error al aplicar filtros");
      setTotalRegistros(0);
    } finally {
      setLoading(false);
    }
  }, [filtros, onDataFiltered]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const limpiarFiltros = () => {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);

    setFiltros({
      fechaInicio: hace30Dias.toISOString().split('T')[0],
      fechaFin: hoy.toISOString().split('T')[0],
      estado: "",
      estadoCartera: "",
      area: "",
      unidad: "",
      nombreCompleto: "",
      numeroEgreso: ""
    });
    setRangoActivo(30);
  };

  // ✅ MEJORADO: Establecer rango y marcar como activo
  const establecerRangoFechas = (dias) => {
    const hoy = new Date();
    const fechaInicio = new Date();
    fechaInicio.setDate(hoy.getDate() - dias);

    setFiltros(prev => ({
      ...prev,
      fechaInicio: fechaInicio.toISOString().split('T')[0],
      fechaFin: hoy.toISOString().split('T')[0]
    }));
    setRangoActivo(dias); // ✅ Marcar el rango como activo
  };

  return (
    <div className="filtro-cartera-container">
      <div className="filtro-cartera-header">
        <div className="filtro-header-left">
          <FaFilter className="filtro-header-icon" />
          <div className="filtro-header-text">
            <h3>Filtros de Búsqueda</h3>
            <span className="filtro-subtitle">Personaliza tu búsqueda de registros</span>
          </div>
        </div>
        <button 
          className="toggle-filters-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? (
            <>
              <FaChevronUp className="toggle-icon" />
              Ocultar Filtros
            </>
          ) : (
            <>
              <FaChevronDown className="toggle-icon" />
              Mostrar Filtros
            </>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="filtro-cartera-form">
          {/* Sección de Fechas */}
          <div className="filtro-section">
            <h4 className="filtro-section-title">
              <FaCalendarAlt className="section-icon" />
              Rango de Fechas
            </h4>
            <div className="filtro-row">
              <div className="filtro-group">
                <label>Fecha Inicio:</label>
                <input
                  type="date"
                  name="fechaInicio"
                  value={filtros.fechaInicio}
                  onChange={handleInputChange}
                  className="filtro-input"
                />
              </div>

              <div className="filtro-group">
                <label>Fecha Fin:</label>
                <input
                  type="date"
                  name="fechaFin"
                  value={filtros.fechaFin}
                  onChange={handleInputChange}
                  className="filtro-input"
                />
              </div>

              <div className="filtro-group">
                <label>Rangos Rápidos:</label>
                <div className="range-buttons">
                  {[7, 15, 30, 60, 90].map(dias => (
                    <button 
                      key={dias}
                      onClick={() => establecerRangoFechas(dias)} 
                      className={`range-btn ${rangoActivo === dias ? 'active' : ''}`}
                    >
                      {dias} días
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sección de Estados */}
          <div className="filtro-section">
            <h4 className="filtro-section-title">
              <FaFileInvoiceDollar className="section-icon" />
              Estados y Categorías
            </h4>
            <div className="filtro-row">
              <div className="filtro-group">
                <label>Estado:</label>
                <select
                  name="estado"
                  value={filtros.estado}
                  onChange={handleInputChange}
                  className="filtro-select"
                >
                  <option value="">Todos los estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Necesario">Necesario</option>
                  <option value="No necesario">No necesario</option>
                </select>
              </div>

              <div className="filtro-group">
                <label>Estado Cartera:</label>
                <select
                  name="estadoCartera"
                  value={filtros.estadoCartera}
                  onChange={handleInputChange}
                  className="filtro-select"
                >
                  <option value="">Todos los estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Anticipo">Anticipo</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div className="filtro-group">
                <label>Área:</label>
                <select
                  name="area"
                  value={filtros.area}
                  onChange={handleInputChange}
                  className="filtro-select"
                >
                  <option value="">Todas las áreas</option>
                  <option value="Gestión humana">Gestión humana</option>
                  <option value="Operaciones">Operaciones</option>
                  <option value="Comercial">Comercial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección de Búsqueda de Texto */}
          <div className="filtro-section">
            <h4 className="filtro-section-title">
              <FaSearch className="section-icon" />
              Búsqueda de Texto
            </h4>
            <div className="filtro-row">
              <div className="filtro-group">
                <label>
                  <FaUser className="input-icon" />
                  Nombre:
                </label>
                <input
                  type="text"
                  name="nombreCompleto"
                  value={filtros.nombreCompleto}
                  onChange={handleInputChange}
                  placeholder="Buscar por nombre..."
                  className="filtro-input with-icon"
                />
              </div>

              <div className="filtro-group">
                <label>
                  <FaBuilding className="input-icon" />
                  Unidad de Negocio:
                </label>
                <input
                  type="text"
                  name="unidad"
                  value={filtros.unidad}
                  onChange={handleInputChange}
                  placeholder="Filtrar por unidad..."
                  className="filtro-input with-icon"
                />
              </div>

              <div className="filtro-group">
                <label>
                  <FaFileInvoiceDollar className="input-icon" />
                  Número de Egreso:
                </label>
                <input
                  type="text"
                  name="numeroEgreso"
                  value={filtros.numeroEgreso}
                  onChange={handleInputChange}
                  placeholder="Buscar por egreso..."
                  className="filtro-input with-icon"
                />
              </div>
            </div>
          </div>

          <div className="filtro-actions">
            <button 
              onClick={aplicarFiltros} 
              disabled={loading}
              className="apply-filters-btn"
            >
              <FaSearch className="btn-icon" />
              {loading ? "Aplicando..." : "Aplicar Filtros"}
            </button>
            <button 
              onClick={limpiarFiltros}
              className="clear-filters-btn"
            >
              <FaEraser className="btn-icon" />
              Limpiar (Últimos 30 días)
            </button>
          </div>
        </div>
      )}

      <div className="filtro-info-enhanced">
        <div className="filtro-info-stats">
          <div className="stat-item">
            <div className="stat-icon">
              <FaFileInvoiceDollar />
            </div>
            <div className="stat-content">
              <span className="stat-number">{totalRegistros.toLocaleString('es-CO')}</span>
              <span className="stat-label">registros encontrados</span>
            </div>
          </div>
          <div className="filtro-date-range">
            <FaCalendarAlt className="date-icon" />
            <span>
              Desde <strong>{filtros.fechaInicio}</strong> hasta <strong>{filtros.fechaFin}</strong>
            </span>
          </div>
        </div>
        
        {(filtros.estado || filtros.estadoCartera || filtros.area || filtros.nombreCompleto || filtros.unidad || filtros.numeroEgreso) && (
          <div className="filtro-info-filters">
            <span className="filters-label">Filtros activos:</span>
            <div className="active-filters">
              {filtros.estado && (
                <span className="filter-tag">Estado: {filtros.estado}</span>
              )}
              {filtros.estadoCartera && (
                <span className="filter-tag">Cartera: {filtros.estadoCartera}</span>
              )}
              {filtros.area && (
                <span className="filter-tag">Área: {filtros.area}</span>
              )}
              {filtros.nombreCompleto && (
                <span className="filter-tag">Nombre: {filtros.nombreCompleto}</span>
              )}
              {filtros.unidad && (
                <span className="filter-tag">Unidad: {filtros.unidad}</span>
              )}
              {filtros.numeroEgreso && (
                <span className="filter-tag">Egreso: {filtros.numeroEgreso}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { FiltroCartera };
