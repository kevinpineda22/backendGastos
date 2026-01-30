import React, { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import Swal from "sweetalert2";
import Historial from "./Historial";
import Dashboard from "./Dashboard";
import "./Gastos.css";
import { useQuery, useQueryClient } from "@tanstack/react-query"; // Importa useQuery y useQueryClient
import { getAssetUrl } from "../../../config/storage";

const initialFormData = {
  fecha_creacion: new Date().toISOString().split("T")[0],
  nombre_completo: "",
  area: "",
  procesos: "",
  sede: [],
  unidad: [],
  centro_costos: [],
  descripcion: "",
  monto_estimado: "",
  monto_sede: "",
  anticipo: "",
  tiempo_fecha_pago: "",
  archivo_cotizacion: null,
  archivos_proveedor: [],
  correo_empleado: localStorage.getItem("correo_empleado") || "",
  observacion_responsable: "", // ✅ MANTENER: Este campo es para el formulario
};

const SUPABASE_URL =
  "https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/cotizaciones";
const API_URL = "https://backend-gastos.vercel.app/api";

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
});

const procesosPorArea = {
  Comercial: [
    { value: "Comercial", label: "Comercial" },
    { value: "Marketing digital ", label: "Marketing digital " },
  ],
  "Gestión humana": [
    {
      value: "Seguridad y Salud en el Trabajo",
      label: "Seguridad y Salud en el Trabajo",
    },
    { value: "Bienestar y Formación", label: "Bienestar y Formación" },
    { value: "Contratación", label: "Contratación" },
    { value: "Proceso de Selección", label: "Proceso de Selección" },
  ],
  Operaciones: [
    { value: "Logística", label: "Logística" },
    { value: "Inventarios", label: "Inventarios" },
    { value: "Sistemas", label: "Sistemas" },
    { value: "Desarrollo", label: "Desarrollo" },
    { value: "Procesos", label: "Procesos" },
    { value: "Fruver", label: "Fruver" },
    { value: "Cárnicos", label: "Cárnicos" },
    { value: "Proyectos", label: "Proyectos" },
    { value: "Operaciones-Comerciales", label: "Operaciones Comerciales" },
    { value: "Mantenimiento", label: "Mantenimiento" },
    { value: "Almacén", label: "Almacén" },
  ],
  Contabilidad: [{ value: "Contabilidad", label: "Contabilidad" }],
  Cartera: [
    { value: "Tesoreria", label: "Tesoreria" },
    { value: "Cartera", label: "Cartera" },
  ],
};

