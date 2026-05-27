# DocumentaciÃ³n Merkahorro

## Reglas de Negocio

1. **AprobaciÃ³n AutomÃ¡tica GestiÃ³n Humana**: Cuando el usuario Diana Valencia (gestionhumana@merkahorro.com) crea un gasto, este se aprueba automÃ¡ticamente sin enviar correos a un jefe directo y queda reflejado en el historial como aprobado por ella misma.

## Mejoras en la Interfaz (Frontend)

1. **Mensajes Dinámicos de Éxito**: El componente \Gastos.jsx\ ahora lee la propiedad \message\ que envía el backend al crear requerimientos. Esto permite que los usuarios con reglas de auto-aprobación (como Diana Valencia) vean un mensaje customizado confirmando la acción inmediatamente, en lugar del alerta genérica.
