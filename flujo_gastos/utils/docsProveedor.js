// Configuración única de los documentos de nuevos proveedores.
// Se usa tanto en el formulario (Gastos.jsx) como en las vistas que muestran
// los archivos ya cargados (Historial, AprobarRechazar, etc.).
//
// El backend guarda solo un array de URLs sin etiqueta, por eso el nombre del
// archivo se sube con el `prefijo` antepuesto (ej: "RUT_documento.pdf"). Eso
// permite reconstruir aquí qué documento es cada URL.
export const documentosProveedorConfig = [
  { key: "rut", label: "RUT", prefijo: "RUT", icono: "📄" },
  {
    key: "camara_comercio",
    label: "Cámara de comercio",
    prefijo: "CamaraComercio",
    icono: "🏛️",
  },
  {
    key: "cedula_representante",
    label: "Cédula del representante legal",
    prefijo: "CedulaRepresentante",
    icono: "🪪",
  },
  {
    key: "certificacion_bancaria",
    label: "Certificación bancaria",
    prefijo: "CertificacionBancaria",
    icono: "🏦",
  },
  {
    key: "certificados_referencias",
    label: "Certificados referencias",
    prefijo: "CertificadosReferencias",
    icono: "✅",
  },
];

// Dado el URL (o nombre) de un archivo de proveedor, devuelve el documento
// correspondiente según el prefijo. Si no reconoce ninguno (archivos viejos
// subidos antes de este cambio), devuelve una etiqueta genérica.
//
// El backend sube el archivo como ".../proveedores/{timestamp}_{Prefijo}_{nombre}".
// El prefijo SIEMPRE va al inicio del nombre (tras el timestamp), por eso se
// ancla ahí con startsWith en vez de buscar en cualquier parte del string
// (evita falsos positivos si el nombre original contiene un prefijo conocido).
export const getDocProveedorInfo = (url, index = 0) => {
  if (typeof url === "string") {
    const fileName = decodeURIComponent(url.split("/").pop() || "");
    const sinTimestamp = fileName.replace(/^\d+_/, ""); // quita "1716000000000_"
    const match = documentosProveedorConfig.find((doc) =>
      sinTimestamp.startsWith(`${doc.prefijo}_`)
    );
    if (match) {
      return { label: match.label, icono: match.icono };
    }
  }
  return { label: `Documento ${index + 1}`, icono: "📎" };
};