const Gastos = () => {
  const [fecha, setFecha] = useState(initialFormData.fecha_creacion);
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [token, setToken] = useState("");
  const [decision, setDecision] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  // const [historialGastos, setHistorialGastos] = useState([]); // Eliminamos este estado, useQuery lo gestionará
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [mostrarArchivos, setMostrarArchivos] = useState(false);
  const [mostrarDashboard, setMostrarDashboard] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [modalDashboard, setModalDashboard] = useState(false);
  const [hasSubmittedOnce, setHasSubmittedOnce] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [isLoadingHistorial, setIsLoadingHistorial] = useState(false); // Eliminamos este estado, useQuery lo gestionará
  const [modalContent, setModalContent] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [archivos] = useState([
    {
      nombre: "Documento interno",
      url: `${SUPABASE_URL}/proveedores/1738273714697_comprobante%20de%20gastos%20(1)%20(7).xlsx`,
    },
    {
      nombre: "Documento proveedor",
      url: `${SUPABASE_URL}/proveedores/FORMATO%20DE%20COTIZACION%20(1)%20(1).xlsx`,
    },
  ]);

  const unidadOptions = [
    { value: "Carnes", label: "Carnes" },
    { value: "Fruver", label: "Fruver" },
    { value: "Abarrotes", label: "Abarrotes" },
    { value: "Administrativo", label: "Administrativo" },
  ];

  const sedeOptions = [
    { value: "Copacabana Plaza", label: "Copacabana Plaza" },
    { value: "Copacabana Vegas", label: "Copacabana Vegas" },
    { value: "Copacabana San Juan", label: "Copacabana San Juan" },
    { value: "Girardota Parque", label: "Girardota Parque" },
    { value: "Girardota Llano", label: "Girardota Llano" },
    { value: "Barbosa", label: "Barbosa" },
    { value: "Carnes Barbosa", label: "Carnes Barbosa" },
    { value: "Villa Hermosa", label: "Villa Hermosa" },
    { value: "Todas las sedes", label: "Todas las sedes" },
  ];

  const centroCostosOptions = [
    { value: "Gerencia", label: "Gerencia" },
    { value: "Contabilidad", label: "Contabilidad" },
    { value: "Tesoreria", label: "Tesoreria" },
    { value: "Gestion humana", label: "Gestion humana" },
    { value: "Generales administrativos", label: "Generales administrativos" },
    { value: "Puntos de venta", label: "Puntos de venta" },
    { value: "Domicilios", label: "Domicilios" },
    { value: "Carnicos", label: "Carnicos" },
    { value: "Fruver", label: "Fruver" },
    { value: "Panaderia", label: "Panaderia" },
    { value: "Bodega", label: "Bodega" },
    { value: "Generales operaciones", label: "Generales operaciones" },
    { value: "Compras", label: "Compras" },
    { value: "Tienda virtual", label: "Tienda virtual" },
    { value: "Callcenter", label: "Callcenter" },
    { value: "Generales comerciales", label: "Generales comerciales" },
    { value: "Generico", label: "Generico" },
  ];

  const queryClient = useQueryClient(); // Obtiene la instancia del cliente de React Query

  // Efecto para cargar la información del empleado desde localStorage
  useEffect(() => {
    const correo = localStorage.getItem("correo_empleado");
    const empleado = JSON.parse(localStorage.getItem("empleado_info") || "{}");

    if (correo && empleado?.nombre) {
      setFormData((prevData) => ({
        ...prevData,
        correo_empleado: correo,
        nombre_completo: empleado.nombre,
        area: empleado.area || "",
      }));
    } else {
      setErrorMessage(
        "No se encontró la información del empleado. Por favor, inicia sesión nuevamente."
      );
    }
  }, []);

  // Función de fetching para useQuery
  const fetchHistorialGastos = async () => {
    const correo_empleado = localStorage.getItem("correo_empleado");

    if (!correo_empleado) {
      throw new Error(
        "No se encontró el correo del empleado para el historial."
      );
    }

    try {
      const response = await axios.get(`${API_URL}/requerimientos/historial`, {
        params: { correo_empleado: correo_empleado },
        headers: { "Cache-Control": "no-cache" },
      });

      // Verificar la estructura de la respuesta
      let data = [];
      if (response.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      } else {
        console.warn("⚠️ Estructura de respuesta inesperada:", response.data);
        data = [];
      }

      return data;
    } catch (error) {
      console.error("❌ Error al obtener historial:", error);
      return []; // Retorna array vacío en caso de error
    }
  };

  // Uso de useQuery para gestionar el historial de gastos
  const {
    data: historialGastos = [],
    isLoading: isLoadingHistorial,
    error,
    refetch: refetchHistorial,
  } = useQuery({
    queryKey: ["historialGastos", formData.correo_empleado],
    queryFn: fetchHistorialGastos,
    enabled: !!formData.correo_empleado, // Solo se ejecuta si hay correo
    refetchInterval: 30000,
    staleTime: 20000,
    retry: 3, // Reintenta 3 veces en caso de error
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Efecto adicional para debug cuando cambia el correo
  useEffect(() => {
    if (formData.correo_empleado) {
      // Remover este refetch para evitar bucles infinitos
      // refetchHistorial();
    }
  }, [formData.correo_empleado]); // Quitar refetchHistorial de las dependencias

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      procesos: "",
    }));
  }, [formData.area]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    console.log(`🔍 Campo cambiado: ${name}, valor: ${value}`);

    if (name === "monto_estimado" || name === "anticipo") {
      const valorNumerico = value.replace(/\D/g, "");
      const valorFormateado = valorNumerico
        ? formatoCOP.format(valorNumerico)
        : "";
      setFormData({ ...formData, [name]: valorFormateado });
    } else if (
      name === "tiempo_fecha_pago" ||
      name === "observacion_responsable"
    ) {
      // ✅ VERIFICAR: Este else if maneja observacion_responsable correctamente
      console.log(`📝 Guardando ${name}: ${value}`);
      setFormData({ ...formData, [name]: value });
    } else if (name === "monto_sede") {
      setFormData({ ...formData, [name]: value });
    } else if (["unidad", "centro_costos", "sede"].includes(name)) {
      const selectedOptions = Array.from(e.target.selectedOptions).map(
        (option) => option.value
      );
      setFormData({ ...formData, [name]: selectedOptions });
    } else if (name === "archivo_cotizacion") {
      setFormData({ ...formData, archivo_cotizacion: files[0] });
    } else {
      // ✅ FALLBACK: Para cualquier otro campo
      console.log(`📋 Campo genérico: ${name} = ${value}`);
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleInputChange = (e) => {
    const { name, files } = e.target;
    if (name === "archivos_proveedor") {
      setFormData({
        ...formData,
        archivos_proveedor: files ? Array.from(files) : [],
      });
    } else {
      setFormData({ ...formData, [name]: e.target.value });
    }
  };

  const handleSelectChange = (name, selectedOptions) => {
    const selectedValues = selectedOptions
      ? selectedOptions.map((option) => option.value)
      : [];
    setFormData({ ...formData, [name]: selectedValues });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (hasSubmittedOnce) {
      setErrorMessage(
        "Ya has enviado este formulario. Por favor, espera la respuesta."
      );
      return;
    }

    setIsSubmitting(true);
    setHasSubmittedOnce(true);

    const valorNumerico = formData.monto_estimado.replace(/\D/g, "");
    const valorNumericoAnticipo = formData.anticipo
      ? formData.anticipo.replace(/\D/g, "")
      : "0";

    const formDataToSend = new FormData();
    formDataToSend.append("fecha_creacion", formData.fecha_creacion);
    formDataToSend.append("nombre_completo", formData.nombre_completo);
    formDataToSend.append("area", formData.area);
    formDataToSend.append("procesos", formData.procesos);
    formData.sede.forEach((item) => formDataToSend.append("sede[]", item));
    formData.unidad.forEach((item) => formDataToSend.append("unidad[]", item));
    formData.centro_costos.forEach((item) =>
      formDataToSend.append("centro_costos[]", item)
    );
    formDataToSend.append("descripcion", formData.descripcion);
    formDataToSend.append("monto_estimado", valorNumerico);
    if (formData.monto_sede.trim() !== "") {
      formDataToSend.append("monto_sede", formData.monto_sede);
    }
    formDataToSend.append("anticipo", valorNumericoAnticipo);
    formDataToSend.append("tiempo_fecha_pago", formData.tiempo_fecha_pago);
    formDataToSend.append("archivo_cotizacion", formData.archivo_cotizacion);
    formData.archivos_proveedor.forEach((file) => {
      formDataToSend.append("archivos_proveedor", file);
    });
    formDataToSend.append("correo_empleado", formData.correo_empleado);

    // ✅ VERIFICAR: Asegurarse de que observacion_responsable se envía
    console.log(
      `📤 Enviando observacion_responsable (para campo observacion): "${formData.observacion_responsable}"`
    );
    formDataToSend.append(
      "observacion_responsable",
      formData.observacion_responsable || ""
    );

    formDataToSend.append("hora_cambio_estado", new Date().toISOString());

    // ✅ DEPURACIÓN: Ver todos los campos que se están enviando
    console.log("📋 FormData completo:");
    for (let [key, value] of formDataToSend.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    try {
      const response = await axios.post(
        `${API_URL}/requerimientos/crear`,
        formDataToSend,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setIsSubmitted(true);
      setDecision(response.data.decision);
      setErrorMessage("");
      setTimeout(() => {
        const correo = localStorage.getItem("correo_empleado");
        const empleado = JSON.parse(
          localStorage.getItem("empleado_info") || "{}"
        );
        setIsSubmitted(false);
        setFormData({
          ...initialFormData,
          correo_empleado: correo || "",
          nombre_completo: empleado.nombre || "",
          area: empleado.area || "",
        });
        setHasSubmittedOnce(false);
        queryClient.invalidateQueries(["historialGastos"]);
      }, 3000);
    } catch (error) {
      console.error("Error al enviar la solicitud:", error);
      setErrorMessage(
        "Error al enviar la solicitud. Por favor, inténtalo de nuevo."
      );
      setHasSubmittedOnce(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCotizacion = async (id, newCotizacion) => {
    const formDataToSend = new FormData();
    formDataToSend.append("archivo_cotizacion", newCotizacion);

    try {
      const response = await axios.put(
        `${API_URL}/requerimientos/editar-cotizacion/${id}`,
        formDataToSend,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (response.status === 200) {
        // Ya no necesitas setHistorialGastos directamente aquí, React Query lo hará
        // setHistorialGastos((prev) =>
        //   prev.map((gasto) =>
        //     gasto.id === id ? { ...gasto, archivo_cotizacion: response.data.archivo_cotizacion } : gasto
        //   )
        // );
        Swal.fire("Éxito", "La cotización ha sido actualizada.", "success");
        setEditId(null);
        setFormData((prev) => ({ ...prev, archivo_cotizacion: null }));
        // Invalida la caché de 'historialGastos' para que React Query la refetch
        queryClient.invalidateQueries(["historialGastos"]);
      }
    } catch (error) {
      console.error("Error al actualizar la cotización:", error);
      Swal.fire("Error", "No se pudo actualizar la cotización.", "error");
    }
  };

  const toggleHistorial = () => {
    setModalHistorial(true);
  };

  const toggleArchivos = () => {
    setMostrarArchivos((prev) => !prev);
  };

  const toggleDashboard = () => {
    setModalDashboard(true);
  };

  const closeHistorialModal = () => {
    setModalHistorial(false);
  };

  const closeDashboardModal = () => {
    setModalDashboard(false);
  };

  const openModal = (content) => {
    setModalContent(content);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent("");
  };

  return (
    <div className="gastos-container">
      <div className="gastos-logo-container">
        <a href="/">
          <img
            src={getAssetUrl("logoMK.webp")}
            alt="Logo Merkahorro"
            className="gastos-logo-img"
          />
        </a>
      </div>
      <h1 className="gastos-header">Conciencia del gasto</h1>

      <button onClick={toggleArchivos} className="gastos-flotante-button">
        📂
      </button>
      {mostrarArchivos && (
        <div className="gastos-archivos-desplegados">
          <ul>
            {archivos.map((archivo, index) => (
              <li key={index}>
                <a href={archivo.url} target="_blank" rel="noopener noreferrer">
                  {archivo.nombre}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isSubmitted ? (
        <div className="gastos-form-container">
          <h2 className="gastos-form-title">Formulario cuidado del gasto</h2>
          <h4 className="fraseMotivacional">
            "Cuando cuidamos, nos protegemos todos."
          </h4>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          <form onSubmit={handleSubmit} className="gastos-form">
            <div className="gastos-form-field">
              <label className="gastos-label">
                Responsable de la gestión del cuidado gasto:
              </label>
              <input
                type="text"
                name="nombre_completo"
                value={formData.nombre_completo || ""}
                onChange={handleChange}
                required
                disabled
                className="gastos-input"
              />
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">Dirección:</label>
              <select
                name="area"
                value={formData.area}
                onChange={handleChange}
                required
                disabled
                className="gastos-input"
              >
                <option value="" disabled>
                  Seleccione un área:
                </option>
                <option value="Gerencia">Gerencia</option>
                <option value="Gestión humana">Dirección Gestión humana</option>
                <option value="Operaciones">Dirección Operaciones</option>
                <option value="Contabilidad">
                  Dirección Administrativa y Financiera
                </option>
                <option value="Comercial">Dirección Comercial</option>
                <option value="Cartera">Dirección Tesorería y Cartera</option>
              </select>
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">Procesos:</label>
              <select
                name="procesos"
                value={formData.procesos}
                onChange={handleChange}
                required
                className="gastos-input"
                disabled={!formData.area}
              >
                <option value="" disabled>
                  Seleccione un Proceso:
                </option>
                {(procesosPorArea[formData.area] || []).map((proc) => (
                  <option key={proc.value} value={proc.value}>
                    {proc.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">Sedes:</label>
              <Select
                name="sede"
                value={sedeOptions.filter((option) =>
                  formData.sede.includes(option.value)
                )}
                onChange={(selectedOptions) =>
                  handleSelectChange("sede", selectedOptions)
                }
                options={sedeOptions}
                isMulti
                className="gastos-input"
                placeholder="Seleccione las sedes"
              />
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">Unidad de negocio:</label>
              <Select
                name="unidad"
                value={unidadOptions.filter((option) =>
                  formData.unidad.includes(option.value)
                )}
                onChange={(selectedOptions) =>
                  handleSelectChange("unidad", selectedOptions)
                }
                options={unidadOptions}
                isMulti
                required
                className="gastos-input"
                placeholder="Seleccione las unidades"
              />
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">Centro de costos:</label>
              <Select
                name="centro_costos"
                value={centroCostosOptions.filter((option) =>
                  formData.centro_costos.includes(option.value)
                )}
                onChange={(selectedOptions) =>
                  handleSelectChange("centro_costos", selectedOptions)
                }
                options={centroCostosOptions}
                isMulti
                required
                className="gastos-input"
                placeholder="Seleccione los centros de costos"
              />
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">
                Describe tu necesidad y la razón:
              </label>
              <input
                type="text"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                required
                className="gastos-input"
              />
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">Monto estimado:</label>
              <input
                type="text"
                name="monto_estimado"
                value={formData.monto_estimado}
                onChange={handleChange}
                required
                className="gastos-input"
              />
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">Monto por sede:</label>
              <textarea
                name="monto_sede"
                value={formData.monto_sede}
                onChange={handleChange}
                placeholder="Ejemplo: Girardota: 300.000, Barbosa: 400.000"
                className="gastos-input"
              />
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">Anticipo:</label>
              <input
                type="text"
                name="anticipo"
                value={formData.anticipo}
                onChange={handleChange}
                placeholder="Ingrese el monto del anticipo"
                className="gastos-input"
              />
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">Fecha estimada de pago:</label>
              <input
                type="date"
                name="tiempo_fecha_pago"
                value={formData.tiempo_fecha_pago}
                onChange={handleChange}
                required
                className="gastos-input"
              />
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">Cotización:</label>
              <input
                type="file"
                name="archivo_cotizacion"
                onChange={handleChange}
                required={!editId}
                className="gastos-input"
              />
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">Observación:</label>
              <textarea
                name="observacion_responsable" // ✅ MANTENER: Este name es correcto
                value={formData.observacion_responsable}
                onChange={handleChange}
                placeholder="Ingrese cualquier observación relevante"
                className="gastos-input"
              />
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">
                Documentos nuevos proveedores:
              </label>
              <input
                type="file"
                name="archivos_proveedor"
                onChange={handleInputChange}
                multiple
                className="gastos-input"
              />
            </div>
            <div className="gastos-form-field">
              <label className="gastos-label">Correo del empleado:</label>
              <input
                type="email"
                name="correo_empleado"
                value={formData.correo_empleado}
                onChange={handleChange}
                required
                disabled
                className="gastos-input"
              />
            </div>
            <button
              type="submit"
              className="gastos-submit-button"
              disabled={isSubmitting || hasSubmittedOnce}
            >
              {isSubmitting
                ? "Enviando..."
                : editId
                ? "Actualizar Cotización"
                : "Enviar"}
            </button>
            {editId && (
              <button
                type="button"
                className="gastos-cancel-button"
                onClick={() => {
                  setEditId(null);
                  setFormData({ ...initialFormData, ...formData });
                }}
              >
                Cancelar Edición
              </button>
            )}
          </form>
        </div>
      ) : (
        <div className="gastos-submitted-message">
          <h2>¡Solicitud Enviada Exitosamente!</h2>
        </div>
      )}

      <button onClick={toggleHistorial} className="historial-flotante-button">
        📜
      </button>
      <button onClick={toggleDashboard} className="dashboard-flotante-button">
        📊
      </button>

      {/* Modal para Historial */}
      {modalHistorial && (
        <div className="modal-overlay-gastos" onClick={closeHistorialModal}>
          <div
            className="modal-content-gastos historial-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-gastos">
              <h2>Historial de Gastos</h2>
              <button
                className="modal-close-button"
                onClick={closeHistorialModal}
              >
                ×
              </button>
            </div>
            <div className="modal-body-gastos">
              <Historial
                mostrarHistorial={true}
                historialGastos={historialGastos}
                isLoadingHistorial={isLoadingHistorial}
                openModal={openModal}
                formatoCOP={formatoCOP}
                handleEditCotizacion={handleEditCotizacion}
                setEditId={setEditId}
                setFormData={setFormData}
                queryClient={queryClient}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal para Dashboard */}
      {modalDashboard && (
        <div className="modal-overlay-gastos" onClick={closeDashboardModal}>
          <div
            className="modal-content-gastos dashboard-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-gastos">
              <h2>Dashboard de Gastos</h2>
              <button
                className="modal-close-button"
                onClick={closeDashboardModal}
              >
                ×
              </button>
            </div>
            <div className="modal-body-gastos">
              <Dashboard
                mostrarDashboard={true}
                historialGastos={historialGastos}
                formatoCOP={formatoCOP}
                isLoadingHistorial={isLoadingHistorial}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal original para contenido */}
      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={closeModal}>
              ×
            </span>
            <p>{modalContent}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export { Gastos };
