# Tareas: Administración y auditoría

## Estado

En progreso. Spec y plan aprobados el 2026-11-08. T01–T03 implementadas y verificadas por capas; capacidades propias de T04 implementadas, con integración real de agentes pendiente de 005. No se acredita un recorrido autenticado completo navegador/GraphQL/REST en esta ejecución.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C13 siguen el orden de criterios. Las dependencias son capacidades concretas, no aprobación/completitud de una spec entera.

- [x] **004-T01. Crear y consultar cuentas de Abogado desde administración.**
  - **Valor/entrega:** formulario/listado/detalle Angular y contratos MS-01/GraphQL con nombre completo, correo único y contraseña; cuenta activa y rol fijo Abogado, hash y auditoría. Sin editar nombre/correo/rol, eliminar cuentas o mostrar datos jurídicos.
  - **Depende de:** [003-T01](../003-autenticacion-y-acceso/tasks.md), [003-T05](../003-autenticacion-y-acceso/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** Administrador crea y ve activa una cuenta que permite login; cuenta inexistente y rol incorrecto se rechazan. Respuesta limitada a datos de cuenta, sin contraseña/hash, expediente, chat o ERP.
  - **Cobertura:** C01, C07, C08, C09, C12.
  - **Resultado:** contratos SDL/OpenAPI, casos de uso, JDBC y Angular implementados. Con JDBC real se comprobó cuenta activa, rol fijo, normalización, BCrypt, login, detalle, correo duplicado, inexistencia y rechazo de Abogado. El DTO no incluye hash, rol ni contenido jurídico. Formularios y limpieza de contraseña comprobados en navegador con respuestas simuladas.

- [x] **004-T02. Controlar el acceso de las cuentas sin perder sus datos.**
  - **Valor/entrega:** suspender/reactivar/restablecer contraseña desde Angular y MS-01, con auditoría, confirmaciones pertinentes e invalidación de sesiones por suspensión usando repositorio de 003-T01. No cambiar datos del Abogado ni enviar contraseñas por correo.
  - **Depende de:** 004-T01 y [003-T01](../003-autenticacion-y-acceso/tasks.md).
  - **Integración:** no exige 003-T03 completa; la suspensión usa el repositorio de sesiones ya disponible y después permite verificar caducidad/revocación en 003.
  - **Evidencia/validación:** suspender bloquea login y sesiones, reactivar permite acceso con datos intactos; nueva contraseña tras restablecimiento funciona sin cambio obligatorio. Eventos no contienen secretos; auditoría caída informa cambio aplicado/parcial.
  - **Cobertura:** C02, C03, C07, C08, C11, C12.
  - **Resultado:** suspensión/reactivación y restablecimiento con confirmación implementados. JDBC real comprobó bloqueo de login y sesión persistida, reactivación con datos de cuenta intactos, aceptación de contraseña nueva y rechazo de anterior, sin cambio obligatorio. Suspensión y borrado de sesiones son una transacción; restablecer también invalida sesiones. Eventos sin contraseña/hash y resultado parcial de auditoría verificados por capas.

- [x] **004-T03. Publicar avisos y contacto de ayuda configurables de forma segura.**
  - **Valor/entrega:** editor administrativo de mensaje global y correo de soporte opcionales; proyección pública solo de esos valores en UI, validación y auditoría anterior/nuevo. Sin HTML, SMTP, claves arbitrarias o propagación de configuración de negocio.
  - **Depende de:** 004-T01 y [001-T01](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** cambiar valores se refleja en aviso/ayuda de la aplicación y registra anterior/nuevo; vacíos opcionales válidos, clave no permitida rechazada y fallo de auditoría explícito.
  - **Cobertura:** C04, C07, C12, C13.
  - **Resultado:** V3, edición Angular y proyección pública GraphQL/Shell implementadas. JDBC/DynamoDB reales comprobaron anterior/nuevo exactos, vacíos opcionales, rechazo de clave arbitraria, HTML y correo inválido/control. El Shell presenta texto y enlace de contacto, actualiza entre pestañas y no muestra banda vacía. Publicación y aviso parcial comprobados en navegador con respuestas simuladas.

- [ ] **004-T04. Consultar la trazabilidad de acceso, administración y agentes.**
  - **Valor/entrega:** listado Angular, filtros combinables tipo/período/usuario y paginación sobre DynamoDB; eventos de acceso, cuentas, parámetros y MS-04, sin edición/borrado ni TTL.
  - **Depende de:** 004-T01, [003-T05](../003-autenticacion-y-acceso/tasks.md) y cambios reales de agentes de [005-T02](../005-configuracion-de-agentes/tasks.md).
  - **Evidencia/validación:** filtros devuelven solo coincidencias, eventos de agente aparecen y no hay API para alterarlos; Abogado rechazado y ningún contenido privado en UI/logs. Si falló emitir un evento, no inventarlo en el listado.
  - **Cobertura:** C05, C06, C07, C09, C10, C12.
  - [x] Implementados listado Angular, filtros combinables, fechas con zona y paginación acotada sobre los tres índices DynamoDB.
  - [x] Comprobados con DynamoDB real los límites de período, páginas completas sin duplicados, cursor ligado a filtros y ausencia del evento cuyo registro falló. Sin API de editar/borrar ni TTL añadido.
  - [x] Implementada recepción REST de eventos de agentes con credencial exclusiva de MS-04, autor verificado y reconocimiento de reenvío. Verificados casos de uso y almacenamiento con eventos controlados, no con una acción real de 005.
  - [ ] Configurar la credencial del emisor e integrar/verificar una modificación real de agentes en 005, con su aviso parcial y reenvío sin duplicados. No se implementó 005 para simular esta dependencia.
  - **Avance desde 005:** emisor síncrono implementado y verificado contra receptor HTTP controlado, con identidad firmada, ID/fecha estables y aviso parcial. Falta configurar `MS04_AUDIT_API_TOKEN` y comprobar una acción administrativa real de extremo a extremo con este receptor desplegado; esta dependencia no se cierra con la simulación.

## Verificación de aceptación

- [x] El desarrollador revisa los 13 criterios de la [spec](./spec.md), con auditoría disponible y fallida, y suspensión integrada con 003. C06 pendiente de 005; el resto tiene evidencia por capas, no aceptación autenticada completa del despliegue.
- [ ] Ejecutar validaciones del [plan](./plan.md) y registrar resultados junto a cada tarea, sin archivos nuevos de testing.
- [x] Actualizar spec, plan e [índice](../index.md) si hay cambios; no marcar completa mientras falte integración con eventos de agentes.

## Registro de verificación

- **Compilaciones y contratos:** imágenes MS-01 (JDK 25), Gateway, Angular y Shell construidas. Typechecks de los tres proyectos TypeScript modificados en Node 26 satisfactorios. SDL compilable y OpenAPI validado con referencias comunes. Compose válido; DTO REST rechaza propiedades no permitidas.
- **79 comprobaciones de aplicación/persistencia:** creación, permisos por rol, inexistencia, duplicado, BCrypt, sesiones, suspensión/reactivación, restablecimiento, parámetros, auditoría con anterior/nuevo, privacidad, tres índices, filtros y paginación. PostgreSQL externo real en transacción revertida; tabla DynamoDB temporal eliminada al finalizar. Se comprobó que no quedaron cuentas ni parámetros de prueba.
- **Auditoría fallida:** cliente real a un endpoint no disponible; la operación devolvió `applied=true`, `auditRecorded=false`, `PARTIAL_FAILURE`. El cambio siguió visible dentro de la transacción de prueba y su evento no apareció en el listado. Pendiente probar el commit y la interrupción desde un recorrido autenticado completo del despliegue.
- **HTTP y fachada:** 13 comprobaciones: 8 con Shell/Gateway/MS-01 levantados (proyección pública, cuatro operaciones sin sesión, REST sin token, REST sin contexto y token Gateway rechazado como emisor MS-04); 5 del resolver con propietario simulado (no reenviar anónimo/Abogado, denegación, identidad firmada, parcial y exclusión de campos privados). Comprobación adicional del DTO cerrado satisfactoria.
- **Navegador:** acceso anónimo real sin montar microfrontends privados. Con respuestas simuladas: creación, suspensión/reactivación, restablecimiento y limpieza de contraseñas; parámetros y contacto; filtros/visualización de auditoría; parcial, red interrumpida y parcial conservado al fallar el refresco. Capturas 1366 x 900 y 390 x 844 sin solapamientos ni desbordamiento de página. Simulación retirada al terminar.
- **Estado de servicios:** MS-01, MS-02, MS-03 y MS-04 responden HTTP 200 y `UP`. V3 aplicada expresamente sin demo. No se añadieron contenedores PostgreSQL/MongoDB ni archivos nuevos de testing al repositorio.
- **Pendientes para aceptación final:** login administrativo autorizado y recorrido completo navegador/GraphQL/REST con auditoría caída después de commit; acción real y emisor de 005. Los criterios de aceptación de la spec permanecen abiertos hasta esa verificación; no se declara producción ni completitud de 004.