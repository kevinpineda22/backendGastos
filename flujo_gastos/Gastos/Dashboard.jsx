import React, { useState, useMemo, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
} from "chart.js";
import { Bar, Doughnut, Pie, Line } from "react-chartjs-2";
import "./Gastos.css";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement
);

const Dashboard = ({
  mostrarDashboard,
  historialGastos = [],
  formatoCOP,
  isLoadingHistorial,
}) => {
  const [filtrosDashboard, setFiltrosDashboard] = useState({
    fechaInicio: "",
    fechaFin: "",
    estado: "",
    area: "",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const dashboardRef = useRef(null);

  const barChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const lineChartRef = useRef(null);

  const toggleFiltros = () => {
    setMostrarFiltros((prev) => !prev);
  };

  const handleFiltroChange = (name, value) => {
    setFiltrosDashboard((prev) => ({ ...prev, [name]: value }));
  };

  const resetFiltros = () => {
    setFiltrosDashboard({
      fechaInicio: "",
      fechaFin: "",
      estado: "",
      area: "",
    });
  };

  // Validación defensiva al inicio del componente
  const safeHistorialGastos = useMemo(() => {
    if (!Array.isArray(historialGastos)) {
      console.warn("⚠️ historialGastos no es un array:", historialGastos);
      return [];
    }
    return historialGastos;
  }, [historialGastos]);

  const historialFiltrado = useMemo(() => {
    return safeHistorialGastos.filter((gasto) => {
      const fecha = new Date(gasto.fecha_creacion);
      const fechaInicio = filtrosDashboard.fechaInicio
        ? new Date(filtrosDashboard.fechaInicio)
        : null;
      const fechaFin = filtrosDashboard.fechaFin
        ? new Date(filtrosDashboard.fechaFin)
        : null;

      return (
        (!fechaInicio || fecha >= fechaInicio) &&
        (!fechaFin || fecha <= fechaFin) &&
        (!filtrosDashboard.estado ||
          gasto.estado === filtrosDashboard.estado) &&
        (!filtrosDashboard.area || gasto.area === filtrosDashboard.area)
      );
    });
  }, [safeHistorialGastos, filtrosDashboard]);

  const dashboardData = useMemo(() => {
    const montosPorEstado = { Pendiente: 0, Necesario: 0, "No necesario": 0 };
    historialFiltrado.forEach((gasto) => {
      if (montosPorEstado[gasto.estado] !== undefined) {
        montosPorEstado[gasto.estado] += parseFloat(gasto.monto_estimado || 0);
      }
    });

    const dataBar = {
      labels: Object.keys(montosPorEstado),
      datasets: [
        {
          label: "Monto Estimado (COP)",
          data: Object.values(montosPorEstado),
          backgroundColor: ["#ffbf00", "#2ce056", "#d33845"],
          borderColor: ["#e6ac00", "#28c44e", "#bf2f3d"],
          borderWidth: 1,
        },
      ],
    };

    const centrosCostosCount = {};
    historialFiltrado.forEach((gasto) => {
      const centros = Array.isArray(gasto.centro_costos)
        ? gasto.centro_costos
        : (gasto.centro_costos || "").split(",").map((s) => s.trim());
      centros.forEach((centro) => {
        if (centro) {
          centrosCostosCount[centro] =
            (centrosCostosCount[centro] || 0) +
            parseFloat(gasto.monto_estimado || 0);
        }
      });
    });

    const dataDoughnut = {
      labels: Object.keys(centrosCostosCount),
      datasets: [
        {
          label: "Monto por Centro de Costos",
          data: Object.values(centrosCostosCount),
          backgroundColor: [
            "#89DC00",
            "#210d65",
            "#ffbf00",
            "#2ce056",
            "#d33845",
            "#76c400",
            "#1a0b4e",
            "#e6ac00",
            "#28c44e",
            "#bf2f3d",
            "#a8e600",
            "#32209b",
            "#ffcc33",
            "#4ae074",
            "#e0525d",
          ],
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    };

    const gastosPorFecha = {};
    historialFiltrado.forEach((gasto) => {
      const fecha = gasto.fecha_creacion.slice(0, 10);
      gastosPorFecha[fecha] =
        (gastosPorFecha[fecha] || 0) + parseFloat(gasto.monto_estimado || 0);
    });

    const fechasOrdenadas = Object.keys(gastosPorFecha).sort();
    const dataLine = {
      labels: fechasOrdenadas,
      datasets: [
        {
          label: "Monto Estimado (COP)",
          data: fechasOrdenadas.map((fecha) => gastosPorFecha[fecha]),
          fill: false,
          borderColor: "#89DC00",
          backgroundColor: "#89DC00",
          tension: 0.1,
        },
      ],
    };

    const unidadesCount = {};
    historialFiltrado.forEach((gasto) => {
      const unidades = Array.isArray(gasto.unidad)
        ? gasto.unidad
        : (gasto.unidad || "").split(",").map((s) => s.trim());
      unidades.forEach((unidad) => {
        if (unidad) {
          unidadesCount[unidad] =
            (unidadesCount[unidad] || 0) +
            parseFloat(gasto.monto_estimado || 0);
        }
      });
    });

    const dataPie = {
      labels: Object.keys(unidadesCount),
      datasets: [
        {
          label: "Monto por Unidad",
          data: Object.values(unidadesCount),
          backgroundColor: [
            "#210d65",
            "#89DC00",
            "#ffbf00",
            "#2ce056",
            "#1a0b4e",
            "#76c400",
            "#e6ac00",
            "#28c44e",
          ],
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    };

    const totalGastos = historialFiltrado.reduce(
      (sum, gasto) => sum + parseFloat(gasto.monto_estimado || 0),
      0
    );
    const promedioGastos = historialFiltrado.length
      ? (totalGastos / historialFiltrado.length).toFixed(2)
      : 0;
    const totalSolicitudes = historialFiltrado.length;
    const tasaAprobacion = historialFiltrado.length
      ? (
          (historialFiltrado.filter((g) => g.estado === "Necesario").length /
            historialFiltrado.length) *
          100
        ).toFixed(1)
      : 0;

    return {
      dataBar,
      dataDoughnut,
      dataLine,
      dataPie,
      totalGastos,
      promedioGastos,
      totalSolicitudes,
      tasaAprobacion,
    };
  }, [historialFiltrado]);

  if (!mostrarDashboard) return null;

  return (
    <div className="dashboard-container-modal">
      {isLoadingHistorial ? (
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Cargando datos del dashboard...</p>
        </div>
      ) : (
        <div className="dashboard" ref={dashboardRef}>
          <h2>Dashboard Personal</h2>

          <div className="dashboard-filtros-toggle" onClick={toggleFiltros}>
            <button className="toggle-filtros-button">
              {mostrarFiltros ? "Ocultar Filtros ▲" : "Mostrar Filtros ▼"}
            </button>
          </div>

          {mostrarFiltros && (
            <div className="dashboard-filtros">
              <h3>Filtros</h3>
              <div className="filtros-form">
                <div className="filtro-item">
                  <label htmlFor="fechaInicio">Fecha Inicio</label>
                  <input
                    type="date"
                    id="fechaInicio"
                    value={filtrosDashboard.fechaInicio}
                    onChange={(e) =>
                      handleFiltroChange("fechaInicio", e.target.value)
                    }
                  />
                </div>
                <div className="filtro-item">
                  <label htmlFor="fechaFin">Fecha Fin</label>
                  <input
                    type="date"
                    id="fechaFin"
                    value={filtrosDashboard.fechaFin}
                    onChange={(e) =>
                      handleFiltroChange("fechaFin", e.target.value)
                    }
                  />
                </div>
                <div className="filtro-item">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    value={filtrosDashboard.estado}
                    onChange={(e) =>
                      handleFiltroChange("estado", e.target.value)
                    }
                  >
                    <option value="">Todos</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Necesario">Necesario</option>
                    <option value="No necesario">No necesario</option>
                  </select>
                </div>
                <div className="filtro-item">
                  <label htmlFor="area">Área</label>
                  <select
                    id="area"
                    value={filtrosDashboard.area}
                    onChange={(e) => handleFiltroChange("area", e.target.value)}
                  >
                    <option value="">Todas</option>
                    <option value="Gerencia">Gerencia</option>
                    <option value="Gestión humana">Gestión humana</option>
                    <option value="Operaciones">Operaciones</option>
                    <option value="Contabilidad">Contabilidad</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Cartera">Cartera</option>
                  </select>
                </div>
                <button onClick={resetFiltros} className="reset-filtros-button">
                  Limpiar Filtros
                </button>
              </div>
            </div>
          )}

          {historialFiltrado.length === 0 ? (
            <p>No hay datos disponibles para mostrar.</p>
          ) : (
            <div className="dashboard-content">
              <div className="dashboard-stats">
                <div className="stat-card">
                  <h3>Total Gastos</h3>
                  <p>{formatoCOP.format(dashboardData.totalGastos)}</p>
                </div>
                <div className="stat-card">
                  <h3>Promedio por Solicitud</h3>
                  <p>{formatoCOP.format(dashboardData.promedioGastos)}</p>
                </div>
                <div className="stat-card">
                  <h3>Total Solicitudes</h3>
                  <p>{dashboardData.totalSolicitudes}</p>
                </div>
                <div className="stat-card">
                  <h3>Tasa de Aprobación</h3>
                  <p>{dashboardData.tasaAprobacion}%</p>
                </div>
              </div>

              <div
                className="dashboard-charts"
                style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}
              >
                <div
                  className="chart-container"
                  style={{ flex: "1 1 calc(50% - 20px)", minWidth: "300px" }}
                >
                  <h4>Monto por Estado</h4>
                  <Bar
                    data={dashboardData.dataBar}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (context) =>
                              `Estado: ${
                                context.label
                              }, Monto: ${formatoCOP.format(context.raw)}`,
                          },
                        },
                      },
                    }}
                    ref={barChartRef}
                  />
                </div>

                <div
                  className="chart-container"
                  style={{ flex: "1 1 calc(50% - 20px)", minWidth: "300px" }}
                >
                  <h4>Distribución por Centro de Costos</h4>
                  <Doughnut
                    data={dashboardData.dataDoughnut}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (context) =>
                              `${context.label}: ${formatoCOP.format(
                                context.raw
                              )}`,
                          },
                        },
                      },
                    }}
                    ref={doughnutChartRef}
                  />
                </div>

                <div
                  className="chart-container"
                  style={{ flex: "1 1 calc(50% - 20px)", minWidth: "300px" }}
                >
                  <h4>Distribución por Unidad de Negocio</h4>
                  <Pie
                    data={dashboardData.dataPie}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (context) =>
                              `${context.label}: ${formatoCOP.format(
                                context.raw
                              )}`,
                          },
                        },
                      },
                    }}
                    ref={pieChartRef}
                  />
                </div>

                <div
                  className="chart-container"
                  style={{ flex: "1 1 calc(50% - 20px)", minWidth: "300px" }}
                >
                  <h4>Tendencia de Gastos</h4>
                  <Line
                    data={dashboardData.dataLine}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (context) =>
                              `Monto: ${formatoCOP.format(context.raw)}`,
                          },
                        },
                      },
                      scales: {
                        x: {
                          ticks: {
                            maxTicksLimit: 10,
                          },
                        },
                      },
                    }}
                    ref={lineChartRef}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
