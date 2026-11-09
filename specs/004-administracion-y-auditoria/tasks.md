# Tareas: Administración y auditoría

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C13 siguen el orden de criterios. Las dependencias son capacidades concretas, no aprobación/completitud de una spec entera.

- [ ] **004-T01. Crear y consultar cuentas de Abogado desde administración.**
  - **Valor/entrega:** formulario/listado/detalle Angular y contratos MS-01/GraphQL con nombre completo, correo único y contraseña; cuenta activa y rol fijo Abogado, hash y auditoría. Sin editar nombre/correo/rol, eliminar cuentas o mostrar datos jurídicos.
  - **Depende de:** [003-T01](../003-autenticacion-y-acceso/tasks.md), [003-T05](../003-autenticacion-y-acceso/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** Administrador crea y ve activa una cuenta que permite login; cuenta inexistente y rol incorrecto se rechazan. Respuesta limitada a datos de cuenta, sin contraseña/hash, expediente, chat o ERP.
  - **Cobertura:** C01, C07, C08, C09, C12.

- [ ] **004-T02. Controlar el acceso de las cuentas sin perder sus datos.**
  - **Valor/entrega:** suspender/reactivar/restablecer contraseña desde Angular y MS-01, con auditoría, confirmaciones pertinentes e invalidación de sesiones por suspensión usando repositorio de 003-T01. No cambiar datos del Abogado ni enviar contraseñas por correo.
  - **Depende de:** 004-T01 y [003-T01](../003-autenticacion-y-acceso/tasks.md).
  - **Integración:** no exige 003-T03 completa; la suspensión usa el repositorio de sesiones ya disponible y después permite verificar caducidad/revocación en 003.
  - **Evidencia/validación:** suspender bloquea login y sesiones, reactivar permite acceso con datos intactos; nueva contraseña tras restablecimiento funciona sin cambio obligatorio. Eventos no contienen secretos; auditoría caída informa cambio aplicado/parcial.
  - **Cobertura:** C02, C03, C07, C08, C11, C12.

- [ ] **004-T03. Publicar avisos y contacto de ayuda configurables de forma segura.**
  - **Valor/entrega:** editor administrativo de mensaje global y correo de soporte opcionales; proyección pública solo de esos valores en UI, validación y auditoría anterior/nuevo. Sin HTML, SMTP, claves arbitrarias o propagación de configuración de negocio.
  - **Depende de:** 004-T01 y [001-T01](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** cambiar valores se refleja en aviso/ayuda de la aplicación y registra anterior/nuevo; vacíos opcionales válidos, clave no permitida rechazada y fallo de auditoría explícito.
  - **Cobertura:** C04, C07, C12, C13.

- [ ] **004-T04. Consultar la trazabilidad de acceso, administración y agentes.**
  - **Valor/entrega:** listado Angular, filtros combinables tipo/período/usuario y paginación sobre DynamoDB; eventos de acceso, cuentas, parámetros y MS-04, sin edición/borrado ni TTL.
  - **Depende de:** 004-T01, [003-T05](../003-autenticacion-y-acceso/tasks.md) y cambios reales de agentes de [005-T02](../005-configuracion-de-agentes/tasks.md).
  - **Evidencia/validación:** filtros devuelven solo coincidencias, eventos de agente aparecen y no hay API para alterarlos; Abogado rechazado y ningún contenido privado en UI/logs. Si falló emitir un evento, no inventarlo en el listado.
  - **Cobertura:** C05, C06, C07, C09, C10, C12.

## Verificación de aceptación

- [ ] El desarrollador revisa los 13 criterios de la [spec](./spec.md), con auditoría disponible y fallida, y suspensión integrada con 003.
- [ ] Ejecutar validaciones del [plan](./plan.md) y registrar resultados junto a cada tarea, sin archivos nuevos de testing.
- [ ] Actualizar spec, plan e [índice](../index.md) si hay cambios; no marcar completa mientras falte integración con eventos de agentes.